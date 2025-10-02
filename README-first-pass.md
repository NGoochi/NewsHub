# First-pass: Project creation + sheet duplication

## Setup
1. `npm install` (Next.js + googleapis + nanoid)
2. Add `.env` variables (copy `env.example`).
3. Provide Google service account credentials:
   - Share your MASTER_SHEET with the service account email.
   - Either set GOOGLE_SERVICE_ACCOUNT_KEY_PATH to the JSON key, or set GOOGLE_SERVICE_ACCOUNT_KEY to a base64-encoded JSON string.
4. Start dev server: `npm run dev`.

## API Usage

### Create a new project
```bash
curl -X POST http://localhost:3000/api/projects/create \
  -H "Content-Type: application/json" \
  -d '{"name": "My Research Project", "queries": ["AI trends", "machine learning"]}'
```

## File Structure
- `/data/projects/[slug].json` - One JSON file per project containing metadata and arrays
- `/lib/db.ts` - Database abstraction layer (easily swappable for SQL later)
- `/lib/googleSheets.ts` - Google Sheets integration for duplicating master template
- `/pages/api/projects/create.ts` - API endpoint for project creation

## Environment Variables
- `MASTER_SHEET_ID` - ID of the master template spreadsheet (must be shared with service account)
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` - Path to service account JSON key file
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Base64-encoded service account JSON key (alternative to key path)
- `SHARE_COPIES_PUBLIC` - Set to "true" to make copied sheets publicly viewable
