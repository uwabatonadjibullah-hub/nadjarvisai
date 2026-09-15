/**
 * api/providers.js
 * Consolidated Providers & Router Diagnostic Handler for NAD JARVIS
 *
 * Merges the following original endpoints (no functionality removed):
 *   GET|POST /api/providers/health   -> provider health check
 *   POST     /api/router/route       -> AI task classification & model selection
 *
 * Routes:
 *   GET|POST /api/providers            -> provider health check
 *   POST     /api/providers?action=route -> AI task classification diagnostic
 *
 * Conforms to Section 2.4 & Section 3
 */

const { verifyOwnerSession } = require('../lib/auth');
const { ADAPTERS, classifyTask, selectProviderAndModel } = require('../lib/router');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const action = req.query.action || 'health';

  // ─── POST /api/providers?action=route  (AI router diagnostic) ───────────────
  if (action === 'route') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Missing message parameter.' });
    }

    const taskType = classifyTask(message);
    const routing = selectProviderAndModel(taskType);

    return res.status(200).json({
      status: 'success',
      taskType,
      routing: {
        primaryProvider: routing.primary,
        model: routing.model,
        fallbackProvider: routing.fallback
      }
    });
  }

  // ─── GET|POST /api/providers  (health check) ────────────────────────────────
  const results = {};

  for (const [key, adapter] of Object.entries(ADAPTERS)) {
    try {
      results[key] = await adapter.healthCheck();
    } catch (err) {
      results[key] = { status: 'offline', latencyMs: 0, error: err.message };
    }
  }

  return res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    providers: results
  });
};
