/**
 * POST /api/chat
 * Primary Chat Endpoint for NAD JARVIS
 * Conforms to Sections 2.1, 2.2, 2.4, 3, 4:
 * - Session verification
 * - Context grounding from knowledge engine
 * - AI router orchestration (NVIDIA NIM / DeepSeek)
 * - Persists conversation and message history to Supabase
 * - Logs audit event
 */

const { verifyOwnerSession } = require('../lib/auth');
const { routeAndExecute } = require('../lib/router');
const { generateSystemPrompt } = require('../lib/knowledge');
const { logAuditEvent } = require('../lib/audit');
const { checkRateLimit } = require('../lib/rateLimit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate Limiting (Section 6)
  if (!checkRateLimit(req, res, { maxRequests: 30, windowMs: 60000 })) {
    return;
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const { message, conversationId = null, stream = false } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Empty or invalid message.' });
  }

  try {
    const userId = auth.user.id;
    const client = auth.client;

    // 1. Resolve or Create Conversation
    let activeConvId = conversationId;
    if (!activeConvId) {
      const titleSnippet = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      const { data: newConv, error: convErr } = await client
        .from('conversations')
        .insert({ user_id: userId, title: titleSnippet })
        .select('id')
        .single();

      if (!convErr && newConv) {
        activeConvId = newConv.id;
      }
    }

    // 2. Persist User Message
    if (activeConvId) {
      await client.from('messages').insert({
        conversation_id: activeConvId,
        user_id: userId,
        role: 'user',
        content: message.trim()
      });
    }

    // 3. Fetch Recent Conversation History for Context
    let historyMessages = [];
    if (activeConvId) {
      const { data: pastMsgs } = await client
        .from('messages')
        .select('role, content')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (pastMsgs && pastMsgs.length > 0) {
        historyMessages = pastMsgs.map(m => ({ role: m.role, content: m.content }));
      }
    }

    // 4. Construct System Prompt with Knowledge Engine context
    const systemPrompt = generateSystemPrompt();
    const modelMessages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages.filter(m => m.role !== 'system')
    ];

    if (historyMessages.length === 0 || historyMessages[historyMessages.length - 1].content !== message.trim()) {
      modelMessages.push({ role: 'user', content: message.trim() });
    }

    // 5. Execute via AI Router
    const aiResult = await routeAndExecute({
      userId,
      messages: modelMessages
    });

    // 6. Persist Assistant Response
    if (activeConvId && aiResult.content) {
      await client.from('messages').insert({
        conversation_id: activeConvId,
        user_id: userId,
        role: 'assistant',
        content: aiResult.content,
        provider: aiResult.provider,
        model: aiResult.model,
        metadata: {
          latencyMs: aiResult.latencyMs,
          usage: aiResult.usage,
          taskType: aiResult.taskType,
          isFallback: aiResult.isFallback || false
        }
      });
    }

    // 7. Security Audit
    await logAuditEvent({
      userId,
      action: 'chat.message',
      resource: 'conversations',
      details: {
        conversationId: activeConvId,
        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs
      },
      req
    });

    return res.status(200).json({
      status: 'success',
      reply: aiResult.content,
      conversationId: activeConvId,
      provider: aiResult.provider,
      model: aiResult.model,
      taskType: aiResult.taskType,
      latencyMs: aiResult.latencyMs,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Chat Handler Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal error in chat pipeline' });
  }
};
