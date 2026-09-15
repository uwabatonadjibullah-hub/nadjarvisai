/**
 * /api/schedule
 * GET: Retrieve active schedule, scheduled jobs, and Nad's default daily rhythm
 * POST: Create/update a reminder or recurring job in `scheduled_jobs`
 * Conforms to Section 2.4 & Section 5
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { logAuditEvent } = require('../../lib/audit');
const { PERSONAL_KNOWLEDGE_BASE } = require('../../lib/knowledge');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const userId = auth.user.id;
  const client = auth.client;

  // GET: Retrieve schedule and scheduled jobs
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

  // POST: Create or update scheduled job
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

      return res.status(200).json({
        status: 'success',
        job: jobRecord
      });

    } catch (err) {
      console.error('[Schedule Job Error]:', err);
      return res.status(500).json({ error: 'Failed to save scheduled job' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
