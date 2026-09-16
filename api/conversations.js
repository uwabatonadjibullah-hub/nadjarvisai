/**
 * api/conversations.js
 * Consolidated Conversations Handler for NAD JARVIS
 * 
 * Supports:
 * - GET    /api/conversations           -> lists conversations sorted newest first
 * - GET    /api/conversations?id=<id>   -> retrieves message history for a conversation
 * - POST   /api/conversations           -> creates a new conversation with custom title
 * - DELETE /api/conversations?id=<id>   -> deletes a conversation (cascade deletes messages)
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const client = auth.client;
  const conversationId = req.query.id || (req.body && req.body.id);

  try {
    // ─── GET /api/conversations ───────────────────────────────────────────────
    if (req.method === 'GET') {
      if (conversationId) {
        // Retrieve messages for specified conversation
        const { data: messages, error: msgErr } = await client
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgErr) {
          return res.status(500).json({ error: msgErr.message });
        }

        return res.status(200).json({ status: 'success', messages: messages || [] });
      }

      // List all conversations sorted newest first
      const { data: conversations, error: convErr } = await client
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (convErr) {
        return res.status(500).json({ error: convErr.message });
      }

      return res.status(200).json({ status: 'success', conversations: conversations || [] });
    }

    // ─── POST /api/conversations (Create new conversation) ────────────────────
    if (req.method === 'POST') {
      const { title = 'New Conversation' } = req.body || {};
      const { data: conversation, error: createErr } = await client
        .from('conversations')
        .insert({
          user_id: auth.user.id,
          title: title.trim() || 'New Conversation'
        })
        .select('*')
        .single();

      if (createErr) {
        return res.status(500).json({ error: createErr.message });
      }

      await logAuditEvent({
        userId: auth.user.id,
        action: 'conversation.created',
        resource: 'conversations',
        details: { conversationId: conversation.id, title },
        req
      });

      return res.status(201).json({ status: 'success', conversation });
    }

    // ─── DELETE /api/conversations?id=<id> (Delete conversation) ──────────────
    if (req.method === 'DELETE') {
      if (!conversationId) {
        return res.status(400).json({ error: 'Missing conversation id parameter.' });
      }

      const { error: delErr } = await client
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', auth.user.id);

      if (delErr) {
        return res.status(500).json({ error: delErr.message });
      }

      await logAuditEvent({
        userId: auth.user.id,
        action: 'conversation.deleted',
        resource: 'conversations',
        details: { conversationId },
        req
      });

      return res.status(200).json({ status: 'success', message: 'Conversation deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (err) {
    console.error('[Conversations Error]:', err);
    return res.status(500).json({ error: err.message || 'Conversation operation failed' });
  }
};
