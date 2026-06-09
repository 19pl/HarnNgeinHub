const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 5000;

// ให้ Express ให้บริการไฟล์ Static จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, '../public')));

// เมื่อเข้าเว็บไซต์ให้ส่งไฟล์ index.html กลับไป
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
