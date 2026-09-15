/**
 * public/services/api.js
 * Centralized API service client for NAD JARVIS frontend
 */

(function () {
  const TOKEN_KEY = 'nad_jarvis_token';

  class JarvisAPIService {
    constructor() {
      this.baseUrl = '';
    }

    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    }

    setToken(token) {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    clearToken() {
      localStorage.removeItem(TOKEN_KEY);
    }

    isAuthenticated() {
      return Boolean(this.getToken());
    }

    async request(endpoint, options = {}) {
      const url = new URL(endpoint, window.location.origin);
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
          }
        });
      }

      const headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      const fetchOptions = {
        method: options.method || 'GET',
        headers,
        body: options.body
      };

      try {
        const response = await fetch(url.toString(), fetchOptions);

        if (response.status === 401) {
          console.warn('[JarvisAPI] Session expired or unauthorized.');
          // Don't auto-redirect if checking session or on login page
          if (!window.location.pathname.includes('login.html') && !endpoint.includes('action=session')) {
            this.clearToken();
            window.dispatchEvent(new CustomEvent('jarvis:unauthorized'));
          }
        }

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          const errorMsg = (data && data.error) ? data.error : (typeof data === 'string' ? data : `HTTP ${response.status}`);
          const err = new Error(errorMsg);
          err.status = response.status;
          err.data = data;
          throw err;
        }

        return data;
      } catch (err) {
        console.error(`[JarvisAPI Error] ${options.method || 'GET'} ${endpoint}:`, err);
        throw err;
      }
    }

    get(endpoint, params = {}) {
      return this.request(endpoint, { method: 'GET', params });
    }

    post(endpoint, body = {}, params = {}) {
      return this.request(endpoint, { method: 'POST', body, params });
    }

    put(endpoint, body = {}, params = {}) {
      return this.request(endpoint, { method: 'PUT', body, params });
    }

    patch(endpoint, body = {}, params = {}) {
      return this.request(endpoint, { method: 'PATCH', body, params });
    }

    delete(endpoint, params = {}) {
      return this.request(endpoint, { method: 'DELETE', params });
    }

    // ── Auth Endpoints ─────────────────────────────────────────
    async login(email, password) {
      const data = await this.post('/api/auth', { email, password });
      if (data && data.session && data.session.access_token) {
        this.setToken(data.session.access_token);
      } else if (data && data.token) {
        this.setToken(data.token);
      }
      return data;
    }

    async checkSession() {
      const token = this.getToken();
      if (!token) {
        return { authenticated: false };
      }
      try {
        const data = await this.get('/api/auth', { action: 'session' });
        return data;
      } catch (err) {
        this.clearToken();
        return { authenticated: false, error: err.message };
      }
    }

    async logout() {
      try {
        await this.post('/api/auth', {}, { action: 'logout' });
      } catch (e) {
        // Ignore logout errors
      } finally {
        this.clearToken();
      }
    }

    // ── Conversations Endpoints ────────────────────────────────
    async getConversations() {
      return this.get('/api/conversations');
    }

    async getConversation(id) {
      return this.get('/api/conversations', { id });
    }

    async createConversation(title = 'New Conversation') {
      return this.post('/api/conversations', { title });
    }

    async deleteConversation(id) {
      return this.delete('/api/conversations', { id });
    }

    // ── Tasks Endpoints ────────────────────────────────────────
    async getTasks() {
      return this.get('/api/tasks');
    }

    async createTask(task) {
      return this.post('/api/tasks', task);
    }

    async updateTask(task) {
      return this.patch('/api/tasks', task);
    }

    async deleteTask(id) {
      return this.delete('/api/tasks', { id });
    }

    // ── Memory & Knowledge Endpoints ───────────────────────────
    async getMemory(query) {
      return this.get('/api/memory', query ? { q: query } : {});
    }

    async saveMemory(item) {
      return this.post('/api/memory', item);
    }

    async getFiles(folderId = 'root') {
      return this.get('/api/files', { folderId });
    }
  }

  window.JarvisAPI = new JarvisAPIService();
})();
