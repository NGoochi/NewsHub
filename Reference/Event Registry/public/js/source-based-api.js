// Source-based Event Registry API functionality
class SourceBasedAPI {
    constructor() {
        // Load configuration from central config file
        this.sheetId = CONFIG.GOOGLE_SHEETS.SPREADSHEET_ID;
        this.sourcesRange = CONFIG.GOOGLE_SHEETS.RANGES.SOURCES;
        this.conceptsRange = CONFIG.GOOGLE_SHEETS.RANGES.CONCEPTS;
        this.apiUrl = CONFIG.EVENT_REGISTRY.API_URL;
        this.apiKey = CONFIG.EVENT_REGISTRY.API_KEY;
        this.sources = [];
        this.concepts = [];
        this.currentPage = 1;
        this.articlesPerPage = CONFIG.EVENT_REGISTRY.ARTICLES_PER_PAGE;
        this.allArticles = [];
        this.totalResults = 0;
        this.chunkSize = CONFIG.GOOGLE_SHEETS.OUTPUT.CHUNK_SIZE;
    }



    // Load sources from Google Sheets
    async loadSourcesFromSheet() {
        try {
            if (!sheetsAPI.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please load your service account key first.');
            }

            const tokenValid = await sheetsAPI.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            const data = await sheetsAPI.readFromSheet(this.sheetId, this.sourcesRange);
            
            if (data && data.length > 0) {
                // Extract sources from the data (remove empty rows and clean up)
                this.sources = data
                    .map(row => row[0]?.trim()) // Get first column value
                    .filter(source => source && source.length > 0) // Remove empty values
                    .map(source => this.cleanSourceUrl(source)); // Clean up source URLs
                
                // Validate that we have sources after cleaning
                if (this.sources.length === 0) {
                    throw new Error('No valid sources found after cleaning the data. Please check your Google Sheet content.');
                }
                
                return this.sources;
            } else {
                throw new Error(`No data found in range ${this.sourcesRange}. Please check the range and ensure there is data in the specified cells.`);
            }
        } catch (error) {
            console.error('Error loading sources from Google Sheets:', error);
            throw error;
        }
    }

    // Load concept URIs from Google Sheets
    async loadConceptsFromSheet() {
        try {
            if (!sheetsAPI.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please load your service account key first.');
            }

            const tokenValid = await sheetsAPI.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            const data = await sheetsAPI.readFromSheet(this.sheetId, this.conceptsRange);
            
            if (data && data.length > 0) {
                // Extract concept URIs from the data (remove empty rows and clean up)
                this.concepts = data
                    .map(row => row[0]?.trim()) // Get first column value
                    .filter(concept => concept && concept.length > 0) // Remove empty values
                    .filter(concept => concept.startsWith('http')); // Only include valid URIs
                
                // Validate that we have concepts after cleaning
                if (this.concepts.length === 0) {
                    throw new Error(`No valid concept URIs found in range ${this.conceptsRange}. Please add concept URIs to your Google Sheet.`);
                }
                
                return this.concepts;
            } else {
                throw new Error(`No data found in range ${this.conceptsRange}. Please add concept URIs to your Google Sheet.`);
            }
        } catch (error) {
            console.error('Error loading concepts from Google Sheets:', error);
            throw new Error(`Failed to load concepts from Google Sheets: ${error.message}. Please ensure the sheet contains concept URIs in range ${this.conceptsRange}.`);
        }
    }

    // Clean up source URLs (remove http/https, www, trailing slashes, etc.)
    cleanSourceUrl(source) {
        return source
            .toLowerCase()
            .replace(/^https?:\/\//, '') // Remove http:// or https://
            .replace(/^www\./, '') // Remove www.
            .replace(/\/$/, '') // Remove trailing slash
            .trim();
    }

    // Build the API request body with sources and concepts
    buildRequestBody(concepts = [], page = 1) {
        const requestBody = {
            "query": {
                "$query": {
                    "$and": []
                }
            },
            "resultType": "articles",
            "articlesPage": page,
            "articlesCount": this.articlesPerPage,
            "articlesSortBy": "date",
            "apiKey": this.apiKey
        };

        // Add concepts - prioritize provided concepts, then loaded concepts from sheet
        let conceptsToUse = [];
        
        if (concepts && concepts.length > 0) {
            // Use explicitly provided concepts
            conceptsToUse = concepts;
        } else if (this.concepts && this.concepts.length > 0) {
            // Use concepts loaded from Google Sheets
            conceptsToUse = this.concepts;
        } else {
            // No concepts available - this should not happen if sheet loading is working
            throw new Error('No concepts available. Please ensure concepts are loaded from Google Sheets first.');
        }

        // Add each concept to the request
        conceptsToUse.forEach(concept => {
            requestBody.query.$query.$and.push({
                "conceptUri": concept
            });
        });

        // Add sources filter
        if (this.sources && this.sources.length > 0) {
            const sourceConditions = this.sources.map(source => ({
                "sourceUri": source
            }));

            requestBody.query.$query.$and.push({
                "$or": sourceConditions
            });
        }

        // Add date range filter if available from the main API
        if (typeof eventRegistryAPI !== 'undefined' && eventRegistryAPI.dateStart && eventRegistryAPI.dateEnd) {
            requestBody.query.$query.$and.push({
                "dateStart": eventRegistryAPI.dateStart,
                "dateEnd": eventRegistryAPI.dateEnd
            });
        }

        return requestBody;
    }

    // Fetch articles using sources from Google Sheets
    async fetchArticlesFromSources(concepts = []) {
        const button = document.getElementById('fetchArticlesFromSources');
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loadingText');
        const results = document.getElementById('results');
        
        // Reset pagination and caching for new search
        this.currentPage = 1;
        this.allArticles = [];
        this.totalResults = 0;
        this.isFetchingAll = false;
        
        // Show loading state
        button.disabled = true;
        loading.style.display = 'block';
        loadingText.textContent = 'Loading sources and concepts from Google Sheets...';
        results.innerHTML = '';
        
        try {
            // First, load sources and concepts from Google Sheets
            await this.loadSourcesFromSheet();
            await this.loadConceptsFromSheet();
            
            if (this.sources.length === 0) {
                throw new Error('No sources found in Google Sheets');
            }
            
            loadingText.textContent = `Found ${this.sources.length} sources and ${this.concepts.length} concepts. Fetching articles...`;
            
            // Start fetching all articles
            await this.fetchAllArticlesFromSources(concepts);
        } catch (error) {
            console.error('Error fetching articles from sources:', error);
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
        } finally {
            // Hide loading state
            button.disabled = false;
            loading.style.display = 'none';
        }
    }

    // Fetch all articles using pagination with sources
    async fetchAllArticlesFromSources(concepts = []) {
        const loadingText = document.getElementById('loadingText');
        let hasMorePages = true;
        
        while (hasMorePages) {
            // Update loading text to show current page
            loadingText.textContent = `Fetching page ${this.currentPage} from ${this.sources.length} sources...`;
            
            const requestBody = this.buildRequestBody(concepts, this.currentPage);
            
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const articles = data.articles?.results || [];
                
                // Cache the articles
                this.allArticles = this.allArticles.concat(articles);
                
                // Update total results on first page
                if (this.currentPage === 1) {
                    this.totalResults = data.articles?.totalResults || 0;
                }
                
                // Check if there are more pages
                const currentPageResults = articles.length;
                const expectedTotal = this.totalResults;
                const currentTotal = this.allArticles.length;
                
                hasMorePages = currentPageResults === this.articlesPerPage && currentTotal < expectedTotal;
                
                if (hasMorePages) {
                    this.currentPage++;
                    // Add a small delay to avoid overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`Error fetching page ${this.currentPage}:`, error);
                throw error;
            }
        }
        
        // Display all fetched articles
        this.displayResultsFromSources();
    }

    // Display results from sources
    displayResultsFromSources() {
        const results = document.getElementById('results');
        
        if (this.allArticles.length > 0) {
            let html = `
                <div class="success">
                    <strong>Success!</strong> Fetched ${this.allArticles.length} articles from ${this.sources.length} sources
                </div>
                <div class="stats">
                    <strong>Total Results Available:</strong> ${this.totalResults}
                    <br>
                    <strong>Articles Retrieved:</strong> ${this.allArticles.length}
                    <br>
                    <strong>Pages Fetched:</strong> ${this.currentPage}
                    <br>
                    <strong>Sources Used:</strong> ${this.sources.join(', ')}
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
        } else {
            results.innerHTML = `
                <div class="error">
                    <strong>No articles found</strong> for the specified sources and criteria.
                </div>
            `;
        }
    }



    // Prepare articles data for writing to Google Sheets
    prepareArticlesForSheets(articles) {
        if (!articles || articles.length === 0) {
            return [];
        }

        // Add header row with new date column
        const headerRow = [
            'News Outlet',
            'Article Title', 
            'Article Author/s',
            'Article URL',
            'Full Body Text',
            'Date Written'
        ];

        // Convert articles to rows with character limit checking and date
        const dataRows = articles.map(article => {
                            // Check each field for character limits
                const newsOutlet = this.checkAndTruncateField(
                    article.source?.title || article.source || 'Unknown Source'
                );
                
                const articleTitle = this.checkAndTruncateField(
                    article.title || 'No Title Available'
                );
                
                const articleAuthors = this.checkAndTruncateField(
                    this.extractAuthors(article)
                );
                
                const articleUrl = this.checkAndTruncateField(
                    article.url || 'No URL Available'
                );
                
                const fullBodyText = this.checkAndTruncateField(
                    article.body || article.summary || 'No Content Available'
                );

            // Extract article publication date
            const dateWritten = article.dateTime || article.date || 'Unknown Date';

            return [newsOutlet, articleTitle, articleAuthors, articleUrl, fullBodyText, dateWritten];
        });

        return [headerRow, ...dataRows];
    }

    // Check if a field exceeds character limit and truncate if necessary
    checkAndTruncateField(field, maxLength = CONFIG.GOOGLE_SHEETS.OUTPUT.MAX_CELL_LENGTH) {
        if (!field || typeof field !== 'string') {
            return field;
        }
        
        if (field.length > maxLength) {
            console.warn(`Field exceeds ${maxLength} characters (${field.length} chars), replacing with error message`);
            return CONFIG.MESSAGES.ERRORS.CELL_TOO_LONG;
        }
        
        return field;
    }

    // Extract authors from article data
    extractAuthors(article) {
        // Handle different author data formats
        if (article.authors && Array.isArray(article.authors) && article.authors.length > 0) {
            // Extract names from authors array and join with comma
            const authorNames = article.authors
                .map(author => author.name || author.uri || 'Unknown Author')
                .filter(name => name && name.trim().length > 0);
            
            return authorNames.length > 0 ? authorNames.join(', ') : 'No Author Available';
        } else if (article.author && typeof article.author === 'string') {
            // Handle simple string author format
            return article.author;
        } else {
            return 'No Author Available';
        }
    }

    // Write articles to Google Sheets (appends to existing data, doesn't overwrite)
    async writeArticlesToSheets(articles = null) {
        try {
            const articlesToWrite = articles || this.allArticles;
            
            if (!articlesToWrite || articlesToWrite.length === 0) {
                throw new Error('No articles available to write to Google Sheets');
            }

            // Get current month and year for sheet naming
            const sheetName = this.getCurrentMonthSheetName();

            // Check if the month sheet exists, create if it doesn't
            await this.ensureMonthSheetExists(sheetName);

            // Check if the sheet has existing data
            const hasExistingData = await this.hasExistingData(sheetName);

            // Find the next empty row to append data
            const nextEmptyRow = await this.findNextEmptyRow(sheetName);

            // Prepare the data for writing
            const sheetData = this.prepareArticlesForSheets(articlesToWrite);
            
            // If this is the first time writing to this sheet, include header row
            // Otherwise, skip header row and just append data
            const dataToWrite = hasExistingData ? sheetData.slice(1) : sheetData;
            
            if (dataToWrite.length === 0) {
                throw new Error('No data to write after processing');
            }

            // Calculate the range for appending (6 columns, starting from the next empty row)
            const totalRows = dataToWrite.length;
            const startRow = nextEmptyRow;
            const endRow = startRow + totalRows - 1;
            const range = `${sheetName}!A${startRow}:F${endRow}`;

            // Write the data in chunks
            const totalWritten = await sheetsAPI.writeToSheet(
                this.sheetId, 
                range, 
                dataToWrite, 
                this.chunkSize
            );

            return { totalWritten, sheetName, startRow, endRow };

        } catch (error) {
            console.error('Error writing articles to Google Sheets:', error);
            throw error;
        }
    }

    // Find the next empty row in a sheet
    async findNextEmptyRow(sheetName) {
        try {
            // Start checking from row 1 and work our way down
            let currentRow = 1;
            const maxRowsToCheck = 10000; // Safety limit to prevent infinite loops
            
            while (currentRow <= maxRowsToCheck) {
                try {
                    // Check if the current row has any data in column A
                    const range = `${sheetName}!A${currentRow}`;
                    const rowData = await sheetsAPI.readFromSheet(this.sheetId, range);
                    
                    // If no data is returned or the cell is empty, we found our empty row
                    if (!rowData || rowData.length === 0 || !rowData[0] || !rowData[0][0] || rowData[0][0].trim() === '') {
                        return currentRow;
                    }
                    
                    // Move to next row
                    currentRow++;
                    
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
            // Try to read the first row to see if there's data
            const range = `${sheetName}!A1`;
            const rowData = await sheetsAPI.readFromSheet(this.sheetId, range);
            
            // Check if there's actual data (not just empty cells)
            const hasData = rowData && 
                           rowData.length > 0 && 
                           rowData[0] && 
                           rowData[0][0] && 
                           rowData[0][0].trim() !== '';
            
            return hasData;
            
        } catch (error) {
            return false;
        }
    }

    // Get the current row count of a sheet
    async getSheetRowCount(sheetName) {
        try {
            // Try to read a large range to see how many rows exist
            const range = `${sheetName}!A1:A1000`;
            const rowData = await sheetsAPI.readFromSheet(this.sheetId, range);
            
            if (rowData && rowData.length > 0) {
                // Find the last non-empty row
                let lastRow = 0;
                for (let i = 0; i < rowData.length; i++) {
                    if (rowData[i] && rowData[i][0] && rowData[i][0].trim() !== '') {
                        lastRow = i + 1; // Convert to 1-based index
                    }
                }
                return lastRow;
            } else {
                return 0;
            }
            
        } catch (error) {
            return 0;
        }
    }

    // Ensure the month sheet exists, create if it doesn't
    async ensureMonthSheetExists(sheetName) {
        try {
            // Try to read from the sheet to see if it exists
            try {
                await sheetsAPI.readFromSheet(this.sheetId, `${sheetName}!A1`);
                return;
            } catch (error) {
                // Sheet doesn't exist, create it
            }

            // Create the new sheet
            await this.createNewSheet(sheetName);

        } catch (error) {
            console.error(`Error ensuring month sheet exists: ${error.message}`);
            
            // Provide helpful error message with manual creation instructions
            const errorMessage = `Failed to create month sheet '${sheetName}'. 
            
To fix this issue, please manually create a sheet named '${sheetName}' in your Google Spreadsheet:

1. Open your Google Spreadsheet
2. Click the '+' button at the bottom left to add a new sheet
3. Rename the new sheet to '${sheetName}'
4. Try running the operation again

Alternatively, you can modify the sheetsAPI to include a createSheet method.`;
            
            throw new Error(errorMessage);
        }
    }

    // Create a new sheet in the spreadsheet
    async createNewSheet(sheetName) {
        try {
            // Check if sheetsAPI has a createSheet method
            if (typeof sheetsAPI.createSheet === 'function') {
                await sheetsAPI.createSheet(this.sheetId, sheetName);
                return;
            }
            
            // If no createSheet method, we need to handle this differently
            // For now, throw an error with instructions
            throw new Error(`Cannot create new sheet '${sheetName}'. The sheetsAPI does not have a createSheet method. Please manually create a sheet named '${sheetName}' in your Google Spreadsheet.`);
            
        } catch (error) {
            console.error(`Error creating sheet: ${error.message}`);
            throw new Error(`Failed to create sheet '${sheetName}': ${error.message}`);
        }
    }

    // Fetch articles and write to Google Sheets
    async fetchArticlesAndWriteToSheets(concepts = []) {
        const button = document.getElementById('fetchArticlesAndWriteToSheets');
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loadingText');
        const results = document.getElementById('results');
        
        // Reset pagination and caching for new search
        this.currentPage = 1;
        this.allArticles = [];
        this.totalResults = 0;
        this.isFetchingAll = false;
        
        // Show loading state
        button.disabled = true;
        loading.style.display = 'block';
        loadingText.textContent = 'Loading sources and concepts from Google Sheets...';
        results.innerHTML = '';
        
        try {
            // First, load sources and concepts from Google Sheets
            await this.loadSourcesFromSheet();
            await this.loadConceptsFromSheet();
            
            if (this.sources.length === 0) {
                throw new Error('No sources found in Google Sheets');
            }
            
            loadingText.textContent = `Found ${this.sources.length} sources and ${this.concepts.length} concepts. Fetching articles...`;
            
            // Start fetching all articles
            await this.fetchAllArticlesFromSources(concepts);
            
            if (this.allArticles.length === 0) {
                throw new Error('No articles found to write to Google Sheets');
            }
            
            loadingText.textContent = `Fetched ${this.allArticles.length} articles. Writing to Google Sheets...`;
            
            // Write articles to Google Sheets
            const { totalWritten, sheetName, startRow, endRow } = await this.writeArticlesToSheets();
            
            // Get current row count for better reporting
            const currentRowCount = await this.getSheetRowCount(sheetName);
            
            // Display success message
            results.innerHTML = `
                <div class="success">
                    <strong>Success!</strong> Fetched and appended ${this.allArticles.length} articles to Google Sheets in sheet: ${sheetName}
                </div>
                <div class="stats">
                    <strong>Articles Fetched:</strong> ${this.allArticles.length}
                    <br>
                    <strong>New Rows Added:</strong> ${totalWritten}
                    <br>
                    <strong>Total Rows in Sheet:</strong> ${currentRowCount}
                    <br>
                    <strong>Sources Used:</strong> ${this.sources.join(', ')}
                    <br>
                    <strong>Data Range:</strong> ${sheetName}!A${startRow}:F${endRow}
                </div>
                <div class="info">
                    <strong>Data appended to columns:</strong>
                    <ul>
                        <li><strong>A:</strong> News Outlet</li>
                        <li><strong>B:</strong> Article Title</li>
                        <li><strong>C:</strong> Article Author/s</li>
                        <li><strong>D:</strong> Article URL</li>
                        <li><strong>E:</strong> Full Body Text</li>
                        <li><strong>F:</strong> Date Written</li>
                    </ul>
                    <br>
                    <strong>Data Appended:</strong> New articles were added below existing data (no overwriting)
                    <br>
                    <strong>Sheet:</strong> ${sheetName} (automatically created if it didn't exist)
                </div>
            `;
            
        } catch (error) {
            console.error('Error fetching articles and writing to sheets:', error);
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
        } finally {
            // Hide loading state
            button.disabled = false;
            loading.style.display = 'none';
        }
    }








    // Get current month and year for sheet naming
    getCurrentMonthSheetName() {
        const currentDate = new Date();
        const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
        const year = currentDate.getFullYear();
        return `${monthName}_${year}`;
    }
}

// Create global instance
const sourceBasedAPI = new SourceBasedAPI();



// Global function for HTML onclick handler
function fetchArticlesFromSources() {
    sourceBasedAPI.fetchArticlesFromSources();
}

// Global function for fetching articles and writing to sheets
function fetchArticlesAndWriteToSheets() {
    sourceBasedAPI.fetchArticlesAndWriteToSheets();
}









    // Function to check available sheets and help with month sheet creation
    async function checkMonthSheetStatus() {
        const results = document.getElementById('results');
        if (!results) return;
        
        try {
            const currentMonthSheet = sourceBasedAPI.getCurrentMonthSheetName();
            results.innerHTML = '<div class="info">Checking month sheet status...</div>';
            
            let html = '<div class="success">Month Sheet Status Check</div>';
            html += '<div class="stats">Current Month Sheet:</div>';
            html += `<div class="article"><strong>${currentMonthSheet}</strong></div>`;
            
            // Try to list all available sheets
            try {
                const availableSheets = await sheetsAPI.listSheets(sourceBasedAPI.sheetId);
                html += '<div class="stats" style="margin-top: 15px;">Available Sheets:</div>';
                html += '<div class="article">';
                availableSheets.forEach((sheet, index) => {
                    const isCurrentMonth = sheet.title === currentMonthSheet;
                    const statusIcon = isCurrentMonth ? '✓' : '•';
                    const statusClass = isCurrentMonth ? 'success' : '';
                    html += `<div class="${statusClass}" style="margin-bottom: 5px;">${statusIcon} <strong>${sheet.title}</strong> (${sheet.rowCount} rows × ${sheet.columnCount} columns)</div>`;
                });
                html += '</div>';
                
                // Check if current month sheet exists and get its data status
                const monthSheetExists = availableSheets.some(sheet => sheet.title === currentMonthSheet);
                if (monthSheetExists) {
                    html += '<div class="success" style="margin-top: 15px;">✓ Month sheet exists</div>';
                    
                    // Check if it has data
                    try {
                        const hasData = await sourceBasedAPI.hasExistingData(currentMonthSheet);
                        const rowCount = await sourceBasedAPI.getSheetRowCount(currentMonthSheet);
                        
                        if (hasData) {
                            html += `<div class="info" style="margin-top: 10px;">📊 Sheet contains ${rowCount} rows of data</div>`;
                            html += '<div class="info">🔄 Next run will append new articles below existing data</div>';
                        } else {
                            html += '<div class="info" style="margin-top: 10px;">📝 Sheet is empty - next run will add headers and data</div>';
                        }
                    } catch (error) {
                        html += '<div class="info" style="margin-top: 10px;">⚠️ Could not check sheet data status</div>';
                    }
                } else {
                    html += '<div class="error" style="margin-top: 15px;">✗ Month sheet does not exist</div>';
                    html += '<div class="info" style="margin-top: 15px;">';
                    html += '<strong>To create the month sheet automatically:</strong><br>';
                    html += '1. Make sure your service account has edit permissions on the spreadsheet<br>';
                    html += '2. Click "Fetch & Write to Sheets" - it will now create the sheet automatically<br><br>';
                    html += '<strong>To create manually:</strong><br>';
                    html += '1. Open your Google Spreadsheet<br>';
                    html += '2. Click the "+" button at the bottom left to add a new sheet<br>';
                    html += `3. Rename the new sheet to "${currentMonthSheet}"<br>`;
                    html += '4. Try running "Fetch & Write to Sheets" again';
                    html += '</div>';
                }
                
            } catch (error) {
                html += '<div class="error" style="margin-top: 15px;">✗ Could not retrieve sheet information</div>';
                html += '<div class="info" style="margin-top: 15px;">';
                html += '<strong>Error:</strong> ' + error.message + '<br><br>';
                html += '<strong>To create the month sheet manually:</strong><br>';
                html += '1. Open your Google Spreadsheet<br>';
                html += '2. Click the "+" button at the bottom left to add a new sheet<br>';
                html += `3. Rename the new sheet to "${currentMonthSheet}"<br>`;
                html += '4. Try running "Fetch & Write to Sheets" again';
                html += '</div>';
            }
            
            results.innerHTML = html;
            
        } catch (error) {
            results.innerHTML = `<div class="error">Error checking month sheet status: ${error.message}</div>`;
        }
    }