# Event Registry Express.js Project Structure

## Cleaned Up Project Structure

After converting to Express.js and removing unnecessary files, the project now has a clean, organized structure:

```
├── app.js                          # Main Express application
├── start.js                        # Startup script with logging
├── integration-example.js          # Example of integrating into larger apps
├── package.json                    # Dependencies and scripts
├── package-lock.json               # Dependency lock file
├── env.example                     # Environment variables template
├── README.md                       # Original project README
├── README_EXPRESS.md               # Express.js documentation
├── PROJECT_STRUCTURE.md            # This file
├── node_modules/                   # Dependencies (auto-generated)
├── views/
│   └── index.ejs                   # Main application template
└── public/
    ├── css/                        # CSS files (empty, styles in EJS)
    └── js/
        ├── api-client.js           # Express API client
        ├── config.js               # Configuration file
        ├── event-registry-api-express.js # Event Registry API (Express version)
        ├── main.js                 # Main application logic
        ├── request-builder.js      # Request builder functionality
        ├── sheets-api.js           # Google Sheets integration
        └── source-based-api.js     # Source-based API
```

## Files Removed During Cleanup

### HTML Files (Replaced by EJS Template)
- ❌ `merged-interface.html`
- ❌ `request-builder.html`
- ❌ `event_registry_api.html`

### Duplicate JavaScript Files (Moved to public/js/)
- ❌ `event-registry-api.js` (root)
- ❌ `request-builder.js` (root)
- ❌ `sheets-api.js` (root)
- ❌ `source-based-api.js` (root)
- ❌ `main.js` (root)
- ❌ `config.js` (root)
- ❌ `public/js/event-registry-api.js` (old version)

### Outdated Documentation
- ❌ `README_MERGED_INTERFACE.md`
- ❌ `README_REQUEST_BUILDER.md`
- ❌ `README_SOURCE_BASED_API.md`
- ❌ `CONFIGURATION_GUIDE.md`
- ❌ `SHEET_APPENDING_FIX.md`

### Other Unnecessary Files
- ❌ `Request Demo/` (directory)
- ❌ `18AUG251740_NAPI_Dev.code-workspace`

## Current File Count

**Total files in project:** 12 core files + node_modules
- **Core application files:** 8
- **Documentation files:** 3
- **Configuration files:** 1
- **Dependencies:** node_modules (auto-generated)

## Benefits of Cleanup

1. **Reduced Complexity:** Eliminated duplicate files and outdated documentation
2. **Clear Structure:** Organized files logically with Express.js conventions
3. **Easier Maintenance:** Single source of truth for each component
4. **Better Integration:** Ready for integration into larger applications
5. **Reduced Confusion:** No conflicting versions of the same functionality

## Next Steps

The project is now clean and ready for:
- Development: `npm run dev`
- Production: `npm start`
- Integration: Use `integration-example.js` as a guide
- Deployment: Follow `README_EXPRESS.md` instructions
