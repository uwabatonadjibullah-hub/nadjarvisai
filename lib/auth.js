/**
 * Authentication Middleware for NAD JARVIS API Routes
 * Conforms to Section 0 & Section 2.1:
 * - Single-user owner validation
 * - Verifies Supabase session / JWT on EVERY protected route
 * - Never trusts client-supplied user IDs
 */

const { getSupabaseAdmin, getSupabaseUserClient } = require('./supabase');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'uwabatonadjibullah@gmail.com';
const OWNER_USER_ID = process.env.OWNER_USER_ID || '5210c843-3060-4acb-a3a5-db8f35ce7e5b';

async function verifyOwnerSession(req, res) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token.' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token provided.' });
    return null;
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: Invalid Supabase session token.' });
      return null;
    }

    // Verify user is the single recognized owner
    const isOwnerId = OWNER_USER_ID && user.id === OWNER_USER_ID;
    const isOwnerEmail = OWNER_EMAIL && user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    if (!isOwnerId && !isOwnerEmail) {
      res.status(403).json({ error: 'Forbidden: Access restricted strictly to the single owner.' });
      return null;
    }

    // Return user details and client scoped with owner JWT for RLS
    const userClient = getSupabaseUserClient(token);
    return { user, token, client: userClient };

  } catch (err) {
    console.error('Session verification error:', err);
    res.status(401).json({ error: 'Unauthorized: Session verification failed.' });
    return null;
  }
}

module.exports = {
  OWNER_EMAIL,
  OWNER_USER_ID,
  verifyOwnerSession
};
