// Central Configuration File
// All configurable variables and settings for the Event Registry API application

const CONFIG = {
    // Event Registry API Configuration
    EVENT_REGISTRY: {
        API_URL: 'https://eventregistry.org/api/v1/article/getArticles',
        API_KEY: '64095ae1-902d-427c-9ddf-f9e058ae7d85',
        ARTICLES_PER_PAGE: 100,
        REQUEST_DELAY_MS: 100 // Delay between API requests to avoid overwhelming the API
    },

    // Google Sheets Configuration
    GOOGLE_SHEETS: {
        SPREADSHEET_ID: '1_Pq2GmZ3ed8u2EPTlDL9GtQAji30SNz7GFfgTPw2Tz0',
        REQUEST_BUILDER_SOURCES_SHEET_ID: '1plBgMb9lADx3LneriMydEYvq2N4zDawUCYpbe0lYPDY',
        RANGES: {
            SOURCES: 'Settings!B2:B',
            CONCEPTS: 'Settings!E2:E',
            DATE_RANGE: 'Settings!I2:I3'
        },
        OUTPUT: {
            DEFAULT_SHEET: 'Sheet1',
            COLUMNS: ['News Outlet', 'Article Title', 'Authors', 'URL', 'Content', 'Date Written'],
            CHUNK_SIZE: 30, // Number of articles to write to sheets at once
            MAX_CELL_LENGTH: 50000 // Maximum characters per cell before truncation
        }
    },

    // Date Configuration
    DATES: {
        DEFAULT_RANGE_DAYS: 1, // Default to 1 day (previous day only)
        TIMEZONE: 'UTC', // Timezone for date operations
        DATE_FORMATS: ['YYYY-MM-DD', 'MM/DD/YYYY', 'MM-DD-YYYY', 'DD/MM/YYYY']
    },

    // UI Configuration
    UI: {
        LOADING_TIMEOUT_MS: 5000, // Maximum time to wait for Sheets API
        MAX_ATTEMPTS: 50, // Maximum attempts to wait for API readiness
        REFRESH_DELAY_MS: 1000, // Delay before showing configuration
        DISPLAY_ITEMS_PER_PAGE: 10 // Number of articles to show per page in UI
    },

    // Fallback Configuration
    FALLBACKS: {
        CONCEPTS: [
            "http://en.wikipedia.org/wiki/Climate_change"
        ],
        DATE_RANGE_DAYS: 1, // Fallback to previous day only
        SHEET_NAME: 'Sheet1' // Fallback sheet name if month sheet creation fails
    },

    // Error Messages
    MESSAGES: {
        ERRORS: {
            SHEETS_API_UNAVAILABLE: 'Google Sheets API not available. Please check your service account key.',
            NO_CONCEPTS_LOADED: 'No concepts loaded from sheet. Using fallback concepts.',
            NO_DATE_RANGE: 'No date range loaded from sheet. Using fallback date range.',
            SHEET_CREATION_FAILED: 'Failed to create month sheet. Please create manually.',
            API_CALL_FAILED: 'Event Registry API call failed. Check your internet connection and API key.',
            INVALID_DATE_FORMAT: 'Invalid date format in sheet. Expected YYYY-MM-DD format.',
            CELL_TOO_LONG: 'Article content too long for Google Sheets cell.'
        },
        SUCCESS: {
            ARTICLES_FETCHED: 'Successfully fetched articles from Event Registry.',
            ARTICLES_WRITTEN: 'Successfully wrote articles to Google Sheets.',
            SHEET_CREATED: 'Successfully created new month sheet.',
            DATA_REFRESHED: 'Data refreshed from Google Sheets.'
        },
        INFO: {
            LOADING_FROM_SHEET: 'Loading configuration from Google Sheets...',
            WAITING_FOR_API: 'Waiting for Google Sheets API to be ready...',
            USING_FALLBACK: 'Using fallback configuration due to sheet reading error.'
        }
    },

    // Validation Rules
    VALIDATION: {
        MIN_CONCEPT_LENGTH: 10, // Minimum length for concept URIs
        MAX_CONCEPT_LENGTH: 500, // Maximum length for concept URIs
        MIN_DATE_LENGTH: 8, // Minimum length for date strings
        MAX_DATE_LENGTH: 10, // Maximum length for date strings
        VALID_URL_PATTERNS: [
            /^https?:\/\/en\.wikipedia\.org\/wiki\//,
            /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\//
        ]
    },

    // Performance Settings
    PERFORMANCE: {
        MAX_CONCURRENT_REQUESTS: 3, // Maximum concurrent API requests
        REQUEST_TIMEOUT_MS: 30000, // Timeout for API requests (30 seconds)
        MAX_RETRIES: 3, // Maximum retry attempts for failed requests
        RETRY_DELAY_MS: 1000 // Delay between retry attempts
    },

    // Logging Configuration
    LOGGING: {
        ENABLE_CONSOLE_LOGS: true, // Enable console.log statements
        ENABLE_DEBUG_LOGS: true, // Enable detailed debug logging
        LOG_LEVEL: 'INFO', // Log level: DEBUG, INFO, WARN, ERROR
        MAX_LOG_ENTRIES: 1000 // Maximum number of log entries to keep in memory
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    // Browser environment - make CONFIG globally available
    window.CONFIG = CONFIG;
}

// Helper functions for configuration
const ConfigHelper = {
    // Get a nested configuration value
    get(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], CONFIG);
    },

    // Set a nested configuration value
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, CONFIG);
        target[lastKey] = value;
    },

    // Check if a configuration value exists
    has(path) {
        return this.get(path) !== undefined;
    },

    // Get configuration with fallback
    getWithFallback(path, fallback) {
        const value = this.get(path);
        return value !== undefined ? value : fallback;
    },

    // Validate configuration
    validate() {
        const errors = [];
        
        // Check required fields
        if (!CONFIG.EVENT_REGISTRY.API_KEY) {
            errors.push('Event Registry API key is required');
        }
        
        if (!CONFIG.GOOGLE_SHEETS.SPREADSHEET_ID) {
            errors.push('Google Sheets spreadsheet ID is required');
        }
        
        if (!CONFIG.GOOGLE_SHEETS.RANGES.CONCEPTS) {
            errors.push('Concepts range is required');
        }
        
        if (!CONFIG.GOOGLE_SHEETS.RANGES.DATE_RANGE) {
            errors.push('Date range is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // Get current configuration as JSON
    toJSON() {
        return JSON.stringify(CONFIG, null, 2);
    },

    // Update configuration from external source
    updateFromExternal(newConfig) {
        try {
            const parsed = typeof newConfig === 'string' ? JSON.parse(newConfig) : newConfig;
            Object.assign(CONFIG, parsed);
            return { success: true, message: 'Configuration updated successfully' };
        } catch (error) {
            return { success: false, message: `Failed to update configuration: ${error.message}` };
        }
    }
};

// Export helper functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports.ConfigHelper = ConfigHelper;
} else {
    window.ConfigHelper = ConfigHelper;
}
