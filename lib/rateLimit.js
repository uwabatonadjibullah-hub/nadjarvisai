/**
 * Rate Limiting Middleware for NAD JARVIS (Vercel Serverless)
 * Conforms to Section 6 Security Checklist:
 * Enforces per-IP / per-session rate limits to protect AI endpoints and database.
 */

const requestCounts = new Map();

// Default: 60 requests per minute per IP
function checkRateLimit(req, res, { maxRequests = 60, windowMs = 60000 } = {}) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client';
  const clientKey = typeof ip === 'string' ? ip.split(',')[0].trim() : 'client';
  const now = Date.now();

  const record = requestCounts.get(clientKey) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count += 1;
  }

  requestCounts.set(clientKey, record);

  if (record.count > maxRequests) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    res.status(429).json({
      error: 'Too Many Requests: Rate limit exceeded. Please wait a moment before sending more requests.',
      retryAfter: retryAfterSec
    });
    return false;
  }

  return true;
}

module.exports = {
  checkRateLimit
};
