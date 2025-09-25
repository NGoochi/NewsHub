# Second-pass: UI + RunChat integration + Run Analysis

## New environment variables
- RUNCHAT_API_TOKEN : Bearer token for RunChat API.
- RUNCHAT_FLOW_ID  : ID of the RunChat workflow you will trigger.
- Optionally RUNCHAT_SESSION_ID : runchat_instance_id to continue existing runs.

## Notes
- This pass POSTS selected article data to your RunChat flow as `inputs.articles`. If your RunChat workflow expects named parameter IDs, call the Schema endpoint (GET /api/v1/{id}/schema) and map `inputs` accordingly. See RunChat docs for schema & run endpoints.
- Results are stored in project JSON (under `analysisRuns` and `article.analysisResult`) and a short preview is appended to the project's Google Sheet in a tab named `Analysis`.
- Keep your RunChat token server-side. Do not expose it to the client.

## New Features Added

### Frontend Pages
- **Dashboard** (`/pages/index.tsx`): Create and list projects
- **Project Page** (`/pages/projects/[slug].tsx`): View articles, add articles, run analysis

### API Endpoints
- `GET /api/projects/list` - List all projects
- `GET /api/projects/[slug]` - Get individual project
- `POST /api/projects/[slug]/articles/add` - Add article to project
- `POST /api/projects/[slug]/run-analysis` - Run analysis on selected articles

### RunChat Integration
- `lib/runchat.ts` - Wrapper for RunChat API calls
- Server-side only - tokens never exposed to client
- Supports both parameter-based and webhook flows

### Google Sheets Integration
- `writeAnalysisToSheet()` - Writes analysis results to project spreadsheet
- Creates "Analysis" tab if it doesn't exist
- Appends analysis data with article metadata

## Usage

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000` to see the dashboard
3. Create a new project
4. Navigate to the project page
5. Add articles manually or via API
6. Select articles and run analysis
7. Results are saved to both project JSON and Google Sheet

## API Examples

### Create Project
```bash
curl -X POST http://localhost:3000/api/projects/create \
  -H "Content-Type: application/json" \
  -d '{"name": "AI Research", "queries": ["machine learning", "AI trends"]}'
```

### Add Article
```bash
curl -X POST http://localhost:3000/api/projects/my-project-abc123/articles/add \
  -H "Content-Type: application/json" \
  -d '{"title": "AI Breakthrough", "url": "https://example.com", "content": "Article content..."}'
```

### Run Analysis
```bash
curl -X POST http://localhost:3000/api/projects/my-project-abc123/run-analysis \
  -H "Content-Type: application/json" \
  -d '{"articleIds": ["article-1", "article-2"]}'
```
