/**
 * public/services/google.js
 * Google Workspace and OAuth client service for NAD JARVIS frontend
 * Supports multi-account operations (Personal, Work, School).
 */

(function () {
  class GoogleWorkspaceService {
    constructor(apiClient) {
      this.api = apiClient || window.JarvisAPI;
      this.selectedAccountId = null;
    }

    getApiClient() {
      return this.api || window.JarvisAPI;
    }

    setSelectedAccount(accountId) {
      this.selectedAccountId = accountId;
    }

    getSelectedAccount() {
      return this.selectedAccountId;
    }

    /**
     * List connected Google accounts
     */
    async getAccounts() {
      return this.getApiClient().get('/api/google/workspace', { action: 'accounts.list' });
    }

    /**
     * Disconnect a Google account
     */
    async disconnectAccount(accountId) {
      return this.getApiClient().post('/api/google/workspace', { accountId }, { action: 'accounts.disconnect' });
    }

    /**
     * Start Google OAuth flow with custom nickname
     */
    async initiateOAuth(nickname = '') {
      const params = { action: 'start' };
      if (nickname) params.nickname = nickname;

      const data = await this.getApiClient().get('/api/google/oauth', params);
      if (data && data.authUrl) {
        window.location.href = data.authUrl;
      }
      return data;
    }

    /**
     * List Google Drive files
     */
    async listDriveFiles(folderId = 'root', accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        folderId,
        accountId: targetAccountId
      }, { action: 'drive.list' });
    }

    /**
     * Read a Google Drive file content
     */
    async readDriveFile(fileId, accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        fileId,
        accountId: targetAccountId
      }, { action: 'drive.read' });
    }

    /**
     * Upload a file to Google Drive
     */
    async uploadToDrive(filePayload, accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        ...filePayload,
        accountId: targetAccountId,
        confirmed: true
      }, { action: 'drive.upload' });
    }

    /**
     * List calendar events
     */
    async listCalendarEvents(timeMin = null, timeMax = null, accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        timeMin,
        timeMax,
        accountId: targetAccountId
      }, { action: 'calendar.list' });
    }

    /**
     * Create a calendar event
     */
    async createCalendarEvent(eventData, accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        ...eventData,
        accountId: targetAccountId,
        confirmed: true
      }, { action: 'calendar.create' });
    }

    /**
     * Read a Gmail message
     */
    async readGmail(messageId, accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        messageId,
        accountId: targetAccountId
      }, { action: 'gmail.read' });
    }

    /**
     * Search Gmail
     */
    async searchGmail(query, accountId = null) {
      const targetAccountId = accountId || this.selectedAccountId;
      return this.getApiClient().post('/api/google/workspace', {
        query,
        accountId: targetAccountId
      }, { action: 'gmail.search' });
    }
  }

  window.JarvisGoogle = new GoogleWorkspaceService();
})();
