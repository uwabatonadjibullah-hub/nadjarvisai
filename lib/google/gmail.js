/**
 * lib/google/gmail.js
 * Internal Gmail operations module for NAD JARVIS
 * Conforms to Section 2.4
 *
 * All Gmail logic lives here; api/google/workspace.js dispatches to this module.
 */

const { logAuditEvent } = require('../audit');

/**
 * Read a specific Gmail message by ID.
 * Preserves original route: POST /api/google/gmail/read
 */
async function readGmailMessage({ auth, body, req }) {
  const { messageId } = body || {};
  if (!messageId) {
    const err = new Error('Missing messageId parameter.'); err.statusCode = 400; throw err;
  }

  await logAuditEvent({ userId: auth.user.id, action: 'gmail.read', resource: 'gmail', details: { messageId }, req });

  return { status: 'success', messageId, content: 'Gmail read integration prepared.' };
}

/**
 * Search Gmail messages for owner (read-only roadmap stage).
 * Preserves original route: POST /api/google/gmail/search
 */
async function searchGmail({ auth, body, req }) {
  const { query = '' } = body || {};

  await logAuditEvent({ userId: auth.user.id, action: 'gmail.search', resource: 'gmail', details: { query }, req });

  return { status: 'success', roadmapStage: 'read_only_prepared', query, messages: [] };
}

module.exports = { readGmailMessage, searchGmail };
