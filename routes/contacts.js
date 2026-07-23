const express = require('express');
const Contact = require('../models/Contact');
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
    const { name, email, phone, message } = req.body;
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const contact = new Contact({ name, email, phone, message });
    await contact.save();

    const notification = `New contact request:\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`;
    const whatsappUrl = buildWhatsAppUrl(notification);
    console.log('Admin WhatsApp notification:', whatsappUrl);

    res.status(201).json({ contact, whatsappUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact request not found.' });
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ message: 'Status is required.' });
    }
    contact.status = status;
    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
