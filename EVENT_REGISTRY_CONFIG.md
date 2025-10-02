# Event Registry Integration Configuration

## Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# Event Registry API Key (get from https://eventregistry.org/)
EVENT_REGISTRY_API_KEY=your_event_registry_api_key_here

# Google Sheets ID containing the sources list
# This should be a sheet with columns: Title, Region, Country, Language, URI
EVENT_REGISTRY_SOURCES_SHEET_ID=your_source_sheet_here

# Range in the sources sheet (e.g., 'Sheet1!A2:E' for columns A-E starting from row 2)
EVENT_REGISTRY_SOURCES_RANGE=NewsAPI_Sources!A2:E

# Event Registry API Configuration (optional - defaults provided)
EVENT_REGISTRY_ARTICLES_PER_PAGE=100
EVENT_REGISTRY_REQUEST_DELAY_MS=1000
EVENT_REGISTRY_MAX_RETRIES=3
EVENT_REGISTRY_TIMEOUT_MS=30000
```

## Configuration Notes

- **All configuration is now handled via environment variables** - no separate config files needed
- **Optional parameters** have sensible defaults and don't need to be set unless you want to customize them
- **API key and sources sheet** are required for the Event Registry integration to work

## Google Sheets Sources Format

Your sources sheet should have the following columns:
- **Column A**: Source Title (e.g., "BBC News")
- **Column B**: Region (e.g., "Europe")
- **Column C**: Country (e.g., "United Kingdom")
- **Column D**: Language (e.g., "English")
- **Column E**: Source URI (e.g., "bbc.com")

## Features

### 1. Request Builder
- **Simple Search**: Enter multiple search terms (one per line)
- **Boolean Query**: Use complex boolean queries with AND, OR, NOT operators

### 2. Source Selection
- Loads sources from your configured Google Sheet
- Filter by region, country, and language
- Select multiple sources for your search

### 3. Date Range
- Select start and end dates for article search
- Defaults to last 30 days

### 4. Article Fetching
- Fetches ALL articles matching criteria (uses pagination)
- No limit on number of articles
- Handles rate limiting automatically

### 5. Sheet Integration
- Writes articles to your project's Google Sheet
- Format: Article ID, Source, Title, Authors, URL, Content, Date, Input Method
- Appends to existing "Articles" tab

## Usage

1. **Configure Environment**: Set up the required environment variables
2. **Load Sources**: Click "Load Sources" to fetch available news sources
3. **Set Search Criteria**: Choose search mode and enter terms
4. **Select Sources**: Check the news sources you want to search
5. **Set Date Range**: Choose the time period for articles
6. **Fetch Articles**: Click "Fetch Articles" to retrieve articles
7. **Write to Sheet**: Click "Write to Sheet" to save articles to your project

## API Endpoints

- `GET /api/event-registry/sources` - Get available sources
- `POST /api/event-registry/fetch-articles` - Fetch articles from Event Registry
- `POST /api/event-registry/write-to-sheet` - Write articles to project sheet
