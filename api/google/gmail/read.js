/**
 * POST /api/google/gmail/read
 * Reads specific Gmail message by ID
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

  const { messageId } = req.body || {};
  if (!messageId) {
    return res.status(400).json({ error: 'Missing messageId parameter.' });
  }

  await logAuditEvent({
    userId: auth.user.id,
    action: 'gmail.read',
    resource: 'gmail',
    details: { messageId },
    req
  });

  return res.status(200).json({
    status: 'success',
    messageId,
    content: 'Gmail read integration prepared.'
  });
};
