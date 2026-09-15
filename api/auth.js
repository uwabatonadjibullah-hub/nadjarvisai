/**
 * api/auth.js
 * Consolidated Authentication Handler for NAD JARVIS
 *
 * Merges the following original endpoints (no functionality removed):
 *   POST /api/auth/login    -> action=login  (or POST with no action)
 *   GET  /api/auth/session  -> action=session (or GET with no action)
 *
 * Frontend callers that previously used /api/auth/login and /api/auth/session
 * now call /api/auth with the same method; backwards-compatible action routing
 * is provided for any callers that pass ?action=login or ?action=session.
 *
 * Conforms to Section 0 & 2.1: Single-user private assistant.
 */

const { getSupabaseAnon, getSupabaseAdmin } = require('../lib/supabase');
const { verifyOwnerSession, OWNER_EMAIL } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');
const { checkRateLimit } = require('../lib/rateLimit');

module.exports = async function handler(req, res) {
  const action = req.query.action || (req.method === 'POST' ? 'login' : 'session');

  // ─── POST /api/auth  (login) ────────────────────────────────────────────────
  if (action === 'login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Strict Brute Force Rate Limiting (5 attempts per minute)
    if (!checkRateLimit(req, res, { maxRequests: 5, windowMs: 60000 })) {
      return;
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password.' });
    }

    // Strict check: Only owner email allowed
    if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden: Unauthorized user email.' });
    }

    try {
      const supabase = getSupabaseAnon();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        return res.status(401).json({ error: error ? error.message : 'Invalid credentials' });
      }

      // Ensure owner profile exists in database
      const admin = getSupabaseAdmin();
      await admin.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: 'Nadjibullah Uwabato',
        nickname: 'Nad',
        is_owner: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      await logAuditEvent({
        userId: data.user.id,
        action: 'auth.login',
        resource: 'profiles',
        details: { email: data.user.email },
        req
      });

      return res.status(200).json({
        status: 'success',
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: {
            id: data.user.id,
            email: data.user.email,
            fullName: 'Nadjibullah Uwabato',
            nickname: 'Nad'
          }
        }
      });

    } catch (err) {
      console.error('[Login Error]:', err);
      return res.status(500).json({ error: 'Internal server error during authentication' });
    }
  }

  // ─── GET /api/auth  (session check) ─────────────────────────────────────────
  if (action === 'session') {
    const auth = await verifyOwnerSession(req, res);
    if (!auth) return;

    const { data: profile } = await auth.client
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .single();

    return res.status(200).json({
      status: 'authenticated',
      user: {
        id: auth.user.id,
        email: auth.user.email,
        fullName: profile?.full_name || 'Nadjibullah Uwabato',
        nickname: profile?.nickname || 'Nad',
        avatarUrl: profile?.avatar_url || null
      }
    });
  }

  return res.status(400).json({ error: 'Unknown action. Use action=login or action=session.' });
};
