/**
 * api/google/workspace.js
 * Consolidated Google Workspace Handler for NAD JARVIS
 *
 * Merges the following original endpoints (no functionality removed):
 *   POST /api/google/drive/list       -> action=drive.list
 *   POST /api/google/drive/read       -> action=drive.read
 *   POST /api/google/drive/upload     -> action=drive.upload
 *   POST|GET /api/google/calendar/list  -> action=calendar.list
 *   POST /api/google/calendar/create  -> action=calendar.create
 *   POST /api/google/gmail/read       -> action=gmail.read
 *   POST /api/google/gmail/search     -> action=gmail.search
 *
 * Dispatch by: ?action=<service>.<operation>
 *
 * Internal provider-specific logic lives in:
 *   lib/google/drive.js
 *   lib/google/calendar.js
 *   lib/google/gmail.js
 *
 * Conforms to Section 2.4 & Section 6:
 * No secret keys are exposed to frontend code.
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { checkRateLimit } = require('../../lib/rateLimit');
const { listDriveFiles, readDriveFile, uploadToDrive } = require('../../lib/google/drive');
const { listCalendarEvents, createCalendarEvent } = require('../../lib/google/calendar');
const { readGmailMessage, searchGmail } = require('../../lib/google/gmail');

module.exports = async function handler(req, res) {
  // Rate limit all workspace operations
  if (!checkRateLimit(req, res, { maxRequests: 60, windowMs: 60000 })) {
    return;
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const action = req.query.action;
  const body = req.body || {};

  if (!action) {
    return res.status(400).json({
      error: 'Missing ?action parameter.',
      availableActions: [
        'drive.list', 'drive.read', 'drive.upload',
        'calendar.list', 'calendar.create',
        'gmail.read', 'gmail.search'
      ]
    });
  }

  try {
    let result;

    switch (action) {
      // ── Drive ────────────────────────────────────────────────────────────────
      case 'drive.list':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await listDriveFiles({ auth, body, req });
        break;

      case 'drive.read':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await readDriveFile({ auth, body, req });
        break;

      case 'drive.upload':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await uploadToDrive({ auth, body, req });
        if (result._confirmationRequired) {
          delete result._confirmationRequired;
          return res.status(403).json(result);
        }
        break;

      // ── Calendar ─────────────────────────────────────────────────────────────
      case 'calendar.list':
        if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await listCalendarEvents({ auth, req });
        break;

      case 'calendar.create':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await createCalendarEvent({ auth, body, req });
        if (result._confirmationRequired) {
          delete result._confirmationRequired;
          return res.status(403).json(result);
        }
        break;

      // ── Gmail ─────────────────────────────────────────────────────────────────
      case 'gmail.read':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await readGmailMessage({ auth, body, req });
        break;

      case 'gmail.search':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        result = await searchGmail({ auth, body, req });
        break;

      default:
        return res.status(400).json({
          error: `Unknown action "${action}".`,
          availableActions: [
            'drive.list', 'drive.read', 'drive.upload',
            'calendar.list', 'calendar.create',
            'gmail.read', 'gmail.search'
          ]
        });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error(`[Workspace Handler Error] action=${action}:`, err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Internal workspace error' });
  }
};
