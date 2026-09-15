/**
 * GET /api/conversations
 * Lists past conversations for the owner
 * GET /api/conversations?id=<uuid>
 * Retrieves messages for a specific conversation
 */

const { verifyOwnerSession } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const client = auth.client;
  const conversationId = req.query.id;

  try {
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

    // List all conversations
    const { data: conversations, error: convErr } = await client
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (convErr) {
      return res.status(500).json({ error: convErr.message });
    }

    return res.status(200).json({ status: 'success', conversations: conversations || [] });

  } catch (err) {
    console.error('[Conversations Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
};
