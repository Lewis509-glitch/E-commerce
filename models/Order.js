const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, default: 'Guest' },
    email: { type: String, default: 'guest@shopverse.local' },
    phone: { type: String, default: '' },
  },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, default: 'Processing' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
