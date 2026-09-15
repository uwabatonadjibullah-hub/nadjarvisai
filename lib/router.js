/**
 * AI Router & Multi-Provider Orchestrator for NAD JARVIS
 * Conforms to nadjarvisskiills.txt Section 3:
 * - Classifies task intent
 * - Selects optimal provider & model
 * - Handles automatic fallbacks on timeout / error
 * - Logs all execution telemetry to `provider_usage` table
 */

const NvidiaNimAdapter = require('./adapters/nvidia');
const DeepSeekAdapter = require('./adapters/deepseek');
const { getSupabaseAdmin } = require('./supabase');

const nvidiaAdapter = new NvidiaNimAdapter();
const deepseekAdapter = new DeepSeekAdapter();

const ADAPTERS = {
  nvidia: nvidiaAdapter,
  deepseek: deepseekAdapter
};

function classifyTask(userMessage) {
  const text = (userMessage || '').toLowerCase();

  if (text.includes('code') || text.includes('function') || text.includes('script') || text.includes('bug') || text.includes('sql') || text.includes('python')) {
    return 'coding';
  }
  if (text.includes('calendar') || text.includes('schedule') || text.includes('reminder') || text.includes('drive') || text.includes('upload') || text.includes('download')) {
    return 'action';
  }
  if (text.includes('capstone') || text.includes('saev') || text.includes('kinematic') || text.includes('simulation') || text.includes('calculate') || text.includes('plan')) {
    return 'reasoning';
  }
  if (text.includes('rewrite') || text.includes('summarize') || text.includes('grammar') || text.includes('rephrase')) {
    return 'rewrite';
  }
  return 'general_chat';
}

function selectProviderAndModel(taskType) {
  // If NVIDIA is configured, it is premier for reasoning, coding, actions, and vision
  if (taskType === 'reasoning' || taskType === 'coding' || taskType === 'action' || taskType === 'vision') {
    if (nvidiaAdapter.isConfigured()) {
      return { primary: 'nvidia', model: 'meta/llama-3.2-90b-vision-instruct', fallback: 'deepseek' };
    }
  }

  // DeepSeek is preferred for cheap general chat if configured
  if (deepseekAdapter.isConfigured()) {
    return { primary: 'deepseek', model: 'deepseek-chat', fallback: 'nvidia' };
  }

  // Otherwise NVIDIA NIM
  if (nvidiaAdapter.isConfigured()) {
    return { primary: 'nvidia', model: 'meta/llama-3.2-90b-vision-instruct', fallback: 'deepseek' };
  }

  // Neither key configured
  return { primary: 'nvidia', model: 'meta/llama-3.2-90b-vision-instruct', fallback: null };
}

async function recordProviderUsage({ userId, provider, model, endpoint, promptTokens = 0, completionTokens = 0, latencyMs = 0, isFallback = false, fallbackReason = null, error = null }) {
  try {
    const admin = getSupabaseAdmin();
    await admin.from('provider_usage').insert({
      user_id: userId,
      provider,
      model,
      endpoint,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
      is_fallback: isFallback,
      fallback_reason: fallbackReason,
      error: error ? String(error) : null
    });
  } catch (err) {
    console.warn('[Usage Telemetry Warning]:', err.message);
  }
}

async function routeAndExecute({ userId, messages, tools = null, temperature = 0.7, maxTokens = 2048 }) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const taskType = classifyTask(lastUserMsg);
  const routing = selectProviderAndModel(taskType);

  let primaryAdapter = ADAPTERS[routing.primary];
  let fallbackAdapter = routing.fallback ? ADAPTERS[routing.fallback] : null;

  // Attempt Primary Provider
  if (primaryAdapter && primaryAdapter.isConfigured()) {
    try {
      const result = await primaryAdapter.sendMessage({
        messages,
        tools,
        temperature,
        maxTokens,
        model: routing.model
      });

      await recordProviderUsage({
        userId,
        provider: result.provider,
        model: result.model,
        endpoint: '/chat/completions',
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        latencyMs: result.latencyMs,
        isFallback: false
      });

      return { ...result, taskType };
    } catch (primaryErr) {
      console.warn(`[Router Primary Error] Provider ${routing.primary} failed:`, primaryErr.message);

      // Attempt Fallback if available
      if (fallbackAdapter && fallbackAdapter.isConfigured()) {
        try {
          const fbResult = await fallbackAdapter.sendMessage({
            messages,
            tools,
            temperature,
            maxTokens
          });

          await recordProviderUsage({
            userId,
            provider: fbResult.provider,
            model: fbResult.model,
            endpoint: '/chat/completions',
            promptTokens: fbResult.usage.promptTokens,
            completionTokens: fbResult.usage.completionTokens,
            latencyMs: fbResult.latencyMs,
            isFallback: true,
            fallbackReason: primaryErr.message
          });

          return { ...fbResult, isFallback: true, fallbackFrom: routing.primary, taskType };
        } catch (fbErr) {
          console.error('[Router Fallback Error] Fallback also failed:', fbErr.message);
          await recordProviderUsage({
            userId,
            provider: routing.fallback,
            model: 'unknown',
            endpoint: '/chat/completions',
            error: fbErr.message,
            isFallback: true
          });
        }
      } else {
        await recordProviderUsage({
          userId,
          provider: routing.primary,
          model: routing.model,
          endpoint: '/chat/completions',
          error: primaryErr.message,
          isFallback: false
        });
      }
    }
  }

  // Honest error reporting per Section 3
  return {
    content: "I apologize Nad, but I was unable to connect to the configured AI models (NVIDIA NIM / DeepSeek) at this moment. Please verify the API status or network credentials.",
    model: 'none',
    provider: 'system-fallback',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    latencyMs: 0,
    taskType,
    error: 'No healthy AI provider available'
  };
}

module.exports = {
  ADAPTERS,
  classifyTask,
  selectProviderAndModel,
  routeAndExecute,
  recordProviderUsage
};
