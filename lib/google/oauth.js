/**
 * lib/google/oauth.js
 * Internal Google OAuth module for NAD JARVIS
 * Conforms to Section 2.4 & Section 6:
 * - Supports ONE owner connecting MULTIPLE Google Accounts (personal, work, school).
 * - Google refresh tokens are strongly encrypted server-side via AES-256-GCM.
 * - Client secrets & refresh tokens are NEVER exposed to frontend code.
 * - All token exchanges occur strictly server-side.
 */

const { getSupabaseAdmin } = require('../supabase');
const { logAuditEvent } = require('../audit');
const { encryptToken } = require('../crypto');

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

  const nickname = (req.query && req.query.nickname) || (req.body && req.body.nickname) || '';

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ');

  // State encodes owner user_id and optional nickname
  const statePayload = Buffer.from(JSON.stringify({
    userId: auth.user.id,
    nickname: nickname.trim()
  })).toString('base64');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', statePayload);

  return { status: 'success', authUrl: authUrl.toString(), redirectUri };
}

/**
 * Exchanges Google OAuth authorization code for tokens and stores them server-side.
 * Preserves original route: GET /api/google/oauth/callback
 * Returns an HTML page (redirect target from Google).
 */
async function handleOAuthCallback({ req }) {
  const code = req.query.code;
  const rawState = req.query.state;

  if (!code) {
    const err = new Error('OAuth Error: Missing authorization code.');
    err.statusCode = 400;
    err.isHtml = true;
    throw err;
  }

  let targetUserId = process.env.OWNER_USER_ID;
  let customNickname = '';

  if (rawState) {
    try {
      // Decode JSON state if base64 encoded
      const decoded = JSON.parse(Buffer.from(rawState, 'base64').toString('utf8'));
      if (decoded.userId) targetUserId = decoded.userId;
      if (decoded.nickname) customNickname = decoded.nickname;
    } catch (e) {
      // Legacy plain user ID state string
      targetUserId = rawState;
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const host = req.headers['host'] || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/google/oauth/callback`;

  // 1. Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    console.error('[Google OAuth Token Error]:', tokenData);
    const err = new Error(`Google OAuth Failed: ${tokenData.error_description || tokenData.error}`);
    err.statusCode = 500;
    err.isHtml = true;
    throw err;
  }

  // 2. Fetch Google Profile / Email of the specific Google account
  let googleEmail = process.env.OWNER_EMAIL || 'uwabatonadjibullah@gmail.com';
  let googleName = '';

  if (tokenData.access_token) {
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json();
        if (userinfo.email) googleEmail = userinfo.email.toLowerCase();
        if (userinfo.name) googleName = userinfo.name;
      }
    } catch (e) {
      console.warn('[Google OAuth] Could not fetch userinfo, falling back to default identifier:', e.message);
    }
  }

  const admin = getSupabaseAdmin();

  // 3. Encrypt Refresh Token before saving to database
  let encryptedRefreshToken = null;
  if (tokenData.refresh_token) {
    encryptedRefreshToken = encryptToken(tokenData.refresh_token);
  } else {
    // If Google did not return a new refresh token (already authorized), retain existing one
    const { data: existingConn } = await admin
      .from('connections')
      .select('encrypted_refresh_token')
      .eq('user_id', targetUserId)
      .eq('provider', 'google')
      .eq('account_identifier', googleEmail)
      .maybeSingle();

    if (existingConn && existingConn.encrypted_refresh_token) {
      encryptedRefreshToken = existingConn.encrypted_refresh_token;
    }
  }

  // 4. Determine display nickname
  const finalNickname = customNickname || 
    (googleEmail.includes('work') ? 'Work Google' : 
    (googleEmail.includes('school') || googleEmail.includes('.ac') || googleEmail.includes('.edu') ? 'School Google' : 
    (googleName ? `${googleName} (Personal)` : "Nad's Google Workspace")));

  // 5. Upsert connection strictly keyed on (user_id, provider, account_identifier)
  const { data: connRecord, error: connErr } = await admin
    .from('connections')
    .upsert({
      user_id: targetUserId,
      provider: 'google',
      account_identifier: googleEmail,
      nickname: finalNickname,
      status: 'connected',
      encrypted_refresh_token: encryptedRefreshToken,
      scopes: (tokenData.scope || '').split(' '),
      metadata: {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        access_token: tokenData.access_token,
        expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000),
        google_name: googleName,
        connected_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,provider,account_identifier' })
    .select('id, user_id, provider, account_identifier, nickname')
    .single();

  if (connErr) {
    console.error('[Google OAuth Connection Save Error]:', connErr);
  }

  // 6. Seed / associate Drive source with this specific connection
  const driveNickname = `${finalNickname} Drive`;
  await admin.from('drive_sources').upsert({
    user_id: targetUserId,
    account_id: connRecord?.id || null,
    nickname: driveNickname,
    folder_id: 'root',
    scope_granted: 'drive.readonly'
  }, { onConflict: 'user_id,nickname' });

  await logAuditEvent({
    userId: targetUserId,
    action: 'google.oauth.connected',
    resource: 'connections',
    details: { provider: 'google', accountIdentifier: googleEmail, nickname: finalNickname },
    req
  });

  // Return user-friendly HTML confirmation page
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>NAD JARVIS — Google Account Connected</title>
        <style>
          body { background: #06080c; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(14, 18, 27, 0.9); border: 1px solid rgba(212, 175, 55, 0.4); padding: 40px; border-radius: 20px; text-align: center; max-width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15); }
          h2 { color: #d4af37; margin-top: 0; margin-bottom: 12px; font-size: 1.5rem; }
          .badge { display: inline-block; padding: 4px 12px; background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 20px; color: #d4af37; font-size: 0.85rem; margin-bottom: 16px; }
          p { opacity: 0.85; line-height: 1.6; font-size: 0.95rem; }
          .btn-return { display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #d4af37, #b8860b); color: #000; text-decoration: none; font-weight: 700; border-radius: 12px; transition: transform 0.2s; }
          .btn-return:hover { transform: translateY(-2px); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Google Workspace Connected</div>
          <h2>${finalNickname}</h2>
          <p>Google account <strong>${googleEmail}</strong> successfully authorized and credentials securely encrypted on server.</p>
          <a class="btn-return" href="/">Return to NAD JARVIS</a>
        </div>
      </body>
    </html>
  `;
}

/**
 * List all connected external accounts for the single owner.
 * Never exposes refresh tokens or secrets.
 */
async function listConnectedAccounts({ auth, req }) {
  const client = auth.client;
  const { data: connections, error } = await client
    .from('connections')
    .select('id, provider, account_identifier, nickname, status, scopes, metadata, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[listConnectedAccounts Error]:', error);
  }

  const { data: driveSources } = await client
    .from('drive_sources')
    .select('*')
    .eq('user_id', auth.user.id);

  const accounts = (connections || []).map(conn => {
    const scopes = Array.isArray(conn.scopes) ? conn.scopes : [];
    const source = (driveSources || []).find(ds => ds.account_id === conn.id);
    return {
      id: conn.id,
      provider: conn.provider,
      nickname: conn.nickname || source?.nickname || `${conn.provider} (${conn.account_identifier})`,
      email: conn.account_identifier,
      status: conn.status || 'connected',
      scopes: scopes,
      services: {
        drive: scopes.some(s => s.includes('drive')),
        calendar: scopes.some(s => s.includes('calendar')),
        gmail: scopes.some(s => s.includes('gmail'))
      },
      driveSourceId: source?.id || null,
      connectedAt: conn.metadata?.connected_at || conn.created_at || conn.updated_at
    };
  });

  return { status: 'success', count: accounts.length, accounts };
}

/**
 * Disconnect an external account.
 */
async function disconnectAccount({ auth, body, req }) {
  const { accountId, accountIdentifier } = body || {};
  const client = auth.client;

  let query = client.from('connections').delete().eq('user_id', auth.user.id);
  if (accountId) {
    query = query.eq('id', accountId);
  } else if (accountIdentifier) {
    query = query.eq('account_identifier', accountIdentifier);
  } else {
    const err = new Error('Missing accountId or accountIdentifier parameter.');
    err.statusCode = 400;
    throw err;
  }

  const { error } = await query;
  if (error) throw error;

  await logAuditEvent({
    userId: auth.user.id,
    action: 'google.account.disconnected',
    resource: 'connections',
    details: { accountId, accountIdentifier },
    req
  });

  return { status: 'success', message: 'Account disconnected successfully.' };
}

/**
 * Resolves a valid Google OAuth access token for a given connected account.
 * Automatically handles refresh token decryption and token refreshment.
 */
async function getGoogleAccessToken(client, userId, { accountId, accountIdentifier, nickname } = {}) {
  let query = client.from('connections').select('*').eq('user_id', userId).eq('provider', 'google').eq('status', 'connected');
  if (accountId) query = query.eq('id', accountId);
  else if (accountIdentifier) query = query.eq('account_identifier', accountIdentifier);
  else if (nickname) query = query.eq('nickname', nickname);
  
  const { data: conns } = await query;
  const connection = conns && conns[0];
  if (!connection) return null;

  const meta = connection.metadata || {};
  if (meta.access_token && meta.expires_at && meta.expires_at > Date.now() + 60000) {
    return { token: meta.access_token, connection };
  }

  const { decryptToken } = require('../crypto');
  const refreshToken = decryptToken(connection.encrypted_refresh_token);
  if (!refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    if (res.ok) {
      const data = await res.json();
      const newExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
      await client.from('connections').update({
        metadata: { ...meta, access_token: data.access_token, expires_at: newExpiresAt }
      }).eq('id', connection.id);
      return { token: data.access_token, connection };
    }
  } catch (e) {
    console.warn('[Google Auth Token Refresh Warning]:', e.message);
  }
  return null;
}

module.exports = {
  buildOAuthStartResponse,
  handleOAuthCallback,
  listConnectedAccounts,
  disconnectAccount,
  getGoogleAccessToken
};
