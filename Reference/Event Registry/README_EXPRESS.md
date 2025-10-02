# Event Registry Express.js Application

This is an Express.js application that provides the Event Registry interface as a web service that can be integrated into larger applications.

## Features

- **Express.js Backend**: RESTful API endpoints for Event Registry functionality
- **EJS Templates**: Server-side rendering with dynamic content
- **Static File Serving**: Organized JavaScript and CSS files
- **File Upload Support**: Service account key upload via multer
- **CORS Support**: Cross-origin requests enabled
- **Session Management**: Basic session handling for file uploads
- **Error Handling**: Comprehensive error handling and logging

## Project Structure

```
├── app.js                          # Main Express application
├── package.json                    # Dependencies and scripts
├── env.example                     # Environment variables template
├── views/
│   └── index.ejs                   # Main application template
└── public/
    └── js/
        ├── config.js               # Configuration file
        ├── api-client.js           # Express API client
        ├── sheets-api.js           # Google Sheets integration
        ├── request-builder.js      # Request builder functionality
        ├── event-registry-api-express.js # Event Registry API (Express version)
        ├── source-based-api.js     # Source-based API
        └── main.js                 # Main application logic
```

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Configuration**:
   - Set your Event Registry API key
   - Configure Google Sheets spreadsheet IDs
   - Set session secret for production

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Event Registry
- `POST /api/event-registry/fetch` - Fetch articles from Event Registry
  - Body: `{ "requestBody": "JSON string" }`
  - Returns: Event Registry API response

### Google Sheets
- `POST /api/sheets/upload-key` - Upload service account key
  - Form data: `serviceAccountKey` (JSON file)
  - Returns: Upload confirmation

- `POST /api/sheets/sources` - Fetch sources from Google Sheets
  - Body: `{ "sheetId": "string", "range": "string" }`
  - Returns: Sources data

- `POST /api/sheets/write-articles` - Write articles to Google Sheets
  - Body: `{ "articles": [...], "sheetId": "string" }`
  - Returns: Write confirmation

### Utility
- `GET /health` - Health check endpoint
- `GET /` - Main application interface

## Integration

### As a Standalone Service
The application can run independently and serve the Event Registry interface.

### As Part of a Larger Application
The Express app can be integrated into larger Node.js applications:

```javascript
const expressApp = require('./app');
// Mount at specific path
app.use('/event-registry', expressApp);
```

### API Integration
Other applications can consume the API endpoints:

```javascript
// Fetch articles
const response = await fetch('http://localhost:3000/api/event-registry/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestBody: JSON.stringify(requestData) })
});
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `EVENT_REGISTRY_API_URL`: Event Registry API endpoint
- `EVENT_REGISTRY_API_KEY`: Your Event Registry API key
- `GOOGLE_SHEETS_SPREADSHEET_ID`: Main Google Sheets ID
- `SESSION_SECRET`: Session secret for production

### Google Sheets Setup
1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a service account
4. Download the service account key JSON file
5. Share your Google Sheets with the service account email

## Security Considerations

- **File Upload Limits**: Service account keys limited to 1MB
- **Session Management**: Basic session handling (upgrade for production)
- **CORS**: Configured for development (restrict for production)
- **API Keys**: Store securely in environment variables

## Deployment

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration
- **Development**: Uses local configuration
- **Production**: Requires proper environment variables and security settings

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure CORS is properly configured
2. **Google Sheets Access**: Verify service account permissions
3. **Event Registry API**: Check API key and rate limits
4. **File Upload**: Ensure multer configuration is correct

### Logs
The application logs important events and errors to the console.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
