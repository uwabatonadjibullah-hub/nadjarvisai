/**
 * api/tasks.js
 * Tasks Handler for NAD JARVIS
 *
 * Identical functionality to original api/tasks/index.js.
 * Moved to top-level api/ directory so it counts as ONE serverless function
 * instead of a nested directory function.
 *
 * Routes (unchanged):
 *   GET  /api/tasks        -> list recent tasks
 *   GET  /api/tasks?id=    -> poll specific task
 *   POST /api/tasks        -> enqueue a new task
 *
 * Conforms to Section 5
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const client = auth.client;
  const userId = auth.user.id;

  // GET: Poll specific task or list recent tasks
  if (req.method === 'GET') {
    const taskId = req.query.id;
    try {
      if (taskId) {
        const { data: task, error } = await client
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (error) return res.status(404).json({ error: 'Task not found' });
        return res.status(200).json({ status: 'success', task });
      }

      const { data: tasks, error } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ status: 'success', tasks: tasks || [] });

    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
  }

  // POST: Enqueue new task
  if (req.method === 'POST') {
    const { taskType, payload = {} } = req.body || {};
    if (!taskType) {
      return res.status(400).json({ error: 'Missing taskType.' });
    }

    try {
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

      return res.status(200).json({ status: 'success', task });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to enqueue task' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
