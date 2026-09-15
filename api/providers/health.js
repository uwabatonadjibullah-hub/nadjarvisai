/**
 * POST /api/providers/health
 * Checks latency and operational availability across configured AI providers
 * Conforms to Section 2.4 & Section 3
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { ADAPTERS } = require('../../lib/router');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const results = {};

  for (const [key, adapter] of Object.entries(ADAPTERS)) {
    try {
      results[key] = await adapter.healthCheck();
    } catch (err) {
      results[key] = {
        status: 'offline',
        latencyMs: 0,
        error: err.message
      };
    }
  }

  return res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    providers: results
  });
};
