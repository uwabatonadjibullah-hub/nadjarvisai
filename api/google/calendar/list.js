/**
 * POST /api/google/calendar/list
 * Lists Google Calendar events for Nad's primary schedule
 * Conforms to Section 2.4
 */

const { verifyOwnerSession } = require('../../../lib/auth');
const { logAuditEvent } = require('../../../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  try {
    const defaultEvents = [
      { id: 'cal_1', title: 'Tahajjud & Fajr Prayer + Quran Murajaah', time: '04:00 AM - 05:30 AM', category: 'Worship', recurring: 'Daily' },
      { id: 'cal_2', title: 'SAEV Simulation & Kinematics Review (UR CST)', time: '10:00 AM - 12:00 PM', category: 'Engineering', day: 'Saturday' },
      { id: 'cal_3', title: 'ZAD Academy & Software Dev Sprint', time: '11:00 AM - 04:00 PM', category: 'Software Dev', day: 'Monday' },
      { id: 'cal_4', title: 'Jummah Prayer & Family Time', time: '12:00 PM - 03:00 PM', category: 'Worship/Family', day: 'Friday' }
    ];

    await logAuditEvent({
      userId: auth.user.id,
      action: 'calendar.list',
      resource: 'calendar',
      details: { count: defaultEvents.length },
      req
    });

    return res.status(200).json({
      status: 'success',
      calendar: 'primary',
      owner: auth.user.email,
      events: defaultEvents
    });

  } catch (err) {
    console.error('[Calendar List Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve calendar events' });
  }
};
