// Event Registry Request Builder
class RequestBuilder {
    constructor() {
        this.sourcesSheetId = CONFIG.GOOGLE_SHEETS.REQUEST_BUILDER_SOURCES_SHEET_ID;
        this.sourcesRange = 'Sheet1!A2:E'; // Load all columns A through E
        this.sources = [];
        this.filteredSources = [];
        this.apiUrl = CONFIG.EVENT_REGISTRY.API_URL;
        this.apiKey = CONFIG.EVENT_REGISTRY.API_KEY;
    }

    // Load sources from the specified Google Sheet
    async loadSourcesFromSheet() {
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loadingText');
        const results = document.getElementById('results');
        const sourcesList = document.getElementById('sourcesList');

        // Show loading state
        loading.style.display = 'block';
        loadingText.textContent = 'Loading sources from Google Sheets...';
        results.innerHTML = '';
        sourcesList.innerHTML = '';

        try {
            console.log('Checking for service account key before loading sources:', {
                sheetsAPI: !!sheetsAPI,
                serviceAccountKey: !!sheetsAPI?.serviceAccountKey,
                keyType: typeof sheetsAPI?.serviceAccountKey
            });
            
            if (!sheetsAPI.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please load your service account key first.');
            }

            const tokenValid = await sheetsAPI.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Load all source data from columns A through E
            const sourcesData = await sheetsAPI.readFromSheet(this.sourcesSheetId, this.sourcesRange);

            if (!sourcesData || sourcesData.length === 0) {
                throw new Error(`No source data found in range ${this.sourcesRange}`);
            }

            // Process the data - extract all columns
            this.sources = [];
            const regions = new Set();
            const countries = new Set();
            const languages = new Set();

            for (let i = 0; i < sourcesData.length; i++) {
                const row = sourcesData[i];
                const title = row && row[0] ? row[0].trim() : '';
                const region = row && row[1] ? row[1].trim() : '';
                const country = row && row[2] ? row[2].trim() : '';
                const language = row && row[3] ? row[3].trim() : '';
                const uri = row && row[4] ? row[4].trim() : '';

                if (title && uri) {
                    this.sources.push({
                        title: title,
                        region: region,
                        country: country,
                        language: language,
                        uri: this.cleanSourceUrl(uri),
                        selected: false,
                        visible: true
                    });

                    // Collect unique values for filter dropdowns
                    if (region) regions.add(region);
                    if (country) countries.add(country);
                    if (language) languages.add(language);
                }
            }

            // Initialize filtered sources with all sources
            this.filteredSources = [...this.sources];

            // Populate filter dropdowns
            this.populateFilterDropdowns(regions, countries, languages);

            if (this.sources.length === 0) {
                throw new Error('No valid source entries found after processing the data');
            }

            // Display sources in the UI
            this.displaySources();

            // Show success message
            results.innerHTML = `
                <div class="success">
                    <strong>Success!</strong> Loaded ${this.sources.length} sources from Google Sheets
                </div>
            `;

        } catch (error) {
            console.error('Error loading sources from Google Sheets:', error);
            results.innerHTML = `
                <div class="error">
                    <strong>Error loading sources:</strong> ${error.message}
                    <br><br>
                    <strong>Troubleshooting:</strong>
                    <ul>
                        <li>Make sure you have loaded your service account key</li>
                        <li>Verify the Google Sheets ID and ranges are correct</li>
                        <li>Ensure the sheet has data in columns A and E starting from row 2</li>
                        <li>Check that your service account has read access to the sheet</li>
                    </ul>
                </div>
            `;
            sourcesList.innerHTML = '<div class="error">Failed to load sources. Please check the error message above.</div>';
        } finally {
            // Hide loading state
            loading.style.display = 'none';
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

    // Populate filter dropdowns with unique values
    populateFilterDropdowns(regions, countries, languages) {
        const regionFilter = document.getElementById('regionFilter');
        const countryFilter = document.getElementById('countryFilter');
        const languageFilter = document.getElementById('languageFilter');
        const filterControls = document.getElementById('filterControls');

        // Clear existing options (keep the "All" option)
        regionFilter.innerHTML = '<option value="">All Regions</option>';
        countryFilter.innerHTML = '<option value="">All Countries</option>';
        languageFilter.innerHTML = '<option value="">All Languages</option>';

        // Add region options
        Array.from(regions).sort().forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });

        // Add country options
        Array.from(countries).sort().forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });

        // Add language options
        Array.from(languages).sort().forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            languageFilter.appendChild(option);
        });

        // Show filter controls
        filterControls.style.display = 'block';
    }

    // Apply filters to the sources list
    applyFilters() {
        const regionFilter = document.getElementById('regionFilter').value;
        const countryFilter = document.getElementById('countryFilter').value;
        const languageFilter = document.getElementById('languageFilter').value;

        // Filter sources based on selected criteria
        this.filteredSources = this.sources.filter(source => {
            const regionMatch = !regionFilter || source.region === regionFilter;
            const countryMatch = !countryFilter || source.country === countryFilter;
            const languageMatch = !languageFilter || source.language === languageFilter;

            return regionMatch && countryMatch && languageMatch;
        });

        // Update the display
        this.displaySources();
    }

    // Clear all filters
    clearFilters() {
        document.getElementById('regionFilter').value = '';
        document.getElementById('countryFilter').value = '';
        document.getElementById('languageFilter').value = '';
        
        // Reset filtered sources to show all
        this.filteredSources = [...this.sources];
        this.displaySources();
    }

    // Display sources in the UI with checkboxes
    displaySources() {
        const sourcesList = document.getElementById('sourcesList');
        
        if (this.sources.length === 0) {
            sourcesList.innerHTML = '<div class="info">No sources available</div>';
            return;
        }

        if (this.filteredSources.length === 0) {
            sourcesList.innerHTML = '<div class="info">No sources match the selected filters. Try adjusting your filter criteria.</div>';
            return;
        }

        let html = `<div class="sources-summary">Showing ${this.filteredSources.length} of ${this.sources.length} sources</div>`;
        
        this.filteredSources.forEach((source, index) => {
            // Find the original index in the sources array
            const originalIndex = this.sources.findIndex(s => s.title === source.title && s.uri === source.uri);
            
            html += `
                <div class="source-item">
                    <input type="checkbox" 
                           id="source_${originalIndex}" 
                           ${source.selected ? 'checked' : ''}
                           onchange="requestBuilder.toggleSource(${originalIndex})">
                    <label for="source_${originalIndex}">
                        <div class="source-title">${source.title}</div>
                        <div class="source-meta">
                            ${source.region ? `<span class="source-region">${source.region}</span>` : ''}
                            ${source.country ? `<span class="source-country">${source.country}</span>` : ''}
                            ${source.language ? `<span class="source-language">${source.language}</span>` : ''}
                        </div>
                    </label>
                </div>
            `;
        });

        sourcesList.innerHTML = html;
    }

    // Toggle source selection
    toggleSource(index) {
        if (index >= 0 && index < this.sources.length) {
            this.sources[index].selected = !this.sources[index].selected;
        }
    }

    // Select all visible sources
    selectAllSources() {
        this.filteredSources.forEach(source => {
            source.selected = true;
        });
        this.displaySources();
    }

    // Deselect all visible sources
    deselectAllSources() {
        this.filteredSources.forEach(source => {
            source.selected = false;
        });
        this.displaySources();
    }

    // Get selected sources
    getSelectedSources() {
        return this.sources.filter(source => source.selected);
    }

    // Get search terms from form (supports both simple and boolean modes)
    getSearchTerms() {
        const searchMode = document.querySelector('input[name="searchMode"]:checked').value;
        
        if (searchMode === 'custom') {
            return this.getSimpleSearchTerms();
        } else {
            return this.getBooleanSearchTerms();
        }
    }

    // Get simple search terms (legacy method)
    getSimpleSearchTerms() {
        const terms = [];
        const term1 = document.getElementById('searchTerm1').value.trim();
        const term2 = document.getElementById('searchTerm2').value.trim();
        const term3 = document.getElementById('searchTerm3').value.trim();

        if (term1) terms.push(term1);
        if (term2) terms.push(term2);
        if (term3) terms.push(term3);

        return terms;
    }

    // Get boolean search terms and structure
    getBooleanSearchTerms() {
        const mainContainer = document.getElementById('booleanQueryItems');
        if (!mainContainer) return [];
        
        const terms = [];
        
        // Only process direct children of the main container (not nested items)
        const directItems = Array.from(mainContainer.children).filter(item => 
            item.classList.contains('query-item')
        );
        
        directItems.forEach(item => {
            const type = item.classList.contains('group') ? 'group' : 'term';
            const operator = item.querySelector('.operator-btn')?.dataset.operator || 'AND';
            
            if (type === 'term') {
                const input = item.querySelector('.term-input')?.value?.trim();
                if (input) {
                    terms.push({
                        type: 'term',
                        operator: operator,
                        value: input
                    });
                }
            } else if (type === 'group') {
                const groupTerms = this.getGroupTerms(item);
                if (groupTerms.length > 0) {
                    terms.push({
                        type: 'group',
                        operator: operator,
                        terms: groupTerms
                    });
                }
            }
        });
        
        return terms;
    }

    // Get terms from within a group
    getGroupTerms(groupItem) {
        const groupItems = groupItem.querySelector('.group-items');
        if (!groupItems) return [];
        
        const terms = [];
        
        // Only process direct children of the group-items container
        const directGroupItems = Array.from(groupItems.children).filter(item => 
            item.classList.contains('query-item')
        );
        
        directGroupItems.forEach(item => {
            const type = item.classList.contains('group') ? 'group' : 'term';
            const operator = item.querySelector('.operator-btn')?.dataset.operator || 'AND';
            
            if (type === 'term') {
                const input = item.querySelector('.term-input')?.value?.trim();
                if (input) {
                    terms.push({
                        type: 'term',
                        operator: operator,
                        value: input
                    });
                }
            } else if (type === 'group') {
                const nestedGroupTerms = this.getGroupTerms(item);
                if (nestedGroupTerms.length > 0) {
                    terms.push({
                        type: 'group',
                        operator: operator,
                        terms: nestedGroupTerms
                    });
                }
            }
        });
        
        return terms;
    }

    // Get search terms display string for UI
    getSearchTermsDisplay() {
        const searchMode = document.querySelector('input[name="searchMode"]:checked').value;
        
        if (searchMode === 'custom') {
            return this.getSimpleSearchTerms().join(', ');
        } else {
            const booleanTerms = this.getBooleanSearchTerms();
            return buildQueryString(booleanTerms);
        }
    }

    // Get date range from form
    getDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        return { startDate, endDate };
    }

    // Build the request JSON matching the demo structure
    buildRequest() {
        const searchTerms = this.getSearchTerms();
        const dateRange = this.getDateRange();
        const selectedSources = this.getSelectedSources();

        if (searchTerms.length === 0) {
            throw new Error('Please enter at least one search term');
        }

        if (!dateRange.startDate || !dateRange.endDate) {
            throw new Error('Please select both start and end dates');
        }

        if (selectedSources.length === 0) {
            throw new Error('Please select at least one source');
        }

        // Build the query structure matching the demo
        const query = {
            "$query": {
                "$and": []
            }
        };

        // Add search terms based on mode (simple OR logic or boolean logic)
        const searchMode = document.querySelector('input[name="searchMode"]:checked').value;
        
        if (searchMode === 'custom') {
            // Simple mode: OR logic for all terms
            if (searchTerms.length === 1) {
                // Single term
                query.$query.$and.push({
                    "keyword": searchTerms[0],
                    "keywordLoc": "body"
                });
            } else {
                // Multiple terms with OR logic
                const termConditions = searchTerms.map(term => ({
                    "keyword": term,
                    "keywordLoc": "body"
                }));

                query.$query.$and.push({
                    "$or": termConditions
                });
            }
        } else {
            // Boolean mode: complex logic with AND, OR, NOT operators
            const booleanQuery = this.buildBooleanQuery(searchTerms);
            if (booleanQuery) {
                query.$query.$and.push(booleanQuery);
            }
        }

        // Add sources filter
        const sourceConditions = selectedSources.map(source => ({
            "sourceUri": source.uri
        }));

        query.$query.$and.push({
            "$or": sourceConditions
        });

        // Add date range
        query.$query.$and.push({
            "dateStart": dateRange.startDate,
            "dateEnd": dateRange.endDate
        });

        // Build the complete request body
        const requestBody = {
            "query": query,
            "$filter": {
                "dataType": [
                    "news",
                    "blog"
                ]
            },
            "resultType": "articles",
            "articlesSortBy": "date",
            "apiKey": this.apiKey
        };

        return requestBody;
    }

    // Build boolean query structure for Event Registry API
    buildBooleanQuery(booleanTerms) {
        if (!booleanTerms || booleanTerms.length === 0) {
            return null;
        }

        // If only one term, return simple keyword condition
        if (booleanTerms.length === 1) {
            const term = booleanTerms[0];
            if (term.type === 'term') {
                return {
                    "keyword": term.value,
                    "keywordLoc": "body"
                };
            } else if (term.type === 'group') {
                return this.buildGroupQuery(term.terms);
            }
        }

        // Multiple terms - need to combine with operators
        return this.buildGroupQuery(booleanTerms);
    }

    // Build query for a group of terms
    buildGroupQuery(terms) {
        if (!terms || terms.length === 0) {
            return null;
        }

        // Group terms by operator
        const andTerms = [];
        const orTerms = [];
        const notTerms = [];

        terms.forEach((term, index) => {
            const operator = index === 0 ? 'AND' : term.operator; // First term doesn't need operator
            
            if (term.type === 'term') {
                const keywordCondition = {
                    "keyword": term.value,
                    "keywordLoc": "body"
                };

                if (operator === 'NOT') {
                    notTerms.push(keywordCondition);
                } else if (operator === 'OR') {
                    orTerms.push(keywordCondition);
                } else {
                    andTerms.push(keywordCondition);
                }
            } else if (term.type === 'group') {
                const groupQuery = this.buildGroupQuery(term.terms);
                if (groupQuery) {
                    if (operator === 'NOT') {
                        notTerms.push(groupQuery);
                    } else if (operator === 'OR') {
                        orTerms.push(groupQuery);
                    } else {
                        andTerms.push(groupQuery);
                    }
                }
            }
        });

        // Build the final query structure
        const conditions = [];

        // Add AND terms
        if (andTerms.length === 1) {
            conditions.push(andTerms[0]);
        } else if (andTerms.length > 1) {
            conditions.push({ "$and": andTerms });
        }

        // Add OR terms
        if (orTerms.length === 1) {
            conditions.push(orTerms[0]);
        } else if (orTerms.length > 1) {
            conditions.push({ "$or": orTerms });
        }

        // Add NOT terms (these need special handling)
        if (notTerms.length > 0) {
            notTerms.forEach(notTerm => {
                conditions.push({ "$not": notTerm });
            });
        }

        // Return appropriate structure based on number of conditions
        if (conditions.length === 1) {
            return conditions[0];
        } else if (conditions.length > 1) {
            return { "$and": conditions };
        }

        return null;
    }

    // Preview the request JSON
    previewRequest() {
        const results = document.getElementById('results');

        try {
            const requestBody = this.buildRequest();
            const jsonString = JSON.stringify(requestBody, null, 2);

            results.innerHTML = `
                <div class="success">
                    <strong>Request Preview</strong>
                </div>
                <div class="json-output">
                    <h4>Generated JSON Request:</h4>
                    <pre>${jsonString}</pre>
                </div>
                <div class="stats">
                    <strong>Selected Sources:</strong> ${this.getSelectedSources().length} sources<br>
                    <strong>Search Mode:</strong> ${document.querySelector('input[name="searchMode"]:checked').value}<br>
                    <strong>Search Terms:</strong> ${this.getSearchTermsDisplay()}<br>
                    <strong>Date Range:</strong> ${this.getDateRange().startDate} to ${this.getDateRange().endDate}
                </div>
            `;
        } catch (error) {
            results.innerHTML = `
                <div class="error">
                    <strong>Error building request:</strong> ${error.message}
                </div>
            `;
        }
    }

    // Submit the request to Event Registry API
    async submitRequest() {
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loadingText');
        const results = document.getElementById('results');

        // Show loading state
        loading.style.display = 'block';
        loadingText.textContent = 'Submitting request to Event Registry API...';
        results.innerHTML = '';

        try {
            const requestBody = this.buildRequest();
            
            loadingText.textContent = 'Sending request...';

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

            // Display results
            if (articles.length > 0) {
                let html = `
                    <div class="success">
                        <strong>Success!</strong> Found ${articles.length} articles
                    </div>
                    <div class="stats">
                        <strong>Total Results Available:</strong> ${data.articles?.totalResults || 0}<br>
                        <strong>Articles Retrieved:</strong> ${articles.length}<br>
                        <strong>Selected Sources:</strong> ${this.getSelectedSources().length} sources<br>
                        <strong>Search Terms:</strong> ${this.getSearchTerms().join(', ')}
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
            } else {
                results.innerHTML = `
                    <div class="error">
                        <strong>No articles found</strong> for the specified criteria.
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error submitting request:', error);
            results.innerHTML = `
                <div class="error">
                    <strong>Error submitting request:</strong> ${error.message}
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
            loading.style.display = 'none';
        }
    }

    // Extract authors from article data
    extractAuthors(article) {
        if (article.authors && Array.isArray(article.authors) && article.authors.length > 0) {
            const authorNames = article.authors
                .map(author => author.name || author.uri || 'Unknown Author')
                .filter(name => name && name.trim().length > 0);
            
            return authorNames.length > 0 ? authorNames.join(', ') : 'No Author Available';
        } else if (article.author && typeof article.author === 'string') {
            return article.author;
        } else {
            return 'No Author Available';
        }
    }

    // Clear the form
    clearForm() {
        document.getElementById('searchTerm1').value = '';
        document.getElementById('searchTerm2').value = '';
        document.getElementById('searchTerm3').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        
        // Clear boolean search
        clearBooleanQuery();
        
        // Reset to custom search mode
        document.querySelector('input[name="searchMode"][value="custom"]').checked = true;
        toggleSearchMode();
        
        // Clear filters
        this.clearFilters();
        
        // Deselect all sources
        this.sources.forEach(source => {
            source.selected = false;
        });
        
        this.displaySources();
        
        document.getElementById('results').innerHTML = '';
    }
}

// Create global instance
const requestBuilder = new RequestBuilder();

// Global functions for HTML onclick handlers
async function loadServiceAccountKey() {
    const fileInput = document.getElementById('serviceAccountKey');
    const sheetsStatus = document.getElementById('sheetsStatus');
    
    if (fileInput.files.length === 0) {
        sheetsStatus.innerHTML = '<div class="error">No file selected</div>';
        return;
    }
    
    const file = fileInput.files[0];
    if (!file.name.endsWith('.json')) {
        sheetsStatus.innerHTML = '<div class="error">Please select a JSON file</div>';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const keyData = JSON.parse(e.target.result);
            
            // Validate that this looks like a service account key
            if (!keyData.type || keyData.type !== 'service_account') {
                throw new Error('This does not appear to be a valid service account key file');
            }
            
            if (!keyData.private_key || !keyData.client_email) {
                throw new Error('Service account key is missing required fields');
            }
            
            // Load the key into the sheets API
            if (typeof sheetsAPI !== 'undefined') {
                console.log('Loading service account key into sheetsAPI...');
                // Use the correct method name from the sheets API
                const success = await sheetsAPI.loadServiceAccountKeyFromFile(file);
                console.log('Service account key loading result:', success);
                console.log('sheetsAPI.serviceAccountKey after loading:', !!sheetsAPI.serviceAccountKey);
                
                if (success) {
                    sheetsStatus.innerHTML = '<div class="success">✓ Service account key loaded successfully</div>';
                    
                    // Update the sources list message
                    const sourcesList = document.getElementById('sourcesList');
                    sourcesList.innerHTML = '<div class="info">Service account key loaded. Click "Refresh Sources" to load sources from Google Sheets.</div>';
                    
                    // Update the status check
                    updateServiceAccountStatus();
                } else {
                    throw new Error('Failed to load service account key');
                }
            } else {
                throw new Error('Sheets API not available');
            }
            
        } catch (error) {
            console.error('Error loading service account key:', error);
            sheetsStatus.innerHTML = `<div class="error">Error loading service account key: ${error.message}</div>`;
        }
    };
    
    reader.onerror = function() {
        sheetsStatus.innerHTML = '<div class="error">Error reading file</div>';
    };
    
    reader.readAsText(file);
}

function loadSourcesFromSheet() {
    requestBuilder.loadSourcesFromSheet();
}

function selectAllSources() {
    requestBuilder.selectAllSources();
}

function deselectAllSources() {
    requestBuilder.deselectAllSources();
}

function buildRequest() {
    requestBuilder.previewRequest();
}

function previewRequest() {
    requestBuilder.previewRequest();
}

function submitRequest() {
    requestBuilder.submitRequest();
}

function clearForm() {
    requestBuilder.clearForm();
}

function applyFilters() {
    requestBuilder.applyFilters();
}

function clearFilters() {
    requestBuilder.clearFilters();
}

// Boolean search functions
function toggleSearchMode() {
    const searchMode = document.querySelector('input[name="searchMode"]:checked').value;
    const customMode = document.getElementById('customSearchMode');
    const builderMode = document.getElementById('booleanSearchMode');
    
    if (searchMode === 'custom') {
        customMode.style.display = 'block';
        builderMode.style.display = 'none';
    } else {
        customMode.style.display = 'none';
        builderMode.style.display = 'block';
    }
}

function addBooleanTerm() {
    const container = document.getElementById('booleanQueryItems');
    const termId = 'term_' + Date.now();
    
    const termHtml = `
        <div class="query-item term" data-id="${termId}">
            <span class="item-type">TERM</span>
            <div class="operator-toggle">
                <button type="button" class="operator-btn active-and" data-operator="AND" onclick="toggleOperator('${termId}')">AND</button>
            </div>
            <input type="text" class="term-input" placeholder="Enter search term" onchange="updateQueryVisualization()" onkeyup="updateQueryVisualization()">
            <button type="button" class="remove-btn" onclick="removeQueryItem('${termId}')">Remove</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', termHtml);
    updateQueryVisualization();
}

function addBooleanGroup() {
    const container = document.getElementById('booleanQueryItems');
    const groupId = 'group_' + Date.now();
    
    const groupHtml = `
        <div class="query-item group" data-id="${groupId}">
            <span class="item-type">GROUP</span>
            <div class="operator-toggle">
                <button type="button" class="operator-btn active-and" data-operator="AND" onclick="toggleOperator('${groupId}')">AND</button>
            </div>
            <button type="button" class="remove-btn" onclick="removeQueryItem('${groupId}')">Remove</button>
            
            <div class="group-content">
                <div class="group-controls">
                    <button type="button" onclick="addBooleanTermToGroup('${groupId}')">+ Add Term</button>
                    <button type="button" onclick="addBooleanGroupToGroup('${groupId}')">+ Add Group</button>
                </div>
                <div class="group-items" id="group_${groupId}_items">
                    <!-- Group items will be added here -->
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', groupHtml);
    updateQueryVisualization();
}

function addBooleanTermToGroup(groupId) {
    const groupItems = document.getElementById(`group_${groupId}_items`);
    const termId = 'term_' + Date.now();
    
    const termHtml = `
        <div class="query-item term" data-id="${termId}">
            <span class="item-type">TERM</span>
            <div class="operator-toggle">
                <button type="button" class="operator-btn active-and" data-operator="AND" onclick="toggleOperator('${termId}')">AND</button>
            </div>
            <input type="text" class="term-input" placeholder="Enter search term" onchange="updateQueryVisualization()" onkeyup="updateQueryVisualization()">
            <button type="button" class="remove-btn" onclick="removeQueryItem('${termId}')">Remove</button>
        </div>
    `;
    
    groupItems.insertAdjacentHTML('beforeend', termHtml);
    updateQueryVisualization();
}

function addBooleanGroupToGroup(parentGroupId) {
    const groupItems = document.getElementById(`group_${parentGroupId}_items`);
    const groupId = 'group_' + Date.now();
    
    const groupHtml = `
        <div class="query-item group" data-id="${groupId}">
            <span class="item-type">GROUP</span>
            <div class="operator-toggle">
                <button type="button" class="operator-btn active-and" data-operator="AND" onclick="toggleOperator('${groupId}')">AND</button>
            </div>
            <button type="button" class="remove-btn" onclick="removeQueryItem('${groupId}')">Remove</button>
            
            <div class="group-content">
                <div class="group-controls">
                    <button type="button" onclick="addBooleanTermToGroup('${groupId}')">+ Add Term</button>
                    <button type="button" onclick="addBooleanGroupToGroup('${groupId}')">+ Add Group</button>
                </div>
                <div class="group-items" id="group_${groupId}_items">
                    <!-- Group items will be added here -->
                </div>
            </div>
        </div>
    `;
    
    groupItems.insertAdjacentHTML('beforeend', groupHtml);
    updateQueryVisualization();
}

function removeQueryItem(itemId) {
    const item = document.querySelector(`[data-id="${itemId}"]`);
    if (item) {
        item.remove();
        updateQueryVisualization();
    }
}

function clearBooleanQuery() {
    const container = document.getElementById('booleanQueryItems');
    container.innerHTML = '';
    updateQueryVisualization();
}

function toggleOperator(itemId) {
    const item = document.querySelector(`[data-id="${itemId}"]`);
    if (!item) return;
    
    const button = item.querySelector('.operator-btn');
    if (!button) return;
    
    const currentOperator = button.dataset.operator;
    
    // Toggle between AND and OR
    if (currentOperator === 'AND') {
        button.textContent = 'OR';
        button.dataset.operator = 'OR';
        button.className = 'operator-btn active-or';
    } else {
        button.textContent = 'AND';
        button.dataset.operator = 'AND';
        button.className = 'operator-btn active-and';
    }
    
    // Update the query visualization
    updateQueryVisualization();
}

function updateQueryVisualization() {
    const visualization = document.getElementById('queryVisualization');
    const searchTerms = requestBuilder.getBooleanSearchTerms();
    
    if (searchTerms.length === 0) {
        visualization.innerHTML = '<div class="empty-query">Start building your boolean query below</div>';
        return;
    }
    
    // Convert boolean terms to readable string
    const queryString = buildQueryString(searchTerms);
    visualization.innerHTML = `<div class="query-string">${queryString}</div>`;
}

function buildQueryString(terms) {
    if (!terms || terms.length === 0) {
        return '';
    }
    
    let result = '';
    
    terms.forEach((term, index) => {
        // Add operator before each term except the first one
        if (index > 0) {
            result += ` ${term.operator} `;
        }
        
        if (term.type === 'term') {
            result += `"${term.value}"`;
        } else if (term.type === 'group') {
            const groupString = buildQueryString(term.terms);
            if (groupString) {
                result += `(${groupString})`;
            }
        }
    });
    
    return result;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default dates (today and 30 days from now)
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);
    
    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    document.getElementById('endDate').value = futureDate.toISOString().split('T')[0];
    
    // Initialize search mode
    toggleSearchMode();
    
    // Set default custom boolean query example
    document.getElementById('customBooleanQuery').value = '("COP30" OR "Brazil") AND "climate"';
    
    // Check if service account key is already loaded
    updateServiceAccountStatus();
    
    // Show welcome message
    document.getElementById('results').innerHTML = `
        <div class="info">
            <strong>Welcome to the Event Registry Request Builder!</strong><br><br>
            <strong>Getting Started:</strong>
            <ol>
                <li>Load your Google Sheets service account key using the file input above</li>
                <li>Click "Refresh Sources" to load available sources from Google Sheets</li>
                <li>Enter your boolean search query or use the visual builder</li>
                <li>Select dates and choose sources</li>
                <li>Preview and submit your request</li>
            </ol>
        </div>
    `;
});

// Update service account key status
function updateServiceAccountStatus() {
    const sheetsStatus = document.getElementById('sheetsStatus');
    
    console.log('Checking service account key status:', {
        sheetsAPI: !!sheetsAPI,
        serviceAccountKey: !!sheetsAPI?.serviceAccountKey,
        keyType: typeof sheetsAPI?.serviceAccountKey
    });
    
    if (sheetsAPI && sheetsAPI.serviceAccountKey) {
        sheetsStatus.innerHTML = '<div class="success">✓ Service account key already loaded</div>';
    } else {
        sheetsStatus.innerHTML = '<div class="info">No service account key loaded. Please select your JSON key file above.</div>';
    }
}
