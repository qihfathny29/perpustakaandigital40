require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const borrowRoutes = require('./routes/borrow');
const requestRoutes = require('./routes/requests');
const testimonialRoutes = require('./routes/testimonials');
const readingRoutes = require('./routes/reading');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://localhost:5173',
        'http://192.168.1.100:5173',
        'http://172.22.5.120:5173',
        'http://172.22.7.80:5173',    // ← IP baru
        'https://172.22.7.80:5173',   // ← HTTPS version
        /https:\/\/.*\.ngrok\.io$/,  // ← Allow all ngrok domains
        /https:\/\/.*\.ngrok-free\.app$/  // ← New ngrok domains
    ],
    credentials: true 
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/reading', readingRoutes);

// Basic route untuk test
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Perpustakaan Digital API is running!',
        status: 'success',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            books: '/api/books',
            borrow: '/api/borrow',
            health: '/health',
            testDb: '/test-db'
        }
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
        console.log('🔄 Testing database connection...');
        await testConnection();
        
        // Initialize database tables
        console.log('🔄 Initializing database tables...');
        const Testimonial = require('./models/Testimonial');
        await Testimonial.createTable();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Server is running!');
            console.log(`📍 Local: http://localhost:${PORT}`);
            
            // Show network interfaces
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            Object.keys(networkInterfaces).forEach(interfaceName => {
                networkInterfaces[interfaceName].forEach(netInterface => {
                    if (netInterface.family === 'IPv4' && !netInterface.internal) {
                        console.log(`📱 Network: http://${netInterface.address}:${PORT}`);
                    }
                });
            });
            
            console.log(`🗃️  Database: ${process.env.DB_DATABASE}`);
            console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('\n📋 Available endpoints:');
            console.log(`   POST http://localhost:${PORT}/api/auth/register`);
            console.log(`   POST http://localhost:${PORT}/api/auth/login`);
            console.log(`   GET  http://localhost:${PORT}/api/auth/profile`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

startServer();