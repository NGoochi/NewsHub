const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for file uploads (service account keys)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 // 1MB limit for service account keys
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed for service account keys'), false);
        }
    }
});

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// Routes
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Event Registry Interface',
        pageTitle: 'Event Registry - Complete Interface'
    });
});

// API Routes
app.post('/api/event-registry/fetch', async (req, res) => {
    try {
        const { requestBody } = req.body;
        
        if (!requestBody) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        // Validate JSON
        let parsedBody;
        try {
            parsedBody = JSON.parse(requestBody);
        } catch (error) {
            return res.status(400).json({ 
                error: 'Invalid JSON format', 
                details: error.message 
            });
        }

        // Make request to Event Registry API
        const response = await fetch(process.env.EVENT_REGISTRY_API_URL || 'https://eventregistry.org/api/v1/article/getArticles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ 
            error: 'Failed to fetch articles', 
            details: error.message 
        });
    }
});

// Google Sheets API routes
app.post('/api/sheets/upload-key', upload.single('serviceAccountKey'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse the uploaded JSON file
        const keyData = JSON.parse(req.file.buffer.toString());
        
        // Store the key data in session or memory (in production, use secure storage)
        req.session = req.session || {};
        req.session.serviceAccountKey = keyData;

        res.json({ 
            success: true, 
            message: 'Service account key uploaded successfully',
            keyInfo: {
                type: keyData.type,
                project_id: keyData.project_id,
                client_email: keyData.client_email
            }
        });

    } catch (error) {
        console.error('Error processing service account key:', error);
        res.status(400).json({ 
            error: 'Invalid service account key file', 
            details: error.message 
        });
    }
});

app.post('/api/sheets/sources', async (req, res) => {
    try {
        const { sheetId, range } = req.body;
        
        if (!req.session?.serviceAccountKey) {
            return res.status(400).json({ error: 'Service account key not loaded' });
        }

        // This would integrate with your existing sheets-api.js logic
        // For now, return a placeholder response
        res.json({
            success: true,
            sources: [
                { name: 'BBC News', region: 'Europe', country: 'UK', language: 'English' },
                { name: 'CNN', region: 'North America', country: 'USA', language: 'English' },
                { name: 'Reuters', region: 'Europe', country: 'UK', language: 'English' }
            ]
        });

    } catch (error) {
        console.error('Error fetching sources:', error);
        res.status(500).json({ 
            error: 'Failed to fetch sources', 
            details: error.message 
        });
    }
});

app.post('/api/sheets/write-articles', async (req, res) => {
    try {
        const { articles, sheetId } = req.body;
        
        if (!req.session?.serviceAccountKey) {
            return res.status(400).json({ error: 'Service account key not loaded' });
        }

        // This would integrate with your existing sheets writing logic
        // For now, return a success response
        res.json({
            success: true,
            message: `Successfully wrote ${articles.length} articles to Google Sheets`,
            articlesWritten: articles.length
        });

    } catch (error) {
        console.error('Error writing articles to sheets:', error);
        res.status(500).json({ 
            error: 'Failed to write articles to sheets', 
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
