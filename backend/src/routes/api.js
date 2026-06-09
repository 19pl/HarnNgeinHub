const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Group = require('../models/Group');
const Expense = require('../models/Expense');

const JWT_SECRET = process.env.JWT_SECRET;

// ============================
// 🔐 Group-Level JWT Middleware
// ============================
// ตรวจสอบว่า request มี token ของกลุ่มที่ถูกต้อง
// และ groupId ใน token ตรงกับ groupId ที่ร้องขอ
function requireGroupToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // ตรวจสอบว่า token ของกลุ่มนี้จริงๆ
        const groupIdFromParam = req.params.groupId || req.body.groupId;
        if (decoded.groupId !== groupIdFromParam) {
            return res.status(403).json({ error: 'Forbidden: Token does not match this group' });
        }
        req.groupId = decoded.groupId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

// ============================
// 📌 1. Create a new group
// ============================
// POST /api/groups — Public (no token needed, just creating)
router.post('/groups', async (req, res) => {
    try {
        // รับเฉพาะ field ที่อนุญาต (ป้องกัน Mass Assignment)
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : null;
        const members = req.body.members;

        // Validate input
        if (!name || name.length === 0) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        if (name.length > 100) {
            return res.status(400).json({ error: 'Group name must not exceed 100 characters' });
        }
        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: 'At least one member is required' });
        }
        if (members.length > 50) {
            return res.status(400).json({ error: 'Group cannot have more than 50 members' });
        }
        // Sanitize members array: รับแค่ string, ตัด whitespace
        const sanitizedMembers = members
            .filter(m => typeof m === 'string' && m.trim().length > 0)
            .map(m => m.trim().substring(0, 100));

        if (sanitizedMembers.length === 0) {
            return res.status(400).json({ error: 'At least one valid member name is required' });
        }

        const newGroup = new Group({ name, members: sanitizedMembers });
        await newGroup.save();

        // ออก JWT token สำหรับกลุ่มนี้ (หมดอายุ 7 วัน)
        const token = jwt.sign(
            { groupId: newGroup._id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            id: newGroup._id,
            name: newGroup.name,
            members: newGroup.members,
            token, // ส่ง token กลับไปให้ frontend เก็บ
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================
// 📌 2. Add an expense
// ============================
// POST /api/expenses — 🔐 Requires Group Token
router.post('/expenses', (req, res, next) => {
    // inject groupId from body into params for middleware check
    req.params.groupId = req.body.groupId;
    next();
}, requireGroupToken, async (req, res) => {
    try {
        // รับเฉพาะ field ที่อนุญาต (ป้องกัน Mass Assignment)
        const groupId = typeof req.body.groupId === 'string' ? req.body.groupId.trim() : null;
        const payer = typeof req.body.payer === 'string' ? req.body.payer.trim() : null;
        const rawAmount = req.body.amount;
        const detail = typeof req.body.detail === 'string' ? req.body.detail.trim().substring(0, 500) : '';

        // Validate groupId
        if (!groupId) {
            return res.status(400).json({ error: 'groupId is required' });
        }
        // Validate payer
        if (!payer || payer.length === 0) {
            return res.status(400).json({ error: 'Payer is required' });
        }
        // Validate amount เป็นตัวเลข, มากกว่า 0, ไม่ใช่ Infinity/NaN
        const amount = Number(rawAmount);
        if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        if (amount > 10000000) {
            return res.status(400).json({ error: 'Amount must not exceed 10,000,000' });
        }

        // ตรวจสอบว่า group นั้นมีอยู่จริง
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // ตรวจสอบว่า payer เป็นสมาชิกในกลุ่ม
        if (!group.members.includes(payer)) {
            return res.status(400).json({ error: 'Payer must be a member of the group' });
        }

        const newExpense = new Expense({ groupId, payer, amount, detail });
        await newExpense.save();

        res.status(201).json({ success: true, expense: newExpense });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================
// 📌 3. Get summary for a group
// ============================
// GET /api/summary/:groupId — 🔐 Requires Group Token
router.get('/summary/:groupId', requireGroupToken, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const expenses = await Expense.find({ groupId });

        let totalExpense = 0;
        const paidByMember = {};
        group.members.forEach(m => paidByMember[m] = 0);

        expenses.forEach(e => {
            totalExpense += e.amount;
            if (paidByMember[e.payer] !== undefined) {
                paidByMember[e.payer] += e.amount;
            }
        });

        const perPerson = group.members.length > 0 ? totalExpense / group.members.length : 0;

        // คำนวณว่าใครติดหนี้ใคร
        const balances = {};
        group.members.forEach(m => {
            balances[m] = paidByMember[m] - perPerson;
        });

        const debtors = [];
        const creditors = [];

        for (const m in balances) {
            if (balances[m] < -0.01) debtors.push({ name: m, amount: -balances[m] });
            else if (balances[m] > 0.01) creditors.push({ name: m, amount: balances[m] });
        }

        const transactions = [];
        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(debtor.amount, creditor.amount);

            transactions.push({ from: debtor.name, to: creditor.name, amount });

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        res.json({ totalExpense, perPerson, transactions, expenses });
    } catch (error) {
        console.error('Error getting summary:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
