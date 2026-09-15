/**
 * NVIDIA NIM Provider Adapter for NAD JARVIS
 * Conforms to Section 3: Specialized in reasoning, planning, and tool-calling.
 */

const BaseProviderAdapter = require('./base');

class NvidiaNimAdapter extends BaseProviderAdapter {
  constructor() {
    super('nvidia', 'NVIDIA NIM', {
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      defaultModel: 'meta/llama-3.2-90b-vision-instruct'
    });
    this.apiKey = process.env.NVIDIA_NIM_API_KEY || '';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  supportsVision() {
    return true; // meta/llama-3.2-90b-vision-instruct has native vision capabilities
  }

  supportsTools() {
    return true;
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { status: 'offline', latencyMs: 0, error: 'NVIDIA_NIM_API_KEY not configured' };
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
      throw new Error('NVIDIA NIM API key is not configured.');
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
      throw new Error(`NVIDIA NIM API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    return {
      content: message.content || '',
      toolCalls: message.tool_calls || null,
      model: data.model || selectedModel,
      provider: 'nvidia',
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
      throw new Error('NVIDIA NIM API key is not configured.');
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
      throw new Error(`NVIDIA NIM Streaming error (${res.status}): ${errText}`);
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
      provider: 'nvidia',
      latencyMs
    };
  }

  estimateUsage(promptTokens, completionTokens) {
    // Estimating Llama 3.1 70B standard rates: ~$0.88 / 1M input, ~$0.88 / 1M output
    const cost = ((promptTokens + completionTokens) / 1000000) * 0.88;
    return {
      promptTokens,
      completionTokens,
      estimatedCostUsd: Number(cost.toFixed(6))
    };
  }
}

module.exports = NvidiaNimAdapter;
