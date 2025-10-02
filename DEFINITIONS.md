# NewsHub - Application Definitions

This file contains definitions and data structures specific to the NewsHub application to help with development and communication.

## Data Flow

### Article Processing Pipeline
1. **Boolean Search** → Event Registry API returns articles
2. **Article Data Written to Sheet** → Data saved to Google Sheets "Articles" tab  
3. **Sheet Data Retrieved** → Data pulled back from Google Sheets
4. **Articles Displayed** → Same data shown in beautiful card format
5. **Analysis Selection** → User selects articles for analysis
6. **RunChat API Call** → Selected articles sent to RunChat for processing
7. **Results Written** → Analysis results written to Categorised and Quotes tabs

### Analysis Process
- **Input**: Selected article IDs from the project page
- **Sheet Mapping**: Article ID + 1 = Sheet row (due to header row) - **NEVER CHANGES**
- **Smart Range Grouping**: 
  - Consecutive articles (4,5,6) → `Articles!A4:H6` (single range)
  - Non-consecutive articles (4,6,8) → `Articles!A4:H4`, `Articles!A6:H6`, `Articles!A8:H8` (separate ranges)
- **Google Sheets API Format**: Uses Google Sheets API URL with batchGet endpoint
- **RunChat Inputs**:
  - `sheetid`: Project's Google Sheet ID
  - `SheetRequest`: Google Sheets API URL (e.g., `https://sheets.googleapis.com/v4/spreadsheets/{ID}/values:batchGet?ranges=Articles!A2:H2&ranges=Articles!A4:H4&valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`)
- **RunChat Outputs**:
  - `responseQuotes`: Data for Quotes tab
  - `responseCategories`: Data for Categorised tab

### Article Tracking System
- **SheetArticles**: New project data structure tracking articles from Google Sheets
- **Fields**: 
  - `id`: Numerical ID from sheet (row - 1)
  - `title`: Article title from sheet
  - `status`: 'Retrieved' or 'Analysed'
- **Sync Process**: Articles synced from sheet only after `writeToSheet` operation
- **Status Updates**: Articles marked as 'Analysed' after successful RunChat processing
- **Status Display**: Article tiles show actual status from sheetArticles data
  - 'Retrieved' (red badge) - Article fetched but not analyzed
  - 'Analysed' (green badge) - Article has been processed by RunChat
- **Drive Sync**: Updated project files are saved to both local storage and Google Drive

### Project Info Feature
- **Dashboard Button**: "Project Info" button on each project card
- **Project Page Button**: "📋 Project Info" button in project header
- **API Endpoint**: `/api/projects/:slug/info` serves project JSON file
- **Download**: Opens project data as downloadable JSON file
- **Filename**: `{Project Name}-project-info.json`

### RunChat Integration
- **API Endpoint**: `https://runchat.app/api/v1/{runchat_id}`
- **Authentication**: Bearer token using `RUNCHAT_API_KEY`
- **Request Format**: POST with `inputs` object containing `sheetid` and `SheetRequest`
- **Response**: Returns analysis results for Categorised and Quotes tabs
- **Order of Operations**:
  1. User selects articles for analysis
  2. Frontend shows confirmation popup with selected articles
  3. Backend formats Google Sheets API request for selected articles
  4. Backend sends formatted request to RunChat API
  5. RunChat processes articles and returns analysis results

## Google Sheets Structure

### Project Sheet Structure
Each project has a copy of the 'master sheet' made when created. The 'project sheet' contains all data for that specific project.

### Master Sheet Template
- **Source**: Master spreadsheet template (defined in MASTER_SHEET_ID env var)
- **Copy Process**: When a project is created, the master sheet is duplicated
- **Naming**: Copy gets named "{Project Name} — {Timestamp}"
- **Storage**: Copy is stored in the Projects folder in Google Drive

### Project Sheet Pages
- **Articles** - Main article data (populated by Event Registry searches)
- **Categorised** - For future categorization features
- **Quotes** - For future quote extraction features

### Articles Tab Columns
- **Column A**: ID - Numerical ID identifying the article
- **Column B**: News Outlet - Name of article source
- **Column C**: Article Title - Article Title
- **Column D**: Article Author/s - Article author
- **Column E**: Article URL - Article source URL
- **Column F**: Full Body Text - The full body text of the article
- **Column G**: Date Written - Date written
- **Column H**: Input Method - API source

## Article Card Display

### Card Layout
- **Top-left**: Small grey ID number (from Column A)
- **Main content**: 
  - Black article title (from Column C)
  - News outlet and author (from Columns B & D)
  - Date written (from Column G)
  - Blue "View Original Article" button (from Column E)
  - "Pending" status badge
- **Bottom section**: 
  - "Full Body Text: [first 50 words from Column F...]"

### Status Meanings
- **Pending**: Article hasn't been analyzed yet
- **Complete**: Article has been analyzed (when analysis is run on selected articles)

## Features

### Auto-Write to Sheet
- **Default**: ON (checked by default)
- **When ON**: Articles automatically written to sheet after fetching, "Write to Sheet" button hidden
- **When OFF**: Manual "Write to Sheet" button appears

### Search Input Preservation
- Search parameters (terms, sources, dates) are preserved after writing to sheet
- Page doesn't reload, only articles section updates

## API Endpoints

### Sheet Data
- **GET** `/api/projects/:slug/sheet-data` - Retrieves data from Google Sheets Articles tab
- **Range**: `Articles!A:Z` (all columns from Articles tab)

## File Structure

### Key Files
- `src/views/project.ejs` - Main project page template
- `src/routes/api.ts` - API endpoints
- `src/lib/googleDriveStorage.ts` - Google Sheets integration
- `src/routes/eventRegistry.ts` - Event Registry API integration

## Development Notes

### Template Updates
- Changes to `project.ejs` require server restart
- Browser caching may require hard refresh (Ctrl+F5)
- Template uses EJS syntax with server-side rendering

### Data Sources
- **Articles**: Always from Google Sheets, never from local project.articles
- **Sheet Data**: Raw data from Google Sheets for debugging
- **Event Registry**: External API for article fetching
