/**
 * Audit Logging Module for NAD JARVIS
 * Conforms to Section 2.2, 2.4, and Section 6 Security Checklist:
 * Records all security-sensitive actions in the `audit_events` table.
 */

const { getSupabaseAdmin } = require('./supabase');

async function logAuditEvent({ userId, action, resource = null, details = {}, req = null }) {
  try {
    const admin = getSupabaseAdmin();
    let ipAddress = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }
    }

    const payload = {
      user_id: userId,
      action,
      resource,
      details,
      ip_address: ipAddress
    };

    const { error } = await admin.from('audit_events').insert(payload);
    if (error) {
      console.warn('[Audit Warning] Could not record audit event:', error.message);
    }
  } catch (err) {
    console.warn('[Audit Exception] Error recording audit event:', err.message);
  }
}

module.exports = {
  logAuditEvent
};
