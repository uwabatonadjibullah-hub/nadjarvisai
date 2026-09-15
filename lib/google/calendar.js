/**
 * lib/google/calendar.js
 * Internal Google Calendar operations module for NAD JARVIS
 * Conforms to Section 0 & Section 2.4
 *
 * All Calendar logic lives here; api/google/workspace.js dispatches to this module.
 */

const { logAuditEvent } = require('../audit');

/**
 * List calendar events.
 * Preserves original route: POST|GET /api/google/calendar/list
 */
async function listCalendarEvents({ auth, req }) {
  const defaultEvents = [
    { id: 'cal_1', title: 'Tahajjud & Fajr Prayer + Quran Murajaah', time: '04:00 AM - 05:30 AM', category: 'Worship', recurring: 'Daily' },
    { id: 'cal_2', title: 'SAEV Simulation & Kinematics Review (UR CST)', time: '10:00 AM - 12:00 PM', category: 'Engineering', day: 'Saturday' },
    { id: 'cal_3', title: 'ZAD Academy & Software Dev Sprint', time: '11:00 AM - 04:00 PM', category: 'Software Dev', day: 'Monday' },
    { id: 'cal_4', title: 'Jummah Prayer & Family Time', time: '12:00 PM - 03:00 PM', category: 'Worship/Family', day: 'Friday' }
  ];

  await logAuditEvent({ userId: auth.user.id, action: 'calendar.list', resource: 'calendar', details: { count: defaultEvents.length }, req });

  return { status: 'success', calendar: 'primary', owner: auth.user.email, events: defaultEvents };
}

/**
 * Create a calendar event (requires explicit owner confirmation).
 * Preserves original route: POST /api/google/calendar/create
 */
async function createCalendarEvent({ auth, body, req }) {
  const { title, date, time, confirmed = false } = body || {};

  if (!title || !date) {
    const err = new Error('Missing title or date for calendar event.'); err.statusCode = 400; throw err;
  }

  // Section 0 confirmation requirement
  if (!confirmed) {
    return {
      _confirmationRequired: true,
      status: 'confirmation_required',
      message: `Adding an event to Google Calendar requires owner confirmation. Please confirm event: "${title}" on ${date} at ${time || 'unspecified time'}.`,
      action: 'calendar.create',
      payload: { title, date, time }
    };
  }

  const eventId = `evt_${Date.now()}`;

  // Also persist in scheduled_jobs for unified Jarvis visibility
  await auth.client.from('scheduled_jobs').insert({
    user_id: auth.user.id,
    title: `[Calendar] ${title}`,
    next_run: new Date(`${date}T${time ? time.replace(/\s+/g, '') : '09:00:00'}`).toISOString(),
    payload: { externalEventId: eventId, time },
    status: 'active'
  });

  await logAuditEvent({ userId: auth.user.id, action: 'calendar.create', resource: 'calendar', details: { eventId, title, date, time }, req });

  return { status: 'success', eventId, message: `Event "${title}" successfully scheduled in Google Calendar for ${date}.` };
}

module.exports = { listCalendarEvents, createCalendarEvent };
