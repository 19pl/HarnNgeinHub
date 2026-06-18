const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { signUserToken } = require('../middleware/userAuth');

// ============================
// 📝 สมัครสมาชิก (Register)
// ============================
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : null;
        const password = typeof req.body.password === 'string' ? req.body.password : null;
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'กรุณากรอกอีเมลที่ถูกต้อง' });
        }

        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }
        if (password.length > 128) {
            return res.status(400).json({ error: 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร' });
        }

        // ตรวจสอบ email ซ้ำ
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        // สร้าง user ใหม่
        const user = new User({
            email,
            passwordHash: password, // pre-save hook จะ hash ให้
            name: name || email.split('@')[0], // ใช้ส่วนแรกของอีเมลเป็นชื่อเริ่มต้น
        });
        await user.save();

        // สร้าง JWT token
        const token = signUserToken(user);

        // ตั้ง cookie
        res.cookie('userToken', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
        });

        res.status(201).json({
            ok: true,
            user: user.toJSON(),
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
});

// ============================
// 🔑 เข้าสู่ระบบ (Login)
// ============================
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : null;
        const password = typeof req.body.password === 'string' ? req.body.password : null;

        if (!email || !password) {
            return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }

        // ค้นหา user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจสอบว่า user มี password (อาจสมัครผ่าน Google อย่างเดียว)
        if (!user.passwordHash) {
            return res.status(401).json({ error: 'บัญชีนี้ใช้ Google Sign‑In กรุณาเข้าสู่ระบบด้วย Google' });
        }

        // เปรียบเทียบ password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง JWT token
        const token = signUserToken(user);

        // ตั้ง cookie
        res.cookie('userToken', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            ok: true,
            user: user.toJSON(),
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
});

// ============================
// 🚪 ออกจากระบบ (Logout)
// ============================
// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('userToken');
    res.json({ ok: true });
});

// ============================
// 👤 ดึงข้อมูลผู้ใช้ปัจจุบัน (Me)
// ============================
// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies?.userToken ||
            (req.headers.authorization || '').replace(/^Bearer\s+/, '');

        if (!token) {
            return res.json({ loggedIn: false });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);

        if (!user) {
            return res.json({ loggedIn: false });
        }

        res.json({
            loggedIn: true,
            user: user.toJSON(),
        });
    } catch (err) {
        res.json({ loggedIn: false });
    }
});

module.exports = router;
