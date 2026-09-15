/**
 * POST /api/google/gmail/search
 * Searches Gmail messages for owner (read-only roadmap stage)
 * Conforms to Section 2.4
 */

const { verifyOwnerSession } = require('../../../lib/auth');
const { logAuditEvent } = require('../../../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const { query = '' } = req.body || {};

  await logAuditEvent({
    userId: auth.user.id,
    action: 'gmail.search',
    resource: 'gmail',
    details: { query },
    req
  });

  return res.status(200).json({
    status: 'success',
    roadmapStage: 'read_only_prepared',
    query,
    messages: []
  });
};
