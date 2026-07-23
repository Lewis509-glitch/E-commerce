const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const router = express.Router();

router.post('/default-admin', async (req, res) => {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@shopverse.local';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (existing) {
      return res.json({ message: 'Default admin already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = new Admin({ email: email.toLowerCase().trim(), passwordHash });
    await admin.save();
    res.status(201).json({ message: 'Default admin created.', email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
