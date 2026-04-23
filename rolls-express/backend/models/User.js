const { mongoose } = require('../config/db');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: { type: String, default: 'Member' },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
