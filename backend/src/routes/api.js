const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Expense = require('../models/Expense');

// 1. Create a new group
router.post('/groups', async (req, res) => {
    try {
        const { name, members } = req.body;
        if (!name || !members || members.length === 0) {
            return res.status(400).json({ error: 'Name and members are required' });
        }

        const newGroup = new Group({ name, members });
        await newGroup.save();
        
        // Return .id (or ._id) to match frontend expectation
        res.status(201).json({ id: newGroup._id, name: newGroup.name, members: newGroup.members });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Add an expense
router.post('/expenses', async (req, res) => {
    try {
        const { groupId, payer, amount, detail } = req.body;
        if (!groupId || !payer || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newExpense = new Expense({ groupId, payer, amount, detail });
        await newExpense.save();
        res.status(201).json({ success: true, expense: newExpense });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Get summary for a group
router.get('/summary/:groupId', async (req, res) => {
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

        // Calculate who owes who
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

            transactions.push({
                from: debtor.name,
                to: creditor.name,
                amount: amount
            });

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        res.json({
            totalExpense,
            perPerson,
            transactions,
            expenses
        });
    } catch (error) {
        console.error('Error getting summary:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
