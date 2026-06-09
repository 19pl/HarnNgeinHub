const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    // groupId ใช้ String เพื่อรองรับ UUIDv4 ที่ใช้ใน Group model
    groupId: {
        type: String,
        required: true,
        ref: 'Group',
    },
    payer: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Payer name must not exceed 100 characters'],
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be greater than 0'],
        max: [10000000, 'Amount must not exceed 10,000,000'],
    },
    detail: {
        type: String,
        trim: true,
        maxlength: [500, 'Detail must not exceed 500 characters'],
        default: '',
    },
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
