const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a group name'],
        trim: true
    },
    members: [{
        type: String,
        required: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Not required for now to support public access
    }
}, {
    timestamps: true
});

// Virtual field for expenses
groupSchema.virtual('expenses', {
    ref: 'Expense',
    localField: '_id',
    foreignField: 'group',
    justOne: false
});

// Enable virtuals when converting to JSON
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Group', groupSchema);
