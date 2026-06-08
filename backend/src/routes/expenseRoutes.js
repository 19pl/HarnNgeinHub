const express = require('express');
const router = express.Router();
const { addExpense, getExpensesByGroup } = require('../controllers/expenseController');

router.route('/')
    .post(addExpense);

router.route('/group/:groupId')
    .get(getExpensesByGroup);

module.exports = router;
