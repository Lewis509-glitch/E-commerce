const express = require('express');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || '+254700000000';

function buildWhatsAppUrl(message) {
  const phone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

router.post('/', async (req, res) => {
  try {
    const { customer, items, total, status } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must include at least one item.' });
    }
    if (typeof total !== 'number' || total < 0) {
      return res.status(400).json({ message: 'Order total is required and must be a number.' });
    }

    const order = new Order({
      customer: {
        name: customer?.name || 'Guest',
        email: customer?.email || 'guest@shopverse.local',
        phone: customer?.phone || '',
      },
      items,
      total,
      status: status || 'Processing',
    });

    await order.save();

    const notification = `New order received!\nName: ${order.customer.name}\nEmail: ${order.customer.email}\nPhone: ${order.customer.phone || 'N/A'}\nItems: ${order.items.length}\nTotal: Ksh ${order.total.toFixed(2)}\nStatus: ${order.status}`;
    const whatsappUrl = buildWhatsAppUrl(notification);
    console.log('Admin WhatsApp notification:', whatsappUrl);

    res.status(201).json({ order, whatsappUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
