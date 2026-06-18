const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: [254, 'Email must not exceed 254 characters'],
    },
    passwordHash: {
        type: String,
        // ไม่ required เพราะผู้ใช้อาจสมัครผ่าน Google อย่างเดียว
    },
    name: {
        type: String,
        trim: true,
        maxlength: [100, 'Name must not exceed 100 characters'],
        default: '',
    },
    googleId: {
        type: String,
        default: null,
    },
}, { timestamps: true });

// Hash password ก่อนบันทึก (เฉพาะกรณีที่มีการเปลี่ยน password)
UserSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash') || !this.passwordHash) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// เปรียบเทียบ password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ไม่ส่ง passwordHash กลับไปใน JSON
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

module.exports = mongoose.model('User', UserSchema);
