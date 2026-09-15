/**
 * Base AI Provider Adapter Interface for NAD JARVIS
 * Conforms to nadjarvisskiills.txt Section 3:
 * Every provider must implement this exact shape.
 */

class BaseProviderAdapter {
  constructor(providerId, name, config = {}) {
    this.providerId = providerId;
    this.name = name;
    this.config = config;
  }

  /**
   * Send a standard conversational completion request
   * @param {Object} options { messages, tools, temperature, maxTokens, model }
   * @returns {Promise<{ content: string, model: string, usage: Object, latencyMs: number }>}
   */
  async sendMessage(options) {
    throw new Error(`sendMessage() not implemented in ${this.name}`);
  }

  /**
   * Stream conversational tokens
   * @param {Object} options { messages, tools, temperature, onToken, model }
   * @returns {Promise<{ fullContent: string, usage: Object, latencyMs: number }>}
   */
  async streamMessage(options) {
    throw new Error(`streamMessage() not implemented in ${this.name}`);
  }

  /**
   * Analyze an uploaded document or image file
   */
  async analyzeFile(options) {
    throw new Error(`analyzeFile() not implemented in ${this.name}`);
  }

  /**
   * Whether this provider / default model supports multimodal vision
   */
  supportsVision() {
    return false;
  }

  /**
   * Whether this provider supports function / tool calling
   */
  supportsTools() {
    return false;
  }

  /**
   * Return provider capability summary
   */
  getCapabilities() {
    return {
      providerId: this.providerId,
      name: this.name,
      supportsVision: this.supportsVision(),
      supportsTools: this.supportsTools(),
      defaultModel: this.config.defaultModel || 'unknown'
    };
  }

  /**
   * Test availability and measure latency
   * @returns {Promise<{ status: 'online'|'degraded'|'offline', latencyMs: number, error?: string }>}
   */
  async healthCheck() {
    throw new Error(`healthCheck() not implemented in ${this.name}`);
  }

  /**
   * Calculate or estimate token cost for usage logging
   */
  estimateUsage(promptTokens, completionTokens) {
    return {
      promptTokens,
      completionTokens,
      estimatedCostUsd: 0
    };
  }
}

module.exports = BaseProviderAdapter;
