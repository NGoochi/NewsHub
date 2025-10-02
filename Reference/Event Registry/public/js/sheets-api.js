// Google Sheets API functionality using service account
class GoogleSheetsAPI {
    constructor() {
        this.serviceAccountKey = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.sheetsApiUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    }

    // Load service account key from file
    async loadServiceAccountKey() {
        try {
            // First try to load from the file directly
            const response = await fetch('service-account-key.json');
            if (response.ok) {
                this.serviceAccountKey = await response.json();
                return true;
            }
            
            // If direct loading fails, try to get from localStorage (if previously saved)
            const savedKey = localStorage.getItem('googleServiceAccountKey');
            if (savedKey) {
                try {
                    this.serviceAccountKey = JSON.parse(savedKey);
                    return true;
                } catch (parseError) {
                    console.error('Error parsing saved service account key:', parseError);
                    localStorage.removeItem('googleServiceAccountKey');
                }
            }
            
            throw new Error('Service account key not found. Please use the file input to load it.');
        } catch (error) {
            console.error('Error loading service account key:', error);
            return false;
        }
    }

    // Load service account key from file input
    async loadServiceAccountKeyFromFile(file) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const keyData = JSON.parse(e.target.result);
                        this.serviceAccountKey = keyData;
                        // Save to localStorage for future use
                        localStorage.setItem('googleServiceAccountKey', e.target.result);
                        resolve(true);
                    } catch (parseError) {
                        reject(new Error('Invalid JSON file'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        } catch (error) {
            console.error('Error loading service account key from file:', error);
            return false;
        }
    }

    // Create JWT token for service account authentication
    async createJWT() {
        if (!this.serviceAccountKey) {
            throw new Error('Service account key not loaded');
        }

        // For now, we'll use a simplified approach that loads the JWT library
        // In a production environment, you'd want to include the library in your HTML
        if (typeof KJUR === 'undefined') {
            throw new Error('JWT library not loaded. Please include jsrsasign library.');
        }

        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.serviceAccountKey.client_email,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600, // 1 hour
            iat: now
        };

        try {
            const jwt = KJUR.jws.JWS.sign(
                'RS256',
                JSON.stringify(header),
                JSON.stringify(payload),
                this.serviceAccountKey.private_key
            );
            return jwt;
        } catch (error) {
            throw new Error(`JWT creation failed: ${error.message}`);
        }
    }

    // Get access token using JWT
    async getAccessToken() {
        try {
            const jwt = await this.createJWT();
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: jwt
                })
            });

            if (!response.ok) {
                throw new Error(`Token request failed: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            return true;
        } catch (error) {
            console.error('Error getting access token:', error);
            return false;
        }
    }

    // Check if token is valid
    isTokenValid() {
        return this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    // Ensure we have a valid token
    async ensureValidToken() {
        if (!this.isTokenValid()) {
            return await this.getAccessToken();
        }
        return true;
    }

    // Read data from Google Sheets
    async readFromSheet(spreadsheetId, range) {
        try {
            // Validate input parameters
            if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
                throw new Error('Invalid Spreadsheet ID. Please provide a valid Google Sheets ID.');
            }
            
            if (!range || typeof range !== 'string' || range.trim() === '') {
                throw new Error('Invalid Sheet Range. Please provide a valid range (e.g., Sheet1!A1:D10).');
            }
            
            // Clean the parameters
            const cleanSpreadsheetId = spreadsheetId.trim();
            const cleanRange = range.trim();
            
            console.log('Reading from sheet:', {
                spreadsheetId: cleanSpreadsheetId,
                range: cleanRange
            });
            
            // Ensure service account key is loaded
            if (!this.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please use the file input above to load your service-account-key.json file first.');
            }

            // Ensure we have a valid access token
            const tokenValid = await this.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Make the API request
            const url = `${this.sheetsApiUrl}/${cleanSpreadsheetId}/values/${cleanRange}`;
            console.log('Making request to:', url);
            console.log('Using access token:', this.accessToken ? 'Present' : 'Missing');
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheets API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    errorText: errorText
                });
                throw new Error(`Sheets API request failed: ${response.status} - ${response.statusText}. ${errorText}`);
            }

            const data = await response.json();
            return data.values || [];
        } catch (error) {
            console.error('Error reading from sheet:', error);
            throw error;
        }
    }

    // Write data to Google Sheets in chunks
    async writeToSheet(spreadsheetId, range, values, chunkSize = 100) {
        try {
            // Validate input parameters
            if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
                throw new Error('Invalid Spreadsheet ID. Please provide a valid Google Sheets ID.');
            }
            
            if (!range || typeof range !== 'string' || range.trim() === '') {
                throw new Error('Invalid Sheet Range. Please provide a valid range (e.g., Sheet1!A1:D10).');
            }
            
            if (!values || !Array.isArray(values) || values.length === 0) {
                throw new Error('Invalid values. Please provide a non-empty array of values.');
            }
            
            // Clean the parameters
            const cleanSpreadsheetId = spreadsheetId.trim();
            const cleanRange = range.trim();
            
            console.log('Writing to sheet:', {
                spreadsheetId: cleanSpreadsheetId,
                range: cleanRange,
                totalValues: values.length,
                chunkSize: chunkSize
            });
            
            // Ensure service account key is loaded
            if (!this.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please use the file input above to load your service-account-key.json file first.');
            }

            // Ensure we have a valid access token
            const tokenValid = await this.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Split values into chunks
            const chunks = [];
            for (let i = 0; i < values.length; i += chunkSize) {
                chunks.push(values.slice(i, i + chunkSize));
            }

            console.log(`Writing ${values.length} values in ${chunks.length} chunks`);

            // Write each chunk
            let totalWritten = 0;
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkRange = this.calculateChunkRange(cleanRange, i, chunkSize);
                
                console.log(`Writing chunk ${i + 1}/${chunks.length} to range ${chunkRange}`);
                
                const url = `${this.sheetsApiUrl}/${cleanSpreadsheetId}/values/${chunkRange}?valueInputOption=RAW`;
                
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: chunk
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Sheets API Write Error Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        url: url,
                        chunkIndex: i,
                        errorText: errorText
                    });
                    throw new Error(`Sheets API write failed for chunk ${i + 1}: ${response.status} - ${response.statusText}. ${errorText}`);
                }

                totalWritten += chunk.length;
                console.log(`Successfully wrote chunk ${i + 1}/${chunks.length} (${chunk.length} rows)`);
                
                // Add a small delay between chunks to avoid overwhelming the API
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            console.log(`Successfully wrote all ${totalWritten} values to Google Sheets`);
            return totalWritten;
        } catch (error) {
            console.error('Error writing to sheet:', error);
            throw error;
        }
    }

    // Calculate the range for a specific chunk
    calculateChunkRange(baseRange, chunkIndex, chunkSize) {
        // Parse the base range (e.g., "Sheet1!A1:E1")
        const match = baseRange.match(/^([^!]+)!([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error('Invalid range format. Expected format: Sheet1!A1:E1');
        }
        
        const sheetName = match[1];
        const startCol = match[2];
        const startRow = parseInt(match[3]);
        const endCol = match[4];
        const endRow = parseInt(match[5]);
        
        // Calculate the start row for this chunk
        const chunkStartRow = startRow + (chunkIndex * chunkSize);
        const chunkEndRow = Math.min(chunkStartRow + chunkSize - 1, startRow + (chunkIndex + 1) * chunkSize - 1);
        
        return `${sheetName}!${startCol}${chunkStartRow}:${endCol}${chunkEndRow}`;
    }

    // Clear a range in Google Sheets
    async clearRange(spreadsheetId, range) {
        try {
            // Validate input parameters
            if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
                throw new Error('Invalid Spreadsheet ID. Please provide a valid Google Sheets ID.');
            }
            
            if (!range || typeof range !== 'string' || range.trim() === '') {
                throw new Error('Invalid Sheet Range. Please provide a valid range (e.g., Sheet1!A1:D10).');
            }
            
            // Clean the parameters
            const cleanSpreadsheetId = spreadsheetId.trim();
            const cleanRange = range.trim();
            
            console.log('Clearing range in sheet:', {
                spreadsheetId: cleanSpreadsheetId,
                range: cleanRange
            });
            
            // Ensure service account key is loaded
            if (!this.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please use the file input above to load your service-account-key.json file first.');
            }

            // Ensure we have a valid access token
            const tokenValid = await this.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Make the API request to clear the range
            const url = `${this.sheetsApiUrl}/${cleanSpreadsheetId}/values/${cleanRange}:clear`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheets API Clear Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    errorText: errorText
                });
                throw new Error(`Sheets API clear failed: ${response.status} - ${response.statusText}. ${errorText}`);
            }

            console.log('Successfully cleared range in Google Sheets');
            return true;
        } catch (error) {
            console.error('Error clearing range in sheet:', error);
            throw error;
        }
    }

    // Create a new sheet in Google Spreadsheets
    async createSheet(spreadsheetId, sheetName) {
        try {
            // Validate input parameters
            if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
                throw new Error('Invalid Spreadsheet ID. Please provide a valid Google Sheets ID.');
            }
            
            if (!sheetName || typeof sheetName !== 'string' || sheetName.trim() === '') {
                throw new Error('Invalid Sheet Name. Please provide a valid sheet name.');
            }
            
            // Clean the parameters
            const cleanSpreadsheetId = spreadsheetId.trim();
            const cleanSheetName = sheetName.trim();
            
            console.log('Creating new sheet:', {
                spreadsheetId: cleanSpreadsheetId,
                sheetName: cleanSheetName
            });
            
            // Ensure service account key is loaded
            if (!this.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please use the file input above to load your service-account-key.json file first.');
            }

            // Ensure we have a valid access token
            const tokenValid = await this.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Make the API request to create a new sheet
            const url = `${this.sheetsApiUrl}/${cleanSpreadsheetId}:batchUpdate`;
            
            const requestBody = {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: cleanSheetName,
                                gridProperties: {
                                    rowCount: 1000,  // Default row count
                                    columnCount: 26  // Default column count (A-Z)
                                }
                            }
                        }
                    }
                ]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheets API Create Sheet Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    errorText: errorText
                });
                
                // Check if it's a duplicate sheet error
                if (response.status === 400 && errorText.includes('duplicate')) {
                    throw new Error(`Sheet '${cleanSheetName}' already exists in the spreadsheet.`);
                }
                
                throw new Error(`Sheets API create sheet failed: ${response.status} - ${response.statusText}. ${errorText}`);
            }

            const data = await response.json();
            console.log('Successfully created new sheet in Google Sheets:', data);
            return true;
        } catch (error) {
            console.error('Error creating sheet:', error);
            throw error;
        }
    }

    // List all sheets in a Google Spreadsheet
    async listSheets(spreadsheetId) {
        try {
            // Validate input parameters
            if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
                throw new Error('Invalid Spreadsheet ID. Please provide a valid Google Sheets ID.');
            }
            
            // Clean the parameters
            const cleanSpreadsheetId = spreadsheetId.trim();
            
            console.log('Listing sheets for spreadsheet:', cleanSpreadsheetId);
            
            // Ensure service account key is loaded
            if (!this.serviceAccountKey) {
                throw new Error('Service account key not loaded. Please use the file input above to load your service-account-key.json file first.');
            }

            // Ensure we have a valid access token
            const tokenValid = await this.ensureValidToken();
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Make the API request to get spreadsheet metadata
            const url = `${this.sheetsApiUrl}/${cleanSpreadsheetId}?fields=sheets.properties`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheets API List Sheets Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    errorText: errorText
                });
                throw new Error(`Sheets API list sheets failed: ${response.status} - ${response.statusText}. ${errorText}`);
            }

            const data = await response.json();
            const sheets = data.sheets || [];
            
            const sheetInfo = sheets.map(sheet => ({
                title: sheet.properties.title,
                sheetId: sheet.properties.sheetId,
                index: sheet.properties.index,
                rowCount: sheet.properties.gridProperties?.rowCount || 0,
                columnCount: sheet.properties.gridProperties?.columnCount || 0
            }));
            
            console.log('Successfully retrieved sheet information:', sheetInfo);
            return sheetInfo;
        } catch (error) {
            console.error('Error listing sheets:', error);
            throw error;
        }
    }

    // Test connection to Google Sheets API
    async testConnection() {
        try {
            // Check if service account key is already loaded
            if (!this.serviceAccountKey) {
                return { 
                    success: false, 
                    message: 'Service account key not loaded. Please use the file input above to load your service-account-key.json file first.' 
                };
            }

            const tokenValid = await this.ensureValidToken();
            if (!tokenValid) {
                return { success: false, message: 'Failed to get access token' };
            }

            return { success: true, message: 'Connection successful' };
        } catch (error) {
            return { success: false, message: `Connection failed: ${error.message}` };
        }
    }
}

// Create global instance
const sheetsAPI = new GoogleSheetsAPI();
