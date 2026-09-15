/**
 * api/google/oauth.js
 * Consolidated Google OAuth Handler for NAD JARVIS
 *
 * Merges the following original endpoints (no functionality removed):
 *   POST|GET /api/google/oauth/start    -> builds consent URL
 *   GET      /api/google/oauth/callback -> exchanges auth code, stores tokens
 *
 * Routing:
 *   POST|GET /api/google/oauth?action=start    -> OAuth consent URL
 *   GET      /api/google/oauth?action=callback -> token exchange (redirect target)
 *   GET      /api/google/oauth/callback        -> also handled via vercel.json rewrite
 *
 * Conforms to Section 2.4 & Section 6:
 * GOOGLE_CLIENT_SECRET is NEVER returned to the client.
 * All token exchange is server-side only.
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { buildOAuthStartResponse, handleOAuthCallback } = require('../../lib/google/oauth');

module.exports = async function handler(req, res) {
  const action = req.query.action || (req.query.code ? 'callback' : 'start');

  // ─── GET /api/google/oauth?action=callback  (or ?code=...) ─────────────────
  // This is the redirect target from Google. No session token required (Google sends code).
  if (action === 'callback') {
    try {
      const html = await handleOAuthCallback({ req });
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (err) {
      console.error('[OAuth Callback Error]:', err);
      if (err.isHtml) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(err.statusCode || 500).send(`OAuth Error: ${err.message}`);
      }
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  // ─── POST|GET /api/google/oauth?action=start  ───────────────────────────────
  if (action === 'start') {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const auth = await verifyOwnerSession(req, res);
    if (!auth) return;

    try {
      const result = buildOAuthStartResponse({ auth, req });
      return res.status(200).json(result);
    } catch (err) {
      console.error('[OAuth Start Error]:', err);
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown OAuth action. Use action=start or action=callback.' });
};
