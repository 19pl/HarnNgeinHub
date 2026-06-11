const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/database');

// Only load dotenv locally. Vercel manages environment variables in its dashboard.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database connection globally so Vercel can reuse it on warm starts
connectDB();

// ============================
// 🛡️ Security Middleware
// ============================

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

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? false // Same-origin only in production
        : `http://localhost:${PORT}`,
    credentials: true,
}));

// Rate Limiter: Global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Rate Limiter: Write operations
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

app.use(express.json({ limit: '10kb' }));

// ============================
// API Routes
// ============================

app.use('/api/groups', writeLimiter);
app.use('/api/expenses', writeLimiter);

app.use('/api', require('./src/routes/api'));

// 404 handler for unmatched /api/* routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// ============================
// Static Frontend & Server Setup
// ============================

// If VERCEL env is NOT present, run as a standard local Node server
if (!process.env.VERCEL) {
    // 🏠 LOCAL DEVELOPMENT
    app.use(express.static(path.join(__dirname, '../public')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });

    app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`);
        console.log(`🛡️  Helmet, CORS, and Rate Limiting are ACTIVE`);
    });
}

// Export the Express app so Vercel's Serverless Functions can consume it
module.exports = app;