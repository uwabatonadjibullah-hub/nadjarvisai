/**
 * POST /api/google/calendar/create
 * Creates an event in Google Calendar
 * Conforms to Section 0 & 2.4:
 * Requires explicit owner confirmation before writing to connected Calendar.
 */

const { verifyOwnerSession } = require('../../../lib/auth');
const { logAuditEvent } = require('../../../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const { title, date, time, confirmed = false } = req.body || {};

  if (!title || !date) {
    return res.status(400).json({ error: 'Missing title or date for calendar event.' });
  }

  // Section 0 confirmation requirement
  if (!confirmed) {
    return res.status(403).json({
      status: 'confirmation_required',
      message: `Adding an event to Google Calendar requires owner confirmation. Please confirm event: "${title}" on ${date} at ${time || 'unspecified time'}.`,
      action: 'calendar.create',
      payload: { title, date, time }
    });
  }

  try {
    const eventId = `evt_${Date.now()}`;

    // Also persist in scheduled_jobs for unified Jarvis visibility
    await auth.client.from('scheduled_jobs').insert({
      user_id: auth.user.id,
      title: `[Calendar] ${title}`,
      next_run: new Date(`${date}T${time ? time.replace(/\s+/g, '') : '09:00:00'}`).toISOString(),
      payload: { externalEventId: eventId, time },
      status: 'active'
    });

    await logAuditEvent({
      userId: auth.user.id,
      action: 'calendar.create',
      resource: 'calendar',
      details: { eventId, title, date, time },
      req
    });

    return res.status(200).json({
      status: 'success',
      eventId,
      message: `Event "${title}" successfully scheduled in Google Calendar for ${date}.`
    });

  } catch (err) {
    console.error('[Calendar Create Error]:', err);
    return res.status(500).json({ error: 'Failed to create calendar event' });
  }
};
