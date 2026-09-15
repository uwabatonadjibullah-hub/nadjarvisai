/**
 * public/services/google.js
 * Google Workspace and OAuth client service for NAD JARVIS frontend
 */

(function () {
  class GoogleWorkspaceService {
    constructor(apiClient) {
      this.api = apiClient || window.JarvisAPI;
    }

    getApiClient() {
      return this.api || window.JarvisAPI;
    }

    /**
     * List connected Google accounts
     */
    async getAccounts() {
      return this.getApiClient().get('/api/google/workspace', { action: 'accounts.list' });
    }

    /**
     * Start Google OAuth flow (fetches authUrl and redirects)
     */
    async initiateOAuth() {
      const data = await this.getApiClient().get('/api/google/oauth', { action: 'start' });
      if (data && data.authUrl) {
        window.location.href = data.authUrl;
      }
      return data;
    }

    /**
     * List Google Drive files
     */
    async listDriveFiles(folderId = 'root', nickname = "Nad's Google Drive") {
      return this.getApiClient().post('/api/google/workspace', { folderId, nickname }, { action: 'drive.list' });
    }

    /**
     * Read a Google Drive file content
     */
    async readDriveFile(fileId) {
      return this.getApiClient().post('/api/google/workspace', { fileId }, { action: 'drive.read' });
    }

    /**
     * Upload a file to Google Drive
     */
    async uploadToDrive(filePayload) {
      return this.getApiClient().post('/api/google/workspace', filePayload, { action: 'drive.upload' });
    }

    /**
     * List calendar events
     */
    async listCalendarEvents(timeMin, timeMax) {
      return this.getApiClient().post('/api/google/workspace', { timeMin, timeMax }, { action: 'calendar.list' });
    }

    /**
     * Create a calendar event
     */
    async createCalendarEvent(eventData) {
      return this.getApiClient().post('/api/google/workspace', eventData, { action: 'calendar.create' });
    }

    /**
     * Read a Gmail message
     */
    async readGmail(messageId) {
      return this.getApiClient().post('/api/google/workspace', { messageId }, { action: 'gmail.read' });
    }

    /**
     * Search Gmail
     */
    async searchGmail(query) {
      return this.getApiClient().post('/api/google/workspace', { query }, { action: 'gmail.search' });
    }
  }

  window.JarvisGoogle = new GoogleWorkspaceService();
})();
