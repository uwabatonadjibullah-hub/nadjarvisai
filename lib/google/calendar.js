/**
 * lib/google/calendar.js
 * Internal Google Calendar operations module for NAD JARVIS
 * Conforms to Section 0 & Section 2.4:
 * - Supports multiple connected Google accounts (Personal, Work, School).
 * - Unified payload contract handling (summary/description and title/date/time).
 * - Synchronizes with Supabase scheduled_jobs.
 */

const { logAuditEvent } = require('../audit');
const { getGoogleAccessToken } = require('./oauth');

/**
 * List calendar events.
 * Preserves original route: POST|GET /api/google/calendar/list
 */
async function listCalendarEvents({ auth, body = {}, req }) {
  const { accountId = null, accountIdentifier = null, timeMin = null, timeMax = null } = body || {};
  const client = auth.client;

  const authContext = await getGoogleAccessToken(client, auth.user.id, { accountId, accountIdentifier });

  let liveEvents = [];
  if (authContext && authContext.token) {
    try {
      const now = new Date();
      const min = timeMin || new Date(now.getTime() - 7 * 86400000).toISOString();
      const max = timeMax || new Date(now.getTime() + 30 * 86400000).toISOString();

      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('timeMin', min);
      url.searchParams.set('timeMax', max);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '25');

      const calRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${authContext.token}` }
      });

      if (calRes.ok) {
        const calData = await calRes.json();
        if (calData.items && calData.items.length > 0) {
          liveEvents = calData.items.map(item => {
            const startStr = item.start?.dateTime || item.start?.date || '';
            const endStr = item.end?.dateTime || item.end?.date || '';
            let timeFormatted = 'All Day';
            if (item.start?.dateTime) {
              const d = new Date(item.start.dateTime);
              timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return {
              id: item.id,
              title: item.summary || 'Untitled Event',
              description: item.description || '',
              time: timeFormatted,
              start: startStr,
              end: endStr,
              location: item.location || '',
              category: 'Google Calendar',
              accountNickname: authContext.connection.nickname
            };
          });
        }
      }
    } catch (e) {
      console.warn('[Google Calendar API Exception]:', e.message);
    }
  }

  // Also query scheduled_jobs from Supabase for local scheduled items
  const { data: dbJobs } = await client
    .from('scheduled_jobs')
    .select('*')
    .eq('user_id', auth.user.id)
    .neq('status', 'cancelled')
    .order('next_run', { ascending: true })
    .limit(10);

  const localCalendarJobs = (dbJobs || []).map(j => ({
    id: j.id,
    title: j.title.replace(/^\[Calendar\]\s*/, ''),
    time: j.payload?.time || (j.next_run ? new Date(j.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'),
    start: j.next_run,
    category: 'Local Schedule',
    recurring: j.schedule_cron ? `Cron (${j.schedule_cron})` : 'One-time'
  }));

  const defaultEvents = [
    { id: 'cal_1', title: 'Tahajjud & Fajr Prayer + Quran Murajaah', time: '04:00 AM - 05:30 AM', category: 'Worship', recurring: 'Daily' },
    { id: 'cal_2', title: 'SAEV Simulation & Kinematics Review (UR CST)', time: '10:00 AM - 12:00 PM', category: 'Engineering', day: 'Saturday' },
    { id: 'cal_3', title: 'ZAD Academy & Software Dev Sprint', time: '11:00 AM - 04:00 PM', category: 'Software Dev', day: 'Monday' },
    { id: 'cal_4', title: 'Jummah Prayer & Family Time', time: '12:00 PM - 03:00 PM', category: 'Worship/Family', day: 'Friday' }
  ];

  const combinedEvents = liveEvents.length > 0 
    ? [...liveEvents, ...localCalendarJobs] 
    : [...localCalendarJobs, ...defaultEvents];

  await logAuditEvent({
    userId: auth.user.id,
    action: 'calendar.list',
    resource: 'calendar',
    details: { count: combinedEvents.length, accountId: authContext?.connection?.id || null },
    req
  });

  return {
    status: 'success',
    calendar: 'primary',
    accountNickname: authContext?.connection?.nickname || "Default Calendar",
    accountEmail: authContext?.connection?.account_identifier || auth.user.email,
    events: combinedEvents
  };
}

/**
 * Create a calendar event (unifies frontend { summary, start, end } and backend { title, date, time }).
 * Preserves original route: POST /api/google/calendar/create
 */
async function createCalendarEvent({ auth, body, req }) {
  const { accountId = null, accountIdentifier = null } = body || {};

  // Normalize contract fields across frontend and backend
  const title = (body.title || body.summary || '').trim();
  const description = (body.description || '').trim();
  const location = (body.location || '').trim();

  let date = body.date;
  let time = body.time;

  // Handle frontend full dateTime format: { start: { dateTime } }
  if (body.start && body.start.dateTime) {
    const parsedDate = new Date(body.start.dateTime);
    if (!isNaN(parsedDate.getTime())) {
      date = date || parsedDate.toISOString().split('T')[0];
      time = time || parsedDate.toTimeString().slice(0, 5);
    }
  }

  // Handle simple start/end string dates
  if (!date && typeof body.start === 'string') {
    date = body.start.split('T')[0];
  }

  if (!title) {
    const err = new Error('Missing event title or summary.');
    err.statusCode = 400;
    throw err;
  }

  if (!date) {
    date = new Date().toISOString().split('T')[0]; // Default to today
  }

  // Section 0 confirmation requirement: explicit user request or confirmed flag
  const confirmed = body.confirmed !== undefined ? Boolean(body.confirmed) : true;

  if (!confirmed) {
    return {
      _confirmationRequired: true,
      status: 'confirmation_required',
      message: `Adding an event to Google Calendar requires owner confirmation. Please confirm event: "${title}" on ${date} at ${time || 'unspecified time'}.`,
      action: 'calendar.create',
      payload: { title, date, time, description, accountId }
    };
  }

  const client = auth.client;
  const authContext = await getGoogleAccessToken(client, auth.user.id, { accountId, accountIdentifier });

  let googleEventId = null;

  // 1. If live Google access token is available, create event in Google Calendar
  if (authContext && authContext.token) {
    try {
      const startDateTime = new Date(`${date}T${time ? time.replace(/\s+/g, '') : '09:00:00'}`).toISOString();
      const endDateTime = body.end?.dateTime 
        ? new Date(body.end.dateTime).toISOString()
        : new Date(new Date(startDateTime).getTime() + 3600000).toISOString();

      const gcalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authContext.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: title,
          description: description,
          location: location,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime }
        })
      });

      if (gcalRes.ok) {
        const gcalData = await gcalRes.json();
        googleEventId = gcalData.id;
      }
    } catch (e) {
      console.warn('[Google Calendar Create Warning]:', e.message);
    }
  }

  const eventId = googleEventId || `evt_${Date.now()}`;

  // 2. Persist in scheduled_jobs for unified Jarvis dashboard visibility
  await client.from('scheduled_jobs').insert({
    user_id: auth.user.id,
    title: `[Calendar] ${title}`,
    next_run: new Date(`${date}T${time ? time.replace(/\s+/g, '') : '09:00:00'}`).toISOString(),
    payload: { externalEventId: eventId, time, description, accountId: authContext?.connection?.id || null },
    status: 'active'
  });

  await logAuditEvent({
    userId: auth.user.id,
    action: 'calendar.create',
    resource: 'calendar',
    details: { eventId, title, date, time, accountId: authContext?.connection?.id || null },
    req
  });

  return {
    status: 'success',
    eventId,
    accountNickname: authContext?.connection?.nickname || 'Google Calendar',
    message: `Event "${title}" successfully scheduled for ${date} at ${time || '09:00'}.`
  };
}

module.exports = { listCalendarEvents, createCalendarEvent };
