// Event Registry API functionality for Express.js
class EventRegistryAPI {
    constructor() {
        // Load configuration from central config file
        this.apiUrl = CONFIG.EVENT_REGISTRY.API_URL;
        this.apiKey = CONFIG.EVENT_REGISTRY.API_KEY;
        this.sheetId = CONFIG.GOOGLE_SHEETS.SPREADSHEET_ID;
        this.dateRangeRange = CONFIG.GOOGLE_SHEETS.RANGES.DATE_RANGE;
        this.conceptsRange = CONFIG.GOOGLE_SHEETS.RANGES.CONCEPTS;
        this.dateStart = null;
        this.dateEnd = null;
        this.concepts = []; // Dynamic concepts from Google Sheets (optional)
        
        // Initialize pagination and caching
        this.currentPage = 1;
        this.articlesPerPage = CONFIG.EVENT_REGISTRY.ARTICLES_PER_PAGE;
        this.allArticles = [];
        this.totalResults = 0;
        this.isFetchingAll = false;
        
        // Optional: Wait for sheets API to be available, then load data
        // This is now optional since we're using manual request input
        this.waitForSheetsAPI();
    }

    // Wait for sheets API to be available, then load data (optional)
    async waitForSheetsAPI() {
        // Since we're now using manual request input, this is optional
        // Only attempt to load from sheets if the user wants to use the legacy functionality
        console.log('Sheets API loading is now optional. Using manual request input instead.');
        
        // Set default values for display purposes
        this.updateDateRange();
        this.updateDefaultConcepts();
        this.updateDateRangeDisplay();
    }

    // Load date range from Google Sheets
    async loadDateRangeFromSheet() {
        try {
            // Check if sheetsAPI is available
            if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
                console.log('Sheets API not available, using default date range');
                this.updateDateRange();
                this.updateDateRangeDisplay();
                return;
            }

            console.log(`Loading date range from sheet: ${this.sheetId}, range: ${this.dateRangeRange}`);
            console.log('SheetsAPI available:', typeof sheetsAPI);

            const tokenValid = await sheetsAPI.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            const dateRangeData = await sheetsAPI.readFromSheet(this.sheetId, this.dateRangeRange);
            
            if (dateRangeData && dateRangeData.length > 0) {
                const dateRow = dateRangeData[0];
                if (dateRow && dateRow.length >= 2) {
                    const startDate = dateRow[0];
                    const endDate = dateRow[1];
                    
                    if (this.isValidDateFormat(startDate) && this.isValidDateFormat(endDate)) {
                        this.dateStart = startDate;
                        this.dateEnd = endDate;
                        console.log('Loaded date range from sheet:', { startDate, endDate });
                    } else {
                        console.log('Invalid date format in sheet, using defaults');
                        this.updateDateRange();
                    }
                } else {
                    console.log('Insufficient data in date range sheet, using defaults');
                    this.updateDateRange();
                }
            } else {
                console.log('No date range data found in sheet, using defaults');
                this.updateDateRange();
            }
        } catch (error) {
            console.error('Error loading date range from sheet:', error);
            console.log('Using default date range due to error');
            this.updateDateRange();
        }
        
        this.updateDateRangeDisplay();
    }

    // Load concept URIs from Google Sheets
    async loadConceptsFromSheet() {
        try {
            // Check if sheetsAPI is available
            if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
                console.log('Sheets API not available, using default concepts');
                this.updateDefaultConcepts();
                return;
            }

            console.log(`Loading concepts from sheet: ${this.sheetId}, range: ${this.conceptsRange}`);
            
            const tokenValid = await sheetsAPI.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            const conceptsData = await sheetsAPI.readFromSheet(this.sheetId, this.conceptsRange);
            
            if (conceptsData && conceptsData.length > 0) {
                this.concepts = conceptsData.map(row => row[0]).filter(concept => concept && concept.trim());
                console.log('Loaded concepts from sheet:', this.concepts);
            } else {
                console.log('No concepts found in sheet, using defaults');
                this.updateDefaultConcepts();
            }
        } catch (error) {
            console.error('Error loading concepts from sheet:', error);
            console.log('Using default concepts due to error');
            this.updateDefaultConcepts();
        }
    }

    // Update default concepts (fallback)
    updateDefaultConcepts() {
        this.concepts = CONFIG.FALLBACKS.CONCEPTS;
        console.log('Using default concepts:', this.concepts);
    }

    // Validate date format (YYYY-MM-DD)
    isValidDateFormat(dateString) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return dateRegex.test(dateString);
    }

    // Update date range with current month
    updateDateRange() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        this.dateStart = startOfMonth.toISOString().split('T')[0];
        this.dateEnd = endOfMonth.toISOString().split('T')[0];
        
        console.log('Updated date range:', { start: this.dateStart, end: this.dateEnd });
    }

    // Update date range display in UI
    updateDateRangeDisplay() {
        // This would update UI elements if they exist
        console.log('Date range display updated:', { start: this.dateStart, end: this.dateEnd });
    }

    // Refresh date range from sheet (public method)
    async refreshDateRange() {
        await this.loadDateRangeFromSheet();
    }

    // Refresh concepts from sheet (public method)
    async refreshConcepts() {
        await this.loadConceptsFromSheet();
    }

    // Main method to fetch articles using manual request body
    async fetchArticles() {
        const button = document.getElementById('fetchArticles');
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loadingText');
        const results = document.getElementById('results');
        const requestBodyTextarea = document.getElementById('requestBody');
        
        // Get the manually pasted request body
        const requestBodyText = requestBodyTextarea.value.trim();
        
        if (!requestBodyText) {
            results.innerHTML = `
                <div class="error">
                    <strong>Error:</strong> Please enter a request body in the textarea above.
                </div>
            `;
            return;
        }
        
        // Validate JSON format
        let requestBody;
        try {
            requestBody = JSON.parse(requestBodyText);
        } catch (error) {
            results.innerHTML = `
                <div class="error">
                    <strong>Error:</strong> Invalid JSON format in request body. Please check your syntax.
                    <br><br>
                    <strong>JSON Error:</strong> ${error.message}
                </div>
            `;
            return;
        }
        
        // Reset pagination and caching for new search
        this.currentPage = 1;
        this.allArticles = [];
        this.totalResults = 0;
        this.isFetchingAll = false;
        
        // Show loading state
        button.disabled = true;
        loading.style.display = 'block';
        loadingText.textContent = 'Fetching articles from Event Registry...';
        results.innerHTML = '';
        
        try {
            // Start fetching all articles using the manual request body
            await this.fetchAllArticlesWithManualRequest(requestBody);
        } catch (error) {
            console.error('Error fetching articles:', error);
            results.innerHTML = `
                <div class="error">
                    <strong>Error:</strong> ${error.message}
                    <br><br>
                    <strong>Note:</strong> This API call may be blocked by CORS policy when running locally. 
                    To test this properly, you may need to:
                    <ul>
                        <li>Run this from a web server instead of opening the file directly</li>
                        <li>Use a CORS browser extension</li>
                        <li>Test the API call using a tool like Postman first</li>
                    </ul>
                </div>
            `;
            
            // Show error in preview panel
            if (typeof showPreviewError === 'function') {
                showPreviewError(`Error fetching articles: ${error.message}`);
            }
        } finally {
            // Hide loading state
            button.disabled = false;
            loading.style.display = 'none';
        }
    }

    // Fetch all articles using manually provided request body
    async fetchAllArticlesWithManualRequest(baseRequestBody) {
        const loadingText = document.getElementById('loadingText');
        let hasMorePages = true;
        
        while (hasMorePages) {
            // Update loading text to show current page
            loadingText.textContent = `Fetching page ${this.currentPage}...`;
            
            // Create request body for current page
            const requestBody = {
                ...baseRequestBody,
                articlesPage: this.currentPage,
                articlesCount: this.articlesPerPage
            };
            
            console.log('API request body:', JSON.stringify(requestBody, null, 2));
            
            try {
                // Use Express API client instead of direct Event Registry API
                const data = await apiClient.fetchArticles(requestBody);
                
                if (data.articles && data.articles.results) {
                    const articles = data.articles.results;
                    this.allArticles.push(...articles);
                    this.totalResults = data.articles.totalResults || this.allArticles.length;
                    
                    console.log(`Fetched ${articles.length} articles from page ${this.currentPage}`);
                    console.log(`Total articles so far: ${this.allArticles.length}`);
                    
                    // Check if there are more pages
                    hasMorePages = articles.length === this.articlesPerPage && 
                                   this.allArticles.length < this.totalResults;
                    
                    if (hasMorePages) {
                        this.currentPage++;
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } else {
                    console.log('No articles found in response');
                    hasMorePages = false;
                }
            } catch (error) {
                console.error(`Error fetching page ${this.currentPage}:`, error);
                throw error;
            }
        }
        
        // Display all fetched articles
        this.displayAllResults();
    }

    // Fetch all articles using pagination (legacy method for backward compatibility)
    async fetchAllArticles() {
        const loadingText = document.getElementById('loadingText');
        let hasMorePages = true;
        
        // Ensure we have concepts loaded
        if (this.concepts.length === 0) {
            await this.loadConceptsFromSheet();
        }
        
        while (hasMorePages) {
            // Update loading text to show current page
            loadingText.textContent = `Fetching page ${this.currentPage}...`;
            
            // Create request body for current page
            const requestBody = {
                query: {
                    $query: {
                        $and: [
                            {
                                conceptUri: this.concepts
                            },
                            {
                                dateStart: this.dateStart,
                                dateEnd: this.dateEnd
                            }
                        ]
                    }
                },
                resultType: "articles",
                articlesPage: this.currentPage,
                articlesCount: this.articlesPerPage,
                articlesSortBy: "date",
                apiKey: this.apiKey
            };
            
            console.log('API request body:', JSON.stringify(requestBody, null, 2));
            
            try {
                // Use Express API client instead of direct Event Registry API
                const data = await apiClient.fetchArticles(requestBody);
                
                if (data.articles && data.articles.results) {
                    const articles = data.articles.results;
                    this.allArticles.push(...articles);
                    this.totalResults = data.articles.totalResults || this.allArticles.length;
                    
                    console.log(`Fetched ${articles.length} articles from page ${this.currentPage}`);
                    console.log(`Total articles so far: ${this.allArticles.length}`);
                    
                    // Check if there are more pages
                    hasMorePages = articles.length === this.articlesPerPage && 
                                   this.allArticles.length < this.totalResults;
                    
                    if (hasMorePages) {
                        this.currentPage++;
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } else {
                    console.log('No articles found in response');
                    hasMorePages = false;
                }
            } catch (error) {
                console.error(`Error fetching page ${this.currentPage}:`, error);
                throw error;
            }
        }
        
        // Display all fetched articles
        this.displayAllResults();
    }

    // Display results in the UI
    displayResults(data) {
        const results = document.getElementById('results');
        
        if (data.articles && data.articles.results && data.articles.results.length > 0) {
            const articles = data.articles.results;
            
            let html = `
                <div class="success">
                    <strong>Success!</strong> Found ${articles.length} articles
                </div>
                <div class="stats">
                    <strong>Total Results:</strong> ${data.articles.totalResults || articles.length}
                </div>
            `;
            
            articles.forEach((article, index) => {
                html += `
                    <div class="article">
                        <h4>${article.title || 'No title available'}</h4>
                        <div class="article-meta">
                            <strong>Date:</strong> ${article.dateTime || article.date || 'Unknown date'} | 
                            <strong>Source:</strong> ${article.source?.title || article.source || 'Unknown source'}
                            ${this.extractAuthors(article) !== 'No Author Available' ? ` | <strong>Author:</strong> ${this.extractAuthors(article)}` : ''}
                        </div>
                        <div class="article-body">
                            ${article.body ? article.body : 
                              article.summary ? article.summary : 
                              'No content available'}
                        </div>
                        ${article.url ? `
                            <div class="article-url">
                                <a href="${article.url}" target="_blank">Read full article →</a>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            results.innerHTML = html;
            
            // Update article preview panel if it exists
            if (typeof updateArticlePreview === 'function') {
                updateArticlePreview(articles);
            }
        } else {
            results.innerHTML = `
                <div class="error">
                    <strong>No articles found</strong> for the specified criteria.
                    <br><br>
                    Response data: <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
            
            // Update article preview panel with empty results
            if (typeof updateArticlePreview === 'function') {
                updateArticlePreview([]);
            }
        }
    }

    // Display all cached articles
    displayAllResults() {
        const results = document.getElementById('results');
        
        if (this.allArticles.length > 0) {
            let html = `
                <div class="success">
                    <strong>Success!</strong> Fetched ${this.allArticles.length} articles from ${this.currentPage} page(s)
                </div>
                <div class="stats">
                    <strong>Total Results Available:</strong> ${this.totalResults}
                    <br>
                    <strong>Articles Retrieved:</strong> ${this.allArticles.length}
                    <br>
                    <strong>Pages Fetched:</strong> ${this.currentPage}
                </div>
            `;
            
            this.allArticles.forEach((article, index) => {
                html += `
                    <div class="article">
                        <h4>${article.title || 'No title available'}</h4>
                        <div class="article-meta">
                            <strong>Date:</strong> ${article.dateTime || article.date || 'Unknown date'} | 
                            <strong>Source:</strong> ${article.source?.title || article.source || 'Unknown source'}
                            ${this.extractAuthors(article) !== 'No Author Available' ? ` | <strong>Author:</strong> ${this.extractAuthors(article)}` : ''}
                        </div>
                        <div class="article-body">
                            ${article.body ? article.body : 
                              article.summary ? article.summary : 
                              'No content available'}
                        </div>
                        ${article.url ? `
                            <div class="article-url">
                                <a href="${article.url}" target="_blank">Read full article →</a>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            results.innerHTML = html;
            
            // Update article preview panel if it exists
            if (typeof updateArticlePreview === 'function') {
                updateArticlePreview(this.allArticles);
            }
        } else {
            results.innerHTML = `
                <div class="error">
                    <strong>No articles found</strong> for the specified criteria.
                </div>
            `;
            
            // Update article preview panel with empty results
            if (typeof updateArticlePreview === 'function') {
                updateArticlePreview([]);
            }
        }
    }

    // Update API configuration
    updateConfig(newApiKey, newDateStart, newDateEnd) {
        if (newApiKey) this.apiKey = newApiKey;
        if (newDateStart) this.dateStart = newDateStart;
        if (newDateEnd) this.dateEnd = newDateEnd;
        
        console.log('Updated API configuration:', {
            apiKey: this.apiKey ? '***' : 'Not set',
            dateStart: this.dateStart,
            dateEnd: this.dateEnd
        });
    }

    // Extract authors from article data
    extractAuthors(article) {
        if (article.authors && Array.isArray(article.authors) && article.authors.length > 0) {
            return article.authors.map(author => author.name || author).join(', ');
        }
        return 'No Author Available';
    }

    // Write articles to Google Sheets
    async writeArticlesToSheets(articles) {
        try {
            if (!articles || articles.length === 0) {
                throw new Error('No articles to write to sheets');
            }

            // Check if sheetsAPI is available
            if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
                throw new Error('Google Sheets API not available. Please load your service account key.');
            }

            const tokenValid = await sheetsAPI.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token for Google Sheets');
            }

            // Prepare data for sheets
            const articlesData = this.prepareArticlesForSheets(articles);
            
            // Get current month sheet name
            const sheetName = this.getCurrentMonthSheetName();
            
            // Ensure the sheet exists
            await this.ensureMonthSheetExists(sheetName);
            
            // Find the next empty row
            const nextRow = await this.findNextEmptyRow(sheetName);
            
            // Write the data
            const range = `${sheetName}!A${nextRow}`;
            await sheetsAPI.writeToSheet(this.sheetId, range, articlesData);
            
            console.log(`Successfully wrote ${articles.length} articles to ${sheetName} starting at row ${nextRow}`);
            
            return {
                success: true,
                message: `Successfully wrote ${articles.length} articles to ${sheetName}`,
                sheetName: sheetName,
                startRow: nextRow,
                articlesCount: articles.length
            };
            
        } catch (error) {
            console.error('Error writing articles to Google Sheets:', error);
            throw error;
        }
    }

    // Get current month and year for sheet naming
    getCurrentMonthSheetName() {
        const now = new Date();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[now.getMonth()];
        const year = now.getFullYear();
        return `${monthName}_${year}`;
    }

    // Ensure a month sheet exists
    async ensureMonthSheetExists(sheetName) {
        try {
            // Check if sheetsAPI is available
            if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
                throw new Error('Google Sheets API not available');
            }

            // Try to read from the sheet to see if it exists
            try {
                await sheetsAPI.readFromSheet(this.sheetId, `${sheetName}!A1`);
                console.log(`Sheet ${sheetName} already exists`);
            } catch (error) {
                // Sheet doesn't exist, create it
                console.log(`Creating new sheet: ${sheetName}`);
                await sheetsAPI.createSheet(this.sheetId, sheetName);
                
                // Add headers
                const headers = ['News Outlet', 'Article Title', 'Authors', 'URL', 'Content', 'Date Written'];
                await sheetsAPI.writeToSheet(this.sheetId, `${sheetName}!A1:F1`, [headers]);
                console.log(`Created sheet ${sheetName} with headers`);
            }
        } catch (error) {
            console.error(`Error ensuring month sheet exists: ${error.message}`);
            throw error;
        }
    }

    // Find the next empty row in a sheet
    async findNextEmptyRow(sheetName) {
        try {
            // Check if sheetsAPI is available
            if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
                return 1; // Fallback to row 1
            }

            // Start checking from row 1 and work our way down
            let currentRow = 1;
            const maxRowsToCheck = 1000; // Reasonable limit
            
            while (currentRow <= maxRowsToCheck) {
                try {
                    const range = `${sheetName}!A${currentRow}`;
                    const data = await sheetsAPI.readFromSheet(this.sheetId, range);
                    
                    // If we get data and it's not empty, move to next row
                    if (data && data.length > 0 && data[0] && data[0].length > 0 && data[0][0]) {
                        currentRow++;
                    } else {
                        // This row is empty
                        return currentRow;
                    }
                } catch (error) {
                    // If we can't read the row, it might not exist yet, so this is our empty row
                    return currentRow;
                }
            }
            
            // If we've checked too many rows, assume the next empty row is at the end
            return currentRow;
            
        } catch (error) {
            console.error(`Error finding next empty row: ${error.message}`);
            // Fallback: return row 1 if we can't determine the next empty row
            return 1;
        }
    }

    // Check if a sheet has existing data
    async hasExistingData(sheetName) {
        try {
            // Check if sheetsAPI is available
            if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
                return false; // Assume no existing data if API not available
            }

            // Try to read the first row to see if there's data
            const data = await sheetsAPI.readFromSheet(this.sheetId, `${sheetName}!A1:F1`);
            return data && data.length > 0 && data[0] && data[0].length > 0;
        } catch (error) {
            console.error(`Error checking for existing data: ${error.message}`);
            return false; // Assume no existing data if we can't check
        }
    }

    // Prepare articles data for Google Sheets
    prepareArticlesForSheets(articles) {
        // Header row
        const headerRow = ['News Outlet', 'Article Title', 'Authors', 'URL', 'Content', 'Date Written'];
        
        // Process articles
        const articleRows = articles.map(article => {
            // Extract source name
            const sourceName = article.source?.title || article.source || 'Unknown Source';
            
            // Extract title
            const title = article.title || 'No Title';
            
            // Extract authors
            const authors = this.extractAuthors(article);
            
            // Extract URL
            const url = article.url || '';
            
            // Extract content (body or summary)
            const content = article.body || article.summary || 'No content available';
            
            // Extract date
            const date = article.dateTime || article.date || new Date().toISOString().split('T')[0];
            
            return [sourceName, title, authors, url, content, date];
        });
        
        // Return all rows (header + articles)
        return [headerRow, ...articleRows];
    }
}

// Initialize the API instance
const eventRegistryAPI = new EventRegistryAPI();

// Global function to fetch articles
function fetchArticles() {
    eventRegistryAPI.fetchArticles();
}

// Global function to refresh date range from sheet
async function refreshDateRange() {
    await eventRegistryAPI.refreshDateRange();
}

// Global function to refresh concepts from sheet
async function refreshConcepts() {
    await eventRegistryAPI.refreshConcepts();
}

// Global function to validate request body
function validateRequest() {
    const requestBodyTextarea = document.getElementById('requestBody');
    const results = document.getElementById('results');
    
    const requestBodyText = requestBodyTextarea.value.trim();
    
    if (!requestBodyText) {
        results.innerHTML = `
            <div class="error">
                <strong>Validation Error:</strong> Request body is empty.
                <br><br>
                <strong>Tip:</strong> Please enter a JSON request body to validate.
            </div>
        `;
        return;
    }
    
    try {
        const parsedBody = JSON.parse(requestBodyText);
        results.innerHTML = `
            <div class="success">
                <strong>Validation Success!</strong> The JSON request body is valid.
                <br><br>
                <strong>Parsed Structure:</strong>
                <pre>${JSON.stringify(parsedBody, null, 2)}</pre>
            </div>
        `;
    } catch (error) {
        results.innerHTML = `
            <div class="error">
                <strong>Validation Error:</strong> Invalid JSON format.
                <br><br>
                <strong>JSON Error:</strong> ${error.message}
                <br><br>
                <strong>Tip:</strong> Make sure your JSON is properly formatted with correct quotes, commas, and brackets.
            </div>
        `;
    }
}

// Global function to clear the request body
function clearRequest() {
    const requestBodyTextarea = document.getElementById('requestBody');
    requestBodyTextarea.value = '';
    
    const results = document.getElementById('results');
    results.innerHTML = '';
}

// Global function to show current configuration
function showCurrentConfiguration() {
    const results = document.getElementById('results');
    
    const config = {
        apiUrl: eventRegistryAPI.apiUrl,
        apiKey: eventRegistryAPI.apiKey ? '***' : 'Not set',
        sheetId: eventRegistryAPI.sheetId,
        dateStart: eventRegistryAPI.dateStart,
        dateEnd: eventRegistryAPI.dateEnd,
        concepts: eventRegistryAPI.concepts,
        articlesPerPage: eventRegistryAPI.articlesPerPage,
        currentPage: eventRegistryAPI.currentPage,
        totalResults: eventRegistryAPI.totalResults,
        allArticlesCount: eventRegistryAPI.allArticles.length
    };
    
    results.innerHTML = `
        <div class="info">
            <strong>Current Configuration:</strong>
            <pre>${JSON.stringify(config, null, 2)}</pre>
        </div>
    `;
}

// Global function to fetch articles and write to sheets
async function fetchArticlesAndWriteToSheets() {
    const button = document.getElementById('fetchArticlesAndWriteToSheets');
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loadingText');
    const results = document.getElementById('results');
    const requestBodyTextarea = document.getElementById('requestBody');
    
    // Get the manually pasted request body
    const requestBodyText = requestBodyTextarea.value.trim();
    
    if (!requestBodyText) {
        results.innerHTML = `
            <div class="error">
                <strong>Error:</strong> Please enter a request body in the textarea above.
            </div>
        `;
        return;
    }
    
    // Validate JSON format
    let requestBody;
    try {
        requestBody = JSON.parse(requestBodyText);
    } catch (error) {
        results.innerHTML = `
            <div class="error">
                <strong>Error:</strong> Invalid JSON format in request body. Please check your syntax.
                <br><br>
                <strong>JSON Error:</strong> ${error.message}
            </div>
        `;
        return;
    }
    
    // Show loading state
    button.disabled = true;
    loading.style.display = 'block';
    loadingText.textContent = 'Fetching articles and writing to Google Sheets...';
    results.innerHTML = '';
    
    try {
        // First fetch articles
        await eventRegistryAPI.fetchAllArticlesWithManualRequest(requestBody);
        
        if (eventRegistryAPI.allArticles.length > 0) {
            // Then write to sheets
            loadingText.textContent = 'Writing articles to Google Sheets...';
            const writeResult = await eventRegistryAPI.writeArticlesToSheets(eventRegistryAPI.allArticles);
            
            results.innerHTML = `
                <div class="success">
                    <strong>Success!</strong> ${writeResult.message}
                    <br><br>
                    <strong>Details:</strong>
                    <ul>
                        <li>Sheet: ${writeResult.sheetName}</li>
                        <li>Starting Row: ${writeResult.startRow}</li>
                        <li>Articles Written: ${writeResult.articlesCount}</li>
                    </ul>
                </div>
            `;
        } else {
            results.innerHTML = `
                <div class="error">
                    <strong>No articles found</strong> to write to Google Sheets.
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching articles and writing to sheets:', error);
        results.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message}
                <br><br>
                <strong>Note:</strong> Make sure your Google Sheets service account key is loaded and the spreadsheet ID is correct.
            </div>
        `;
    } finally {
        // Hide loading state
        button.disabled = false;
        loading.style.display = 'none';
    }
}

// Global function to test sheets connection
async function testSheetsConnection() {
    const results = document.getElementById('results');
    
    try {
        // Check if sheetsAPI is available
        if (typeof sheetsAPI === 'undefined' || !sheetsAPI.serviceAccountKey) {
            throw new Error('Google Sheets API not available. Please load your service account key first.');
        }
        
        // Test connection by trying to read from the sheet
        const tokenValid = await sheetsAPI.ensureValidToken();
        if (!tokenValid) {
            throw new Error('Failed to get valid access token');
        }
        
        // Try to read a small range to test connection
        const testData = await sheetsAPI.readFromSheet(eventRegistryAPI.sheetId, 'Sheet1!A1:A1');
        
        results.innerHTML = `
            <div class="success">
                <strong>Connection Test Successful!</strong>
                <br><br>
                <strong>Details:</strong>
                <ul>
                    <li>Service Account Key: Loaded</li>
                    <li>Access Token: Valid</li>
                    <li>Sheet Access: Working</li>
                    <li>Spreadsheet ID: ${eventRegistryAPI.sheetId}</li>
                </ul>
            </div>
        `;
    } catch (error) {
        console.error('Sheets connection test failed:', error);
        results.innerHTML = `
            <div class="error">
                <strong>Connection Test Failed:</strong> ${error.message}
                <br><br>
                <strong>Troubleshooting:</strong>
                <ul>
                    <li>Make sure you've loaded your service account key</li>
                    <li>Check that the spreadsheet ID is correct</li>
                    <li>Ensure the service account has access to the spreadsheet</li>
                    <li>Verify the spreadsheet exists and is not private</li>
                </ul>
            </div>
        `;
    }
}
