# NewsHub

A comprehensive news aggregation and analysis platform that integrates with Event Registry API, Google Sheets, and RunChat for automated article collection and analysis.

## Features

### 🗞️ **Article Collection**
- **Event Registry Integration**: Fetch articles from thousands of news sources
- **Advanced Filtering**: Filter sources by region, country, and language
- **Boolean Search**: Support for complex boolean queries with visual query builder
- **Date Range Selection**: Specify custom date ranges for article collection
- **Batch Processing**: Handle large volumes of articles efficiently

### 📊 **Data Management**
- **Google Sheets Integration**: Automatic article storage in Google Sheets
- **Project Organization**: Create and manage multiple news collection projects
- **Real-time Updates**: Live article fetching and storage
- **Data Export**: Export collected articles for further analysis

### 🤖 **AI Analysis**
- **RunChat Integration**: Automated article analysis using AI flows
- **Custom Analysis**: Configure analysis parameters per project
- **Batch Analysis**: Process multiple articles simultaneously

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Google Cloud Project with Sheets API enabled
- Event Registry API key
- RunChat API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NewsHub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   **Windows:**
   ```bash
   setup-env.bat
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x setup-env.sh
   ./setup-env.sh
   ```

4. **Configure your .env file**
   ```bash
   # Event Registry
   EVENT_REGISTRY_API_KEY=your_api_key_here
   EVENT_REGISTRY_SOURCES_SHEET_ID=your_sources_sheet_id
   EVENT_REGISTRY_SOURCES_RANGE=Sheet1!A2:E

   # Google Sheets
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   MASTER_SHEET_ID=your_master_sheet_id

   # RunChat
   RUNCHAT_API_TOKEN=your_api_token
   RUNCHAT_FLOW_ID=your_flow_id

   # Server
   PORT=3001
   NODE_ENV=development
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3001`

## Usage

### Creating a Project
1. Click "Create New Project" on the dashboard
2. Enter a project name
3. The system will create a Google Sheet for storing articles

### Collecting Articles
1. Open your project
2. Go to the Event Registry panel
3. Configure your search:
   - Enter search terms or use the boolean query builder
   - Select date range
   - Choose sources using the filtering system
4. Click "Fetch Articles" to collect articles
5. Click "Write to Sheet" to save articles to your project's Google Sheet

### Source Filtering
- **Load Sources**: Fetch available sources from Google Sheets
- **Filter by Region**: Select specific geographic regions
- **Filter by Country**: Choose specific countries
- **Filter by Language**: Select article languages
- **Bulk Selection**: Use "Select All" or "Deselect All" for filtered results

## API Endpoints

### Projects
- `GET /` - Dashboard with all projects
- `GET /:projectId` - Project details page
- `POST /api/projects/create` - Create new project

### Event Registry
- `GET /api/event-registry/sources` - Get available sources
- `POST /api/event-registry/fetch-articles` - Fetch articles
- `POST /api/event-registry/write-to-sheet` - Write articles to sheet

## Project Structure

```
src/
├── lib/                 # Core libraries
│   ├── db.ts           # Database operations
│   ├── eventRegistry.ts # Event Registry API client
│   ├── googleSheets.ts  # Google Sheets integration
│   └── runchat.ts      # RunChat API client
├── routes/             # Express routes
│   ├── api.ts         # General API routes
│   ├── eventRegistry.ts # Event Registry routes
│   └── projects.ts    # Project management routes
├── types/              # TypeScript type definitions
├── views/              # EJS templates
└── server.ts           # Express server setup
```

## Configuration

### Event Registry Setup
1. Sign up at [Event Registry](https://eventregistry.org/)
2. Get your API key from the dashboard
3. Configure your sources sheet with columns: Title, Region, Country, Language, URI

### Google Sheets Setup
1. Create a Google Cloud Project
2. Enable Google Sheets API and Google Drive API
3. Create OAuth2 credentials
4. Use the provided token generation script if needed

### RunChat Setup
1. Sign up at [RunChat](https://runchat.app/)
2. Create analysis flows
3. Get your API token and flow IDs

## Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables
See `EVENT_REGISTRY_CONFIG.md` for detailed configuration options.

## Troubleshooting

### Common Issues

**"Request entity too large" error:**
- The server is configured to handle large payloads (50MB limit)
- If you still encounter issues, try reducing batch sizes

**Google Sheets authentication issues:**
- Ensure your OAuth2 credentials are correctly configured
- Check that your refresh token is valid
- Verify API permissions in Google Cloud Console

**Event Registry API errors:**
- Verify your API key is correct
- Check rate limits and quotas
- Ensure your sources sheet is properly formatted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section above
- Review the configuration documentation
- Open an issue on GitHub