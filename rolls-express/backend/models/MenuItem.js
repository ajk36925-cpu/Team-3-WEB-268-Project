const { mongoose } = require('../config/db');

const menuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { versionKey: false }
);

module.exports = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);
