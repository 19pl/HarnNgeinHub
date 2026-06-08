const Group = require('../models/Group');
const Expense = require('../models/Expense');

// @desc    Get summary and balances for a group
// @route   GET /api/summary/:groupId
// @access  Public (for now)
const getGroupSummary = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        
        // 1. Fetch group to get members
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        // 2. Fetch all expenses for this group
        const expenses = await Expense.find({ group: groupId }).sort('createdAt');
        
        // Calculate total expenses
        let totalExpense = 0;
        expenses.forEach(exp => {
            totalExpense += exp.amount;
        });

        // Calculate per person average (assuming split equally among all members if splitBetween is empty)
        const memberCount = group.members.length;
        const perPerson = memberCount > 0 ? totalExpense / memberCount : 0;

        // Calculate balances (who owes how much)
        // Positive balance = owes money (needs to pay)
        // Negative balance = is owed money (needs to receive)
        const balances = {};
        group.members.forEach(m => { balances[m] = 0; });

        expenses.forEach(exp => {
            // The payer is owed this amount (balance goes down/negative)
            if (balances[exp.payer] !== undefined) {
                balances[exp.payer] -= exp.amount;
            }

            // Everyone owes their share
            if (exp.splitBetween && exp.splitBetween.length > 0) {
                exp.splitBetween.forEach(split => {
                    if (balances[split.user] !== undefined) {
                        balances[split.user] += split.amount;
                    }
                });
            } else {
                // Split equally
                const equalShare = exp.amount / memberCount;
                group.members.forEach(m => {
                    balances[m] += equalShare;
                });
            }
        });

        // Calculate settlements using greedy algorithm
        const transactions = calculateSettlements(balances);

        // Format expenses for frontend
        const formattedExpenses = expenses.map(e => ({
            payer: e.payer,
            amount: e.amount,
            detail: e.detail,
            date: e.date || e.createdAt
        }));

        res.status(200).json({
            totalExpense,
            perPerson,
            transactions,
            expenses: formattedExpenses
        });

    } catch (error) {
        next(error);
    }
};

// Greedy algorithm to minimize number of transactions
function calculateSettlements(balances) {
    const debtors = [];
    const creditors = [];

    // Separate into those who owe (debtors) and those who are owed (creditors)
    for (const [person, balance] of Object.entries(balances)) {
        if (balance > 0.01) {
            debtors.push({ person, amount: balance });
        } else if (balance < -0.01) {
            creditors.push({ person, amount: -balance });
        }
    }

    // Sort descending by amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(debtor.amount, creditor.amount);
        
        // Only record transactions of at least 1 satang to avoid float precision weirdness
        if (amount >= 0.01) {
            transactions.push({
                from: debtor.person,
                to: creditor.person,
                amount: Math.round(amount * 100) / 100
            });
        }

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return transactions;
}

module.exports = {
    getGroupSummary
};
