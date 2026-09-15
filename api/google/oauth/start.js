/**
 * POST /api/google/oauth/start
 * Generates the Google OAuth 2.0 consent URL for Nad's account
 * Conforms to Section 2.4 & Section 6: Client secret never exposed to frontend
 */

const { verifyOwnerSession } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured in server environment.' });
  }

  // Derive redirect URI dynamically or fallback to config
  const host = req.headers['host'] || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/google/oauth/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', auth.user.id);

  return res.status(200).json({
    status: 'success',
    authUrl: authUrl.toString(),
    redirectUri
  });
};
