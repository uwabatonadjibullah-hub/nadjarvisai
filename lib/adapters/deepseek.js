/**
 * DeepSeek Provider Adapter for NAD JARVIS
 * Conforms to Section 3: Specialized in fast, low-cost general chat.
 * Prepared for live key activation once acquired.
 */

const BaseProviderAdapter = require('./base');

class DeepSeekAdapter extends BaseProviderAdapter {
  constructor() {
    super('deepseek', 'DeepSeek', {
      baseUrl: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat'
    });
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  supportsVision() {
    return false;
  }

  supportsTools() {
    return true;
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { status: 'offline', latencyMs: 0, error: 'DeepSeek API key pending configuration' };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { status: 'online', latencyMs };
      } else {
        return { status: 'degraded', latencyMs, error: `HTTP ${res.status}: ${res.statusText}` };
      }
    } catch (err) {
      return { status: 'offline', latencyMs: Date.now() - start, error: err.message };
    }
  }

  async sendMessage({ messages, tools = null, temperature = 0.7, maxTokens = 2048, model = null }) {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API key is pending configuration.');
    }

    const selectedModel = model || this.config.defaultModel;
    const startTime = Date.now();

    const body = {
      model: selectedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    return {
      content: message.content || '',
      toolCalls: message.tool_calls || null,
      model: data.model || selectedModel,
      provider: 'deepseek',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      latencyMs
    };
  }

  async streamMessage({ messages, tools = null, temperature = 0.7, maxTokens = 2048, model = null, onToken = null }) {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API key is pending configuration.');
    }

    const selectedModel = model || this.config.defaultModel;
    const startTime = Date.now();

    const body = {
      model: selectedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek Streaming error (${res.status}): ${errText}`);
    }

    let fullContent = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                if (onToken) onToken(delta);
              }
            } catch (e) {
              // Ignore malformed chunk
            }
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      content: fullContent,
      model: selectedModel,
      provider: 'deepseek',
      latencyMs
    };
  }

  estimateUsage(promptTokens, completionTokens) {
    // DeepSeek V3: ~$0.14 / 1M input, ~$0.28 / 1M output
    const cost = ((promptTokens * 0.14) + (completionTokens * 0.28)) / 1000000;
    return {
      promptTokens,
      completionTokens,
      estimatedCostUsd: Number(cost.toFixed(6))
    };
  }
}

module.exports = DeepSeekAdapter;
