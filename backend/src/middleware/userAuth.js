const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware สำหรับตรวจสอบ User JWT
 * อ่าน token จาก cookie 'userToken' หรือ Authorization header
 * ถ้าไม่มี token หรือ token ไม่ถูกต้อง → redirect ไปหน้า login
 */
function requireUserAuth(req, res, next) {
    // อ่าน token จาก cookie ก่อน แล้ว fallback ไป header
    const token = req.cookies?.userToken ||
        (req.headers.authorization || '').replace(/^Bearer\s+/, '');

    if (!token) {
        // ถ้าเป็น API request → ส่ง 401 JSON
        if (req.path.startsWith('/api')) {
            return res.status(401).json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบ' });
        }
        // ถ้าเป็นหน้าเว็บ → redirect ไปหน้า login
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { sub: userId, email, name }
        next();
    } catch (err) {
        console.warn('Invalid user JWT:', err.message);
        if (req.path.startsWith('/api')) {
            return res.status(401).json({ error: 'Unauthorized: Token ไม่ถูกต้องหรือหมดอายุ' });
        }
        return res.redirect('/login.html');
    }
}

/**
 * สร้าง JWT token สำหรับ User
 * @param {Object} user - Mongoose user document
 * @returns {string} JWT token
 */
function signUserToken(user) {
    return jwt.sign(
        { sub: user._id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = { requireUserAuth, signUserToken };
