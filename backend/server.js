const express = require('express');
const path = require('path');
const connectDB = require('./src/config/database');

// Load env variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing JSON
app.use(express.json());

// API Routes
app.use('/api', require('./src/routes/api'));

// ให้ Express ให้บริการไฟล์ Static จากโฟลเดอร์ public (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// เมื่อเข้าเว็บไซต์ให้ส่งไฟล์ index.html กลับไป
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const startServer = async () => {
    // 1. Connect to MongoDB first
    await connectDB();
    
    // 2. Start server
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();
