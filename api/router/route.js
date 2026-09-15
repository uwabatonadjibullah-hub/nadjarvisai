/**
 * POST /api/router/route
 * Internal Router Diagnostic & Model Selection Endpoint
 * Conforms to Section 2.4 & Section 3
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { classifyTask, selectProviderAndModel } = require('../../lib/router');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

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
};
