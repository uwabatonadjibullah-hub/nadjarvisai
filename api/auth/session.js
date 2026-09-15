/**
 * GET /api/auth/session
 * Verifies active session token and returns owner profile
 */

const { verifyOwnerSession } = require('../../lib/auth');

module.exports = async function handler(req, res) {
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
};
