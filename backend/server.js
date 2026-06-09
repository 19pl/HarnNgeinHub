const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/database');

// Load env variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ============================
// 🛡️ Security Middleware
// ============================

// Helmet: Set security-related HTTP response headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
        },
    },
}));

// CORS: Allow only same-origin (since frontend is served by same server)
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? false // Same-origin only in production
        : `http://localhost:${PORT}`,
    credentials: true,
}));

// Rate Limiter: Global - max 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stricter rate limit for write operations: max 20 per 15 minutes
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many write requests, please slow down.' },
});

// ============================
// General Middleware
// ============================

app.use(express.json({ limit: '10kb' })); // Limit request body size

// ============================
// API Routes
// ============================

// Apply strict rate limiter to POST routes
app.use('/api/groups', writeLimiter);
app.use('/api/expenses', writeLimiter);

app.use('/api', require('./src/routes/api'));

// 404 handler for unmatched /api/* routes (do NOT fall through to frontend)
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// ============================
// Static Frontend
// ============================

app.use(express.static(path.join(__dirname, '../public')));

// Catch-all: return index.html for frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ============================
// Start Server
// ============================

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`);
        console.log(`🛡️  Helmet, CORS, and Rate Limiting are ACTIVE`);
    });
};

startServer();
