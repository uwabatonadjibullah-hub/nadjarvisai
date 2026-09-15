/**
 * api/schedule.js
 * Consolidated Schedule Handler for NAD JARVIS
 *
 * Merges the following original endpoints (no functionality removed):
 *   GET  /api/schedule         -> list active scheduled jobs + weekly schedule
 *   POST /api/schedule         -> create or update a scheduled job
 *   GET  /api/schedule?due=1   -> returns jobs due for execution (was /api/schedule/due)
 *   GET  /api/schedule/due     -> ALSO still handled here (path via vercel.json rewrite)
 *
 * Authorization:
 *   Normal requests: verifyOwnerSession (Bearer JWT)
 *   Due-job cron trigger: x-cron-secret header (admin client bypass)
 *
 * Conforms to Section 2.4 & Section 5
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');
const { PERSONAL_KNOWLEDGE_BASE } = require('../lib/knowledge');

module.exports = async function handler(req, res) {
  const isDueQuery = req.query.due === '1' || req.query.action === 'due';

  // ─── GET /api/schedule?due=1  (due-job check) ───────────────────────────────
  if (isDueQuery && req.method === 'GET') {
    const cronSecret = req.headers['x-cron-secret'];
    let userId;
    let client;

    if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
      const { getSupabaseAdmin } = require('../lib/supabase');
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

      if (userId) query = query.eq('user_id', userId);

      const { data: dueJobs, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

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
  }

  // All other operations require owner session
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const userId = auth.user.id;
  const client = auth.client;

  // ─── GET /api/schedule  (list schedule) ─────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data: jobs, error } = await client
        .from('scheduled_jobs')
        .select('*')
        .neq('status', 'cancelled')
        .order('next_run', { ascending: true });

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        status: 'success',
        weeklySchedule: PERSONAL_KNOWLEDGE_BASE.weeklySchedule,
        scheduledJobs: jobs || []
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve schedule' });
    }
  }

  // ─── POST /api/schedule  (create or update job) ──────────────────────────────
  if (req.method === 'POST') {
    const { title, scheduleCron = null, nextRun, payload = {}, id = null } = req.body || {};

    if (!title || !nextRun) {
      return res.status(400).json({ error: 'Missing title or nextRun datetime.' });
    }

    try {
      let jobRecord;
      if (id) {
        const { data, error } = await client
          .from('scheduled_jobs')
          .update({
            title,
            schedule_cron: scheduleCron,
            next_run: new Date(nextRun).toISOString(),
            payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        jobRecord = data;
      } else {
        const { data, error } = await client
          .from('scheduled_jobs')
          .insert({
            user_id: userId,
            title,
            schedule_cron: scheduleCron,
            next_run: new Date(nextRun).toISOString(),
            payload,
            status: 'active'
          })
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        jobRecord = data;
      }

      await logAuditEvent({
        userId,
        action: 'schedule.save_job',
        resource: 'scheduled_jobs',
        details: { jobId: jobRecord.id, title, nextRun },
        req
      });

      return res.status(200).json({ status: 'success', job: jobRecord });

    } catch (err) {
      console.error('[Schedule Job Error]:', err);
      return res.status(500).json({ error: 'Failed to save scheduled job' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
