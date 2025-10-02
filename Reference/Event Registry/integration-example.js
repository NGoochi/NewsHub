// Example of how to integrate the Event Registry Express app into a larger application

const express = require('express');
const path = require('path');

// Import the Event Registry app
const eventRegistryApp = require('./app');

// Create your main application
const mainApp = express();

// Your existing routes
mainApp.get('/', (req, res) => {
    res.send(`
        <h1>My Main Application</h1>
        <p>Welcome to my application!</p>
        <ul>
            <li><a href="/event-registry">Event Registry Interface</a></li>
            <li><a href="/api/health">Health Check</a></li>
        </ul>
    `);
});

mainApp.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Main Application',
        timestamp: new Date().toISOString() 
    });
});

// Mount the Event Registry app at a specific path
mainApp.use('/event-registry', eventRegistryApp);

// Alternative: Mount just the API endpoints
// mainApp.use('/api/event-registry', eventRegistryApp);

// Alternative: Mount at root (be careful with route conflicts)
// mainApp.use('/', eventRegistryApp);

// Start the combined application
const PORT = process.env.PORT || 3000;
mainApp.listen(PORT, () => {
    console.log(`🚀 Main application running on port ${PORT}`);
    console.log(`📊 Event Registry interface: http://localhost:${PORT}/event-registry`);
    console.log(`🔧 Event Registry API: http://localhost:${PORT}/event-registry/api/event-registry/fetch`);
});

// Example of using the Event Registry API from another service
async function fetchArticlesFromEventRegistry(requestBody) {
    try {
        const response = await fetch(`http://localhost:${PORT}/event-registry/api/event-registry/fetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requestBody: JSON.stringify(requestBody) })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching articles:', error);
        throw error;
    }
}

// Example usage
const exampleRequest = {
    query: {
        $query: {
            $and: [
                {
                    conceptUri: "http://en.wikipedia.org/wiki/Climate_change"
                },
                {
                    dateStart: "2024-01-01",
                    dateEnd: "2024-01-31"
                }
            ]
        }
    },
    resultType: "articles",
    articlesPage: 1,
    articlesCount: 10,
    articlesSortBy: "date",
    apiKey: "your-api-key-here"
};

// Uncomment to test the API call
// fetchArticlesFromEventRegistry(exampleRequest)
//     .then(data => console.log('Articles fetched:', data))
//     .catch(error => console.error('Error:', error));

module.exports = mainApp;
