// API Client for Express.js backend
class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
    }

    async fetchArticles(requestBody) {
        try {
            const response = await fetch(`${this.baseURL}/api/event-registry/fetch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestBody: JSON.stringify(requestBody) })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API fetch error:', error);
            throw error;
        }
    }

    async uploadServiceAccountKey(file) {
        try {
            const formData = new FormData();
            formData.append('serviceAccountKey', file);

            const response = await fetch(`${this.baseURL}/api/sheets/upload-key`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Service account key upload error:', error);
            throw error;
        }
    }

    async fetchSources(sheetId, range) {
        try {
            const response = await fetch(`${this.baseURL}/api/sheets/sources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sheetId, range })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Sources fetch error:', error);
            throw error;
        }
    }

    async writeArticlesToSheets(articles, sheetId) {
        try {
            const response = await fetch(`${this.baseURL}/api/sheets/write-articles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ articles, sheetId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Write articles error:', error);
            throw error;
        }
    }
}

// Global API client instance
const apiClient = new APIClient();
