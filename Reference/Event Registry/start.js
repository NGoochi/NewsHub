#!/usr/bin/env node

// Simple startup script for the Event Registry Express app
const app = require('./app');

// Set default environment variables if not set
if (!process.env.PORT) {
    process.env.PORT = 3000;
}

if (!process.env.EVENT_REGISTRY_API_URL) {
    process.env.EVENT_REGISTRY_API_URL = 'https://eventregistry.org/api/v1/article/getArticles';
}

console.log('🚀 Starting Event Registry Express Application...');
console.log(`📡 Server will run on port ${process.env.PORT}`);
console.log(`🌐 Event Registry API: ${process.env.EVENT_REGISTRY_API_URL}`);
console.log('📋 Make sure to set your API keys in environment variables');
console.log('');

// Start the server with error handling
const server = app.listen(process.env.PORT, (err) => {
    if (err) {
        console.error('❌ Failed to start server:', err.message);
        if (err.code === 'EADDRINUSE') {
            console.log(`💡 Port ${process.env.PORT} is already in use. Try a different port:`);
            console.log(`   PORT=3001 npm start`);
            console.log(`   or`);
            console.log(`   PORT=8080 npm start`);
        }
        process.exit(1);
    }
    
    console.log(`✅ Server running at http://localhost:${process.env.PORT}`);
    console.log(`📊 Health check: http://localhost:${process.env.PORT}/health`);
    console.log('');
    console.log('🔧 Available endpoints:');
    console.log('   GET  /                    - Main interface');
    console.log('   GET  /health              - Health check');
    console.log('   POST /api/event-registry/fetch - Fetch articles');
    console.log('   POST /api/sheets/upload-key     - Upload service account key');
    console.log('   POST /api/sheets/sources       - Fetch sources');
    console.log('   POST /api/sheets/write-articles - Write articles to sheets');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
