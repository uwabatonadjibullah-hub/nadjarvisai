/**
 * GET /api/schedule/due
 * Returns all jobs that are due for execution (next_run <= NOW())
 * Intended for Vercel Cron or periodic polling service
 * Conforms to Section 2.4 & Section 5
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { logAuditEvent } = require('../../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Authorize via session OR cron secret
  const cronSecret = req.headers['x-cron-secret'];
  let userId;
  let client;

  if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
    const { getSupabaseAdmin } = require('../../lib/supabase');
    client = getSupabaseAdmin();
  } else {
    const auth = await verifyOwnerSession(req, res);
    if (!auth) return;
    client = auth.client;
    userId = auth.user.id;
  }

  try {
    const nowIso = new Date().toISOString();

    let query = client
      .from('scheduled_jobs')
      .select('*')
      .eq('status', 'active')
      .lte('next_run', nowIso)
      .order('next_run', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: dueJobs, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      status: 'success',
      timestamp: nowIso,
      count: dueJobs ? dueJobs.length : 0,
      dueJobs: dueJobs || []
    });

  } catch (err) {
    console.error('[Schedule Due Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve due jobs' });
  }
};
