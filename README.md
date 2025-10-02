# NewsHub - Project Memory System

A research project management system with AI-powered article analysis, Google Sheets integration, and automated workflow processing.

## Features

- **Project Management**: Create and organize research projects
- **Article Collection**: Add and manage articles for each project
- **AI Analysis**: Integrate with RunChat for automated article analysis
- **Google Sheets Integration**: Automatic spreadsheet creation and data management
- **Express.js Backend**: Fast, scalable server with TypeScript support

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the project root with the following variables:

```bash
# Google OAuth2 credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token

# Master spreadsheet ID (template for new projects)
MASTER_SHEET_ID=your_master_sheet_id
SHARE_COPIES_PUBLIC=false

# RunChat integration (server-side only)
RUNCHAT_API_TOKEN=your_runchat_api_token
RUNCHAT_FLOW_ID=your_runchat_flow_id
RUNCHAT_SESSION_ID=
```

### 3. Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable **Google Drive API** and **Google Sheets API**
3. Create OAuth2 credentials (Web application)
4. Get your refresh token using the OAuth2 flow
4. Share your master spreadsheet with the Google account associated with the OAuth2 credentials

### 4. RunChat Setup

1. Get your API token from RunChat dashboard
2. Create or select a flow ID for article analysis
3. Optionally set a session ID for continuing existing runs

### 5. Start the Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Usage

1. **Dashboard**: Visit `http://localhost:3000` to create and manage projects
2. **Create Project**: Set up a new research project with Google Sheets integration
3. **Add Articles**: Collect articles manually or via API
4. **Run Analysis**: Use RunChat integration for AI-powered article analysis
5. **View Results**: Analysis results are saved to both project files and Google Sheets

## API Endpoints

- `GET /api/projects/list` - List all projects
- `POST /api/projects/create` - Create new project
- `GET /api/projects/:slug` - Get project details
- `POST /api/projects/:slug/articles/add` - Add article to project
- `POST /api/projects/:slug/run-analysis` - Run analysis on selected articles

## Project Structure

```
src/
├── server.ts          # Main Express server
├── routes/            # Route handlers
│   ├── projects.ts    # Page routes
│   └── api.ts         # API endpoints
├── lib/               # Business logic
│   ├── db.ts          # Database abstraction
│   ├── googleSheets.ts # Google Sheets integration
│   ├── runchat.ts     # RunChat API wrapper
│   └── slug.ts        # URL slug utilities
├── types/             # TypeScript definitions
└── views/             # EJS templates
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | ✅ | Google OAuth2 refresh token |
| `MASTER_SHEET_ID` | ✅ | ID of the master spreadsheet template |
| `SHARE_COPIES_PUBLIC` | ❌ | Set to "true" to make copied sheets public |
| `RUNCHAT_API_TOKEN` | ❌ | RunChat API token for analysis |
| `RUNCHAT_FLOW_ID` | ❌ | RunChat flow ID for analysis workflow |
| `RUNCHAT_SESSION_ID` | ❌ | Optional session ID for continuing runs |

## Development

This project uses:
- **Express.js** with TypeScript
- **EJS** templating engine
- **Google APIs** for Sheets integration
- **RunChat** for AI analysis
- **File-based storage** (easily swappable for database)

## Documentation

- **DEFINITIONS.md** - Application-specific definitions, data structures, and development notes
- **README-oauth-setup.md** - Google OAuth2 setup guide
- **README-EXPRESS-CONVERSION.md** - Express.js conversion notes

## License

Private project - All rights reserved
