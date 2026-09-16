/**
 * api/tasks.js
 * Consolidated Tasks & Todo Handler for NAD JARVIS
 *
 * Cleanly separates:
 * 1. User-Facing Todo Checklist Items (public.todo_items)
 * 2. Background Asynchronous AI / Worker Queue Tasks (public.tasks)
 *
 * Routes:
 * - GET    /api/tasks              -> Lists user todos (or worker tasks if type=worker)
 * - POST   /api/tasks              -> Creates a todo item OR enqueues a background task
 * - PATCH  /api/tasks              -> Updates a todo item (toggle completion, priority, due date)
 * - DELETE /api/tasks?id=<id>      -> Deletes a todo item
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const client = auth.client;
  const userId = auth.user.id;
  const isWorkerType = req.query.type === 'worker' || (req.body && req.body.taskType);

  try {
    // ─── GET /api/tasks ───────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const taskId = req.query.id;

      // Check if querying specific background task
      if (taskId && isWorkerType) {
        const { data: task, error } = await client
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !task) return res.status(404).json({ error: 'Worker task not found' });
        return res.status(200).json({ status: 'success', task });
      }

      // Query specific todo item
      if (taskId && !isWorkerType) {
        const { data: todo, error } = await client
          .from('todo_items')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !todo) return res.status(404).json({ error: 'Todo item not found' });
        return res.status(200).json({ status: 'success', todo });
      }

      // Query list of background tasks if explicitly requested
      if (isWorkerType) {
        const { data: tasks, error } = await client
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ status: 'success', tasks: tasks || [] });
      }

      // Default: List user-facing Todo Checklist items
      const { data: todos, error } = await client
        .from('todo_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ status: 'success', tasks: todos || [] });
    }

    // ─── POST /api/tasks ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      // 1. If payload defines taskType -> Enqueue Background AI Task
      if (req.body && req.body.taskType) {
        const { taskType, payload = {} } = req.body;
        const { data: task, error } = await client
          .from('tasks')
          .insert({ user_id: userId, task_type: taskType, payload, status: 'queued' })
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });

        await logAuditEvent({
          userId,
          action: 'task.enqueued',
          resource: 'tasks',
          details: { taskId: task.id, taskType },
          req
        });

        return res.status(201).json({ status: 'success', task });
      }

      // 2. Otherwise -> Create User-Facing Todo Item
      const { title, priority = 'medium', due_date = null, dueDate = null } = req.body || {};
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Missing task title.' });
      }

      const cleanDueDate = due_date || dueDate || null;
      const cleanPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';

      const { data: newTodo, error: todoErr } = await client
        .from('todo_items')
        .insert({
          user_id: userId,
          title: title.trim(),
          priority: cleanPriority,
          due_date: cleanDueDate,
          is_completed: false
        })
        .select('*')
        .single();

      if (todoErr) {
        return res.status(500).json({ error: todoErr.message });
      }

      await logAuditEvent({
        userId,
        action: 'todo.created',
        resource: 'todo_items',
        details: { todoId: newTodo.id, title },
        req
      });

      return res.status(201).json({ status: 'success', task: newTodo });
    }

    // ─── PATCH / PUT /api/tasks (Update Todo Item) ─────────────────────────────
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id, is_completed, isCompleted, title, priority, due_date, dueDate } = req.body || {};
      const targetId = id || req.query.id;

      if (!targetId) {
        return res.status(400).json({ error: 'Missing task id for update.' });
      }

      const updates = { updated_at: new Date().toISOString() };
      if (is_completed !== undefined) updates.is_completed = Boolean(is_completed);
      if (isCompleted !== undefined) updates.is_completed = Boolean(isCompleted);
      if (title !== undefined) updates.title = title.trim();
      if (priority !== undefined) updates.priority = priority;
      if (due_date !== undefined) updates.due_date = due_date;
      if (dueDate !== undefined) updates.due_date = dueDate;

      const { data: updatedTodo, error: updateErr } = await client
        .from('todo_items')
        .update(updates)
        .eq('id', targetId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      await logAuditEvent({
        userId,
        action: 'todo.updated',
        resource: 'todo_items',
        details: { todoId: targetId, updates },
        req
      });

      return res.status(200).json({ status: 'success', task: updatedTodo });
    }

    // ─── DELETE /api/tasks?id=<id> (Delete Todo Item) ─────────────────────────
    if (req.method === 'DELETE') {
      const taskId = req.query.id || (req.body && req.body.id);
      if (!taskId) {
        return res.status(400).json({ error: 'Missing task id for deletion.' });
      }

      const { error: delErr } = await client
        .from('todo_items')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (delErr) {
        return res.status(500).json({ error: delErr.message });
      }

      await logAuditEvent({
        userId,
        action: 'todo.deleted',
        resource: 'todo_items',
        details: { todoId: taskId },
        req
      });

      return res.status(200).json({ status: 'success', message: 'Task deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (err) {
    console.error('[Tasks Error]:', err);
    return res.status(500).json({ error: err.message || 'Tasks handler error' });
  }
};
