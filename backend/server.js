require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route untuk test
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Perpustakaan Digital API is running!',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// Test database connection route
app.get('/test-db', async (req, res) => {
    try {
        await testConnection();
        res.json({
            message: '✅ Database connection successful!',
            status: 'success',
            database: process.env.DB_DATABASE,
            server: `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`
        });
    } catch (error) {
        res.status(500).json({
            message: '❌ Database connection failed!',
            status: 'error',
            error: error.message
        });
    }
});

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    try {
        // Test database connection first
        console.log('🔄 Testing database connection...');
        await testConnection();
        
        // Start server
        app.listen(PORT, () => {
            console.log('🚀 Server is running!');
            console.log(`📍 Local: http://localhost:${PORT}`);
            console.log(`🗃️  Database: ${process.env.DB_DATABASE}`);
            console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Start the server
startServer();