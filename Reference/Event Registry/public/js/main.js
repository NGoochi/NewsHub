// Main application initialization and common functionality
class App {
    constructor() {
        this.initializeApp();
    }

    initializeApp() {
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.showWelcomeMessage();
        });
    }

    setupEventListeners() {
        // Add any additional event listeners here if needed
        console.log('App initialized successfully');
    }

    showWelcomeMessage() {
        if (typeof showInfo === 'function') {
            showInfo('Welcome! Use the Fetch Articles button to retrieve articles from the Event Registry API.');
        }
    }

    // Utility function to check if all required APIs are loaded
    checkDependencies() {
        const dependencies = {
            'Event Registry API': typeof eventRegistryAPI !== 'undefined',
            'Google Sheets API': typeof sheetsAPI !== 'undefined'
        };

        console.log('Dependencies status:', dependencies);
        return dependencies;
    }

    // Global error handler
    handleGlobalError(error) {
        console.error('Global error caught:', error);
        if (typeof showError === 'function') {
            showError(`An unexpected error occurred: ${error.message}`);
        }
    } 

    // Initialize error handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(new Error(event.reason));
        });
    }
}

// Initialize the application
const app = new App();

// Setup global error handling
app.setupErrorHandling();

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}

// Google Sheets functions
async function loadServiceAccountKey() {
    const fileInput = document.getElementById('serviceAccountKey');
    const statusDiv = document.getElementById('sheetsStatus');
    
    if (fileInput.files.length === 0) {
        statusDiv.innerHTML = '<div class="error">Please select a service account key file</div>';
        return;
    }
    
    const file = fileInput.files[0];
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        statusDiv.innerHTML = '<div class="error">Please select a valid JSON file</div>';
        return;
    }
    
    statusDiv.innerHTML = '<div class="info">Loading service account key...</div>';
    
    try {
        const success = await sheetsAPI.loadServiceAccountKeyFromFile(file);
        if (success) {
            statusDiv.innerHTML = '<div class="success">Service account key loaded successfully!</div>';
        } else {
            statusDiv.innerHTML = '<div class="error">Failed to load service account key</div>';
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="error">Error loading service account key: ${error.message}</div>`;
    }
}

async function testSheetsConnection() {
    const button = document.getElementById('testSheetsConnection');
    const statusDiv = document.getElementById('sheetsStatus');
    
    button.disabled = true;
    statusDiv.innerHTML = '<div class="info">Testing connection...</div>';
    
    try {
        const result = await sheetsAPI.testConnection();
        if (result.success) {
            statusDiv.innerHTML = `<div class="success">${result.message}</div>`;
        } else {
            statusDiv.innerHTML = `<div class="error">${result.message}</div>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="error">Connection test failed: ${error.message}</div>`;
    } finally {
        button.disabled = false;
    }
}

async function readFromGoogleSheets() {
    const button = document.getElementById('readFromSheets');
    const statusDiv = document.getElementById('sheetsStatus');
    const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
    const range = document.getElementById('sheetRange').value.trim();
    
    if (!spreadsheetId) {
        statusDiv.innerHTML = '<div class="error">Please enter a Spreadsheet ID</div>';
        return;
    }
    
    if (!range) {
        statusDiv.innerHTML = '<div class="error">Please enter a Sheet Range</div>';
        return;
    }
    
    button.disabled = true;
    statusDiv.innerHTML = '<div class="info">Reading from Google Sheets...</div>';
    
    try {
        const data = await sheetsAPI.readFromSheet(spreadsheetId, range);
        
        if (data && data.length > 0) {
            let html = `<div class="success">Successfully read ${data.length} rows from Google Sheets</div>`;
            html += '<div class="stats">Sheet Data:</div>';
            html += '<div class="article">';
            
            data.forEach((row, rowIndex) => {
                html += `<div style="margin-bottom: 10px;"><strong>Row ${rowIndex + 1}:</strong> ${row.join(' | ')}</div>`;
            });
            
            html += '</div>';
            statusDiv.innerHTML = html;
        } else {
            statusDiv.innerHTML = '<div class="info">No data found in the specified range</div>';
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="error">Failed to read from Google Sheets: ${error.message}</div>`;
    } finally {
        button.disabled = false;
    }
}

// Configuration Management Functions
function showCurrentConfiguration() {
    const configDiv = document.getElementById('currentConfig');
    if (!configDiv) return;
    
    try {
        // Format the configuration for display
        const formattedConfig = JSON.stringify(CONFIG, null, 2);
        configDiv.innerHTML = `<pre>${formattedConfig}</pre>`;
    } catch (error) {
        configDiv.innerHTML = `<div class="error">Error displaying configuration: ${error.message}</div>`;
    }
}

function showConfigurationEditor() {
    const configDiv = document.getElementById('currentConfig');
    if (!configDiv) return;
    
    try {
        // Create editable form for configuration
        let html = '<form id="configForm">';
        html += '<h4>Edit Configuration</h4>';
        
        // Event Registry API settings
        html += '<div class="config-group">';
        html += '<h5>Event Registry API</h5>';
        html += `<label>API Key: <input type="text" id="apiKey" value="${CONFIG.EVENT_REGISTRY.API_KEY}" /></label><br>`;
        html += `<label>Articles Per Page: <input type="number" id="articlesPerPage" value="${CONFIG.EVENT_REGISTRY.ARTICLES_PER_PAGE}" /></label><br>`;
        html += `<label>Request Delay (ms): <input type="number" id="requestDelay" value="${CONFIG.EVENT_REGISTRY.REQUEST_DELAY_MS}" /></label>`;
        html += '</div>';
        
        // Google Sheets settings
        html += '<div class="config-group">';
        html += '<h5>Google Sheets</h5>';
        html += `<label>Spreadsheet ID: <input type="text" id="spreadsheetId" value="${CONFIG.GOOGLE_SHEETS.SPREADSHEET_ID}" /></label><br>`;
        html += `<label>Sources Range: <input type="text" id="sourcesRange" value="${CONFIG.GOOGLE_SHEETS.RANGES.SOURCES}" /></label><br>`;
        html += `<label>Concepts Range: <input type="text" id="conceptsRange" value="${CONFIG.GOOGLE_SHEETS.RANGES.CONCEPTS}" /></label><br>`;
        html += `<label>Date Range: <input type="text" id="dateRange" value="${CONFIG.GOOGLE_SHEETS.RANGES.DATE_RANGE}" /></label><br>`;
        html += `<label>Chunk Size: <input type="number" id="chunkSize" value="${CONFIG.GOOGLE_SHEETS.OUTPUT.CHUNK_SIZE}" /></label><br>`;
        html += `<label>Max Cell Length: <input type="number" id="maxCellLength" value="${CONFIG.GOOGLE_SHEETS.OUTPUT.MAX_CELL_LENGTH}" /></label>`;
        html += '</div>';
        
        // Performance settings
        html += '<div class="config-group">';
        html += '<h5>Performance</h5>';
        html += `<label>Max Concurrent Requests: <input type="number" id="maxConcurrent" value="${CONFIG.PERFORMANCE.MAX_CONCURRENT_REQUESTS}" /></label><br>`;
        html += `<label>Request Timeout (ms): <input type="number" id="requestTimeout" value="${CONFIG.PERFORMANCE.REQUEST_TIMEOUT_MS}" /></label>`;
        html += '</div>';
        
        html += '<div class="button-group">';
        html += '<button type="button" onclick="saveConfiguration()">Save Changes</button>';
        html += '<button type="button" onclick="showCurrentConfiguration()">Cancel</button>';
        html += '</div>';
        html += '</form>';
        
        configDiv.innerHTML = html;
    } catch (error) {
        configDiv.innerHTML = `<div class="error">Error creating configuration editor: ${error.message}</div>`;
    }
}

function saveConfiguration() {
    try {
        // Get values from form inputs
        const newConfig = {
            EVENT_REGISTRY: {
                API_KEY: document.getElementById('apiKey').value,
                ARTICLES_PER_PAGE: parseInt(document.getElementById('articlesPerPage').value),
                REQUEST_DELAY_MS: parseInt(document.getElementById('requestDelay').value)
            },
            GOOGLE_SHEETS: {
                SPREADSHEET_ID: document.getElementById('spreadsheetId').value,
                RANGES: {
                    SOURCES: document.getElementById('sourcesRange').value,
                    CONCEPTS: document.getElementById('conceptsRange').value,
                    DATE_RANGE: document.getElementById('dateRange').value
                },
                OUTPUT: {
                    CHUNK_SIZE: parseInt(document.getElementById('chunkSize').value),
                    MAX_CELL_LENGTH: parseInt(document.getElementById('maxCellLength').value)
                }
            },
            PERFORMANCE: {
                MAX_CONCURRENT_REQUESTS: parseInt(document.getElementById('maxConcurrent').value),
                REQUEST_TIMEOUT_MS: parseInt(document.getElementById('requestTimeout').value)
            }
        };
        
        // Update the configuration
        Object.assign(CONFIG, newConfig);
        
        // Update the instances
        if (typeof eventRegistryAPI !== 'undefined') {
            eventRegistryAPI.apiKey = CONFIG.EVENT_REGISTRY.API_KEY;
            eventRegistryAPI.articlesPerPage = CONFIG.EVENT_REGISTRY.ARTICLES_PER_PAGE;
            eventRegistryAPI.sheetId = CONFIG.GOOGLE_SHEETS.SPREADSHEET_ID;
            eventRegistryAPI.dateRangeRange = CONFIG.GOOGLE_SHEETS.RANGES.DATE_RANGE;
            eventRegistryAPI.conceptsRange = CONFIG.GOOGLE_SHEETS.RANGES.CONCEPTS;
        }
        
        if (typeof sourceBasedAPI !== 'undefined') {
            sourceBasedAPI.apiKey = CONFIG.EVENT_REGISTRY.API_KEY;
            sourceBasedAPI.articlesPerPage = CONFIG.EVENT_REGISTRY.ARTICLES_PER_PAGE;
            sourceBasedAPI.sheetId = CONFIG.GOOGLE_SHEETS.SPREADSHEET_ID;
            sourceBasedAPI.sourcesRange = CONFIG.GOOGLE_SHEETS.RANGES.SOURCES;
            sourceBasedAPI.conceptsRange = CONFIG.GOOGLE_SHEETS.RANGES.CONCEPTS;
            sourceBasedAPI.chunkSize = CONFIG.GOOGLE_SHEETS.OUTPUT.CHUNK_SIZE;
        }
        
        // Show success message and display updated config
        showSuccess('Configuration updated successfully!');
        showCurrentConfiguration();
        
    } catch (error) {
        showError(`Error saving configuration: ${error.message}`);
    }
}

function resetToDefaults() {
    if (confirm('Are you sure you want to reset all configuration to default values? This cannot be undone.')) {
        try {
            // Reload the page to reset to defaults
            location.reload();
        } catch (error) {
            showError(`Error resetting configuration: ${error.message}`);
        }
    }
}

// Initialize configuration display when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Show current configuration after a short delay
    setTimeout(() => {
        if (document.getElementById('currentConfig')) {
            showCurrentConfiguration();
        }
    }, 1000);
});
