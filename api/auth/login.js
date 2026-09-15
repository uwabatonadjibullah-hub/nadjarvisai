/**
 * POST /api/auth/login
 * Authenticates the single owner via Supabase Auth
 * Conforms to Section 0 & 2.1: Single-user private assistant.
 */

const { getSupabaseAnon, getSupabaseAdmin } = require('../../lib/supabase');
const { OWNER_EMAIL } = require('../../lib/auth');
const { logAuditEvent } = require('../../lib/audit');
const { checkRateLimit } = require('../../lib/rateLimit');

module.exports = async function handler(req, res) {
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

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
};
