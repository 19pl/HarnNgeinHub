const Expense = require('../models/Expense');
const Group = require('../models/Group');

// @desc    Add new expense
// @route   POST /api/expenses
// @access  Public (for now)
const addExpense = async (req, res, next) => {
    try {
        const { groupId, payer, amount, detail, category, splitBetween } = req.body;

        if (!groupId || !payer || !amount) {
            return res.status(400).json({ success: false, message: 'Please provide groupId, payer, and amount' });
        }

        // Check if group exists
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const expense = await Expense.create({
            group: groupId,
            payer,
            amount: Number(amount),
            detail: detail || '',
            category,
            splitBetween: splitBetween || []
        });

        res.status(201).json({
            success: true,
            data: expense
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all expenses for a group
// @route   GET /api/expenses/group/:groupId
// @access  Public
const getExpensesByGroup = async (req, res, next) => {
    try {
        const expenses = await Expense.find({ group: req.params.groupId }).sort('-createdAt');

        res.status(200).json({
            success: true,
            count: expenses.length,
            data: expenses
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addExpense,
    getExpensesByGroup
};
