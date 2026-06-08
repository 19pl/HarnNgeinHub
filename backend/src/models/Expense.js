const mongoose = require('mongoose');

const splitEntrySchema = new mongoose.Schema({
    user: {
        type: String, // String because members are currently just string names
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    title: {
        type: String,
        trim: true
    },
    detail: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Please add an amount']
    },
    payer: {
        type: String, // String because payer is a name in current frontend
        required: [true, 'Please specify who paid']
    },
    splitBetween: [splitEntrySchema], // If empty, it means split equally among all members
    category: {
        type: String,
        default: 'General'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
