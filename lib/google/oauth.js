/**
 * lib/google/oauth.js
 * Internal Google OAuth module for NAD JARVIS
 * Conforms to Section 2.4 & Section 6:
 * Client secrets NEVER exposed to frontend code.
 * All token exchange happens strictly server-side.
 */

const { getSupabaseAdmin } = require('../supabase');
const { logAuditEvent } = require('../audit');

/**
 * Generates the Google OAuth 2.0 consent URL.
 * Preserves original route: POST|GET /api/google/oauth/start
 */
function buildOAuthStartResponse({ auth, req }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const err = new Error('GOOGLE_CLIENT_ID is not configured in server environment.');
    err.statusCode = 500;
    throw err;
  }

  const host = req.headers['host'] || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/google/oauth/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
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

  return { status: 'success', authUrl: authUrl.toString(), redirectUri };
}

/**
 * Exchanges Google OAuth authorization code for tokens and stores them server-side.
 * Preserves original route: GET /api/google/oauth/callback
 * Returns an HTML page (redirect target from Google).
 */
async function handleOAuthCallback({ req }) {
  const code = req.query.code;
  const stateUserId = req.query.state;

  if (!code) {
    const err = new Error('OAuth Error: Missing authorization code.');
    err.statusCode = 400;
    err.isHtml = true;
    throw err;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const host = req.headers['host'] || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/google/oauth/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    console.error('[Google OAuth Token Error]:', tokenData);
    const err = new Error(`Google OAuth Failed: ${tokenData.error_description || tokenData.error}`);
    err.statusCode = 500;
    err.isHtml = true;
    throw err;
  }

  const admin = getSupabaseAdmin();
  const targetUserId = stateUserId || process.env.OWNER_USER_ID;

  // Save tokens strictly server-side in `connections` table
  await admin.from('connections').upsert({
    user_id: targetUserId,
    provider: 'google',
    account_identifier: process.env.OWNER_EMAIL || 'uwabatonadjibullah@gmail.com',
    status: 'connected',
    encrypted_refresh_token: tokenData.refresh_token || null,
    scopes: (tokenData.scope || '').split(' '),
    metadata: { token_type: tokenData.token_type, expires_in: tokenData.expires_in, connected_at: new Date().toISOString() },
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,provider' });

  // Seed default drive source nickname
  await admin.from('drive_sources').upsert({
    user_id: targetUserId,
    nickname: "Nad's Google Drive",
    folder_id: 'root',
    scope_granted: 'drive.readonly'
  }, { onConflict: 'user_id,nickname' });

  await logAuditEvent({ userId: targetUserId, action: 'google.oauth.connected', resource: 'connections', details: { provider: 'google', scopes: tokenData.scope }, req });

  // Return friendly HTML success page
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>NAD JARVIS — Google Account Connected</title>
        <style>
          body { background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); padding: 40px; border-radius: 20px; text-align: center; max-width: 450px; }
          h2 { color: #d4af37; margin-bottom: 12px; }
          p { opacity: 0.8; line-height: 1.6; }
          a { color: #fff; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Authentication Successful</h2>
          <p>Google Workspace credentials safely stored on server for <strong>${process.env.OWNER_EMAIL || 'Nad'}</strong>.</p>
          <p><a href="/">Return to NAD JARVIS</a></p>
        </div>
      </body>
    </html>
  `;
}

module.exports = { buildOAuthStartResponse, handleOAuthCallback };
