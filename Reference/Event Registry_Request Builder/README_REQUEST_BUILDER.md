# Event Registry Request Builder

This tool allows users to build Event Registry API requests through a user-friendly interface with menus and forms, rather than manually writing JSON.

## Features

### 1. Search Terms Input
- Three input fields for search terms (pre-filled with COP30, Brazil, Climate Conference)
- Manual entry of search terms
- All terms are combined with OR logic in the generated request

### 2. Date Range Selection
- Start date and end date pickers
- Defaults to today and 30 days in the future
- Dates are used in the `dateStart` and `dateEnd` fields of the request

### 3. Sources Selection from Google Sheets
- Automatically loads approved sources from Google Sheets
- Sheet ID: `1plBgMb9lADx3LneriMydEYvq2N4zDawUCYpbe0lYPDY`
- Source titles are loaded from `Sheet1!A2:A`
- Corresponding URIs are loaded from `Sheet1!E2:E`
- Checkbox interface for selecting multiple sources
- "Select All" and "Deselect All" buttons for convenience

### 4. Service Account Key Upload
- File input for uploading Google Sheets service account key
- Automatic validation of the key file format
- Status display showing whether the key is loaded
- Integration with existing sheets API functionality

### 5. Request Building
- Generates JSON matching the structure in the "Request Demo" file
- Preview functionality to see the generated JSON before submission
- Submit functionality to send the request to the Event Registry API
- Real-time validation of form inputs

## Usage

### Prerequisites
1. A Google Sheets service account key file (JSON format)
2. The service account must have read access to the sources Google Sheet

### Steps
1. Open `request-builder.html` in your browser
2. Upload your service account key using the file input in the "Google Sheets Configuration" section
3. Click "Refresh Sources" to load available sources from Google Sheets
4. Enter or modify search terms as needed
5. Select start and end dates for your search
6. Check the boxes next to the sources you want to include
7. Click "Preview JSON" to see the generated request
8. Click "Submit Request" to send the request to the Event Registry API

### Request Structure
The tool generates requests matching this structure:
```json
{
    "query": {
        "$query": {
            "$and": [
                {
                    "$or": [
                        {"keyword": "searchTerm1", "keywordLoc": "body"},
                        {"keyword": "searchTerm2", "keywordLoc": "body"},
                        {"keyword": "searchTerm3", "keywordLoc": "body"}
                    ]
                },
                {
                    "$or": [
                        {"sourceUri": "source1.com"},
                        {"sourceUri": "source2.com"}
                    ]
                },
                {
                    "dateStart": "2025-01-01",
                    "dateEnd": "2025-01-31"
                }
            ]
        }
    },
    "$filter": {
        "dataType": ["news", "blog"]
    },
    "resultType": "articles",
    "articlesSortBy": "date",
    "apiKey": "your-api-key"
}
```

## Files

- `request-builder.html` - Main HTML interface
- `request-builder.js` - JavaScript functionality for the request builder
- `config.js` - Updated to include the sources sheet configuration

## Configuration

The sources sheet ID is configured in `config.js`:
```javascript
GOOGLE_SHEETS: {
    REQUEST_BUILDER_SOURCES_SHEET_ID: '1plBgMb9lADx3LneriMydEYvq2N4zDawUCYpbe0lYPDY'
}
```

## Error Handling

The tool includes comprehensive error handling for:
- Missing service account key
- Google Sheets access issues
- Invalid form inputs
- API request failures
- CORS issues (with helpful troubleshooting tips)

## Integration

This tool integrates with the existing codebase:
- Uses the same `sheets-api.js` for Google Sheets access
- Uses the same `config.js` for configuration
- Uses the same Event Registry API endpoint and key
- Follows the same error handling patterns
