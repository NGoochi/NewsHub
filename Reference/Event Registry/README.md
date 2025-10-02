# Event Registry API

A web application that fetches articles from the Event Registry API based on specific search criteria.

## 📁 Project Structure

```
NAPI_Dev/
├── event_registry_api.html    # Main HTML frontend
├── event-registry-api.js     # Event Registry API functionality
├── sheets-api.js             # Google Sheets API integration
├── main.js                   # Application initialization and utilities
├── service-account-key.json  # Google Service Account credentials
└── README.md                 # This documentation
```

## 🚀 Features

### Event Registry API Integration
- Fetches articles based on specific criteria (Climate Change + Donald Trump)
- Configurable date ranges and search parameters (automatically uses today and yesterday)
- Full article body text display
- **Automatic pagination** - fetches ALL available articles (100 per page)
- Error handling with helpful CORS information

### Google Sheets Integration
- **Service Account Authentication** - Uses JSON key file for secure access
- **File Input Support** - Load service account key via file input (bypasses CORS restrictions)
- **Read Operations** - Fetch data from any Google Sheet
- **Simple Configuration** - Just provide Spreadsheet ID and range
- **Connection Testing** - Verify API connectivity before use



### User Interface
- Clean, responsive design
- Loading states with spinners
- Success/error message display
- Button state management based on connection status

## 🛠️ Setup Instructions

### 1. Application Configuration
1. Open `event_registry_api.html` in your browser
2. The application is ready to use immediately

### 2. Usage
1. **Fetch Articles** - Click to retrieve articles from Event Registry
2. **Load Service Account Key** - Select your `service-account-key.json` file
3. **Test Sheets Connection** - Verify Google Sheets API connectivity
4. **Read from Google Sheets** - Fetch data using Spreadsheet ID and range

## 🔧 Technical Details

### JavaScript Architecture



#### `event-registry-api.js`
- **Class**: `EventRegistryAPI`
- **Responsibilities**:
  - Event Registry API communication
  - **Automatic pagination** - fetches all available articles across multiple pages
  - Article caching and aggregation
  - Results display formatting
  - Error handling

#### `sheets-api.js`
- **Class**: `GoogleSheetsAPI`
- **Responsibilities**:
  - Google Sheets API communication
  - Service account authentication (JWT)
  - Token management and refresh
  - Data reading operations

#### `main.js`
- **Class**: `App`
- **Responsibilities**:
  - Application initialization
  - Global error handling
  - Dependency checking
  - Welcome message display

### API Endpoints

#### Event Registry API
- **URL**: `https://eventregistry.org/api/v1/article/getArticles`
- **Method**: POST
- **Authentication**: API Key
- **Query**: Climate Change + Donald Trump articles (Aug 7-14, 2025)

#### Google Sheets API
- **URL**: `https://sheets.googleapis.com/v4/spreadsheets`
- **Method**: GET
- **Authentication**: Service Account (JWT)
- **Scope**: `https://www.googleapis.com/auth/spreadsheets.readonly`



## ⚠️ Important Notes

### CORS Considerations
- The Event Registry API call may be blocked by CORS policy when running locally
- Solutions:
  - Run from a local web server (e.g., `python -m http.server`)
  - Use Live Server extension in VS Code
  - Handle CORS on the API side

### Current Implementation
- **Event Registry API Integration**: Fetches articles based on specific search criteria
- **Full Article Display**: Shows complete article body text
- **Error Handling**: Comprehensive error handling with helpful CORS information
- **Google Sheets Integration**: Read data from Google Sheets using service account authentication

## 🔮 Future Enhancements

### Planned Features
- **Advanced Filtering**: More sophisticated article search and filtering
- **Data Export**: Multiple export formats (CSV, JSON, PDF)
- **Scheduled Fetching**: Automated article retrieval at specified intervals

### API Improvements
- **Rate Limiting**: Implement proper API rate limiting
- **Caching**: Add response caching for better performance
- **Retry Logic**: Automatic retry for failed API calls

## 🐛 Troubleshooting

### Common Issues



#### No Articles Found
- Check API key validity
- Verify date range is correct
- Ensure search criteria are valid
- Check API response for error details

#### CORS Errors
- Run from a web server instead of opening file directly
- Use browser extensions to bypass CORS
- Test API calls using Postman first

## 📞 Support

For technical support or feature requests:
1. Check the browser console for error messages
2. Verify all configuration parameters
3. Test individual components separately
4. Review the API documentation for both services

## 📄 License

This project is provided as-is for educational and development purposes. Please ensure compliance with the terms of service for the Event Registry API.
