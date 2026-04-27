const { mongoose } = require('../config/db');

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, default: '' }
    },
    cart: {
      items: [
        {
          id: String,
          name: String,
          description: String,
          price: Number,
          quantity: Number
        }
      ],
      subtotal: Number,
      tax: Number,
      total: Number
    },
    fulfillment: {
      method: { type: String, default: 'Pickup' },
      date: { type: String, default: '' },
      time: { type: String, default: '' },
      notes: { type: String, default: '' }
    },
    status: { type: String, default: 'Submitted' },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
