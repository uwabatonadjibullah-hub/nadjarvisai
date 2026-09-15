/**
 * POST /api/memory (Create/Update with owner approval)
 * GET /api/memory (List approved memories)
 * Conforms to Section 2.4 & Section 5:
 * Memory items are only written/activated with an explicit owner-approved step.
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const userId = auth.user.id;
  const client = auth.client;

  // GET: List approved memories
  if (req.method === 'GET') {
    try {
      const { data, error } = await client
        .from('memory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ status: 'success', memoryItems: data || [] });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch memory items' });
    }
  }

  // POST: Create or approve memory
  if (req.method === 'POST') {
    const { category = 'general', key, value, confirmedByOwner = false, id = null } = req.body || {};

    if (!key || !value) {
      return res.status(400).json({ error: 'Missing memory key or value.' });
    }

    // Section 5: Owner confirmation is strictly required to store durable memory
    if (!confirmedByOwner) {
      return res.status(403).json({
        status: 'pending_confirmation',
        message: 'Owner approval required before saving to persistent memory.',
        proposedMemory: { category, key, value }
      });
    }

    try {
      let memoryRecord;

      if (id) {
        // Update existing
        const { data, error } = await client
          .from('memory_items')
          .update({
            category,
            key,
            value,
            is_approved: true,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        memoryRecord = data;
      } else {
        // Create new approved
        const { data, error } = await client
          .from('memory_items')
          .insert({
            user_id: userId,
            category,
            key,
            value,
            is_approved: true,
            approved_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        memoryRecord = data;
      }

      await logAuditEvent({
        userId,
        action: 'memory.create_or_update',
        resource: 'memory_items',
        details: { memoryId: memoryRecord.id, key, category },
        req
      });

      return res.status(200).json({
        status: 'success',
        memoryItem: memoryRecord
      });

    } catch (err) {
      console.error('[Memory Save Error]:', err);
      return res.status(500).json({ error: 'Failed to persist memory' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
