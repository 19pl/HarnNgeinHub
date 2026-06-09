const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const GroupSchema = new mongoose.Schema({
    // ใช้ UUID v4 แทน MongoDB ObjectId เพื่อป้องกัน ObjectId Enumeration
    _id: {
        type: String,
        default: uuidv4,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Group name must not exceed 100 characters'],
    },
    members: {
        type: [String],
        required: true,
        validate: {
            validator: (arr) => arr.length > 0 && arr.length <= 50,
            message: 'Group must have between 1 and 50 members',
        },
    },
}, { timestamps: true, _id: false });

module.exports = mongoose.model('Group', GroupSchema);
