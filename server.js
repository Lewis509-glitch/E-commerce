const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admins');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@shopverse.local').toLowerCase().trim();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/setup', require('./routes/setup'));

app.get('/', (req, res) => res.send('ShopVerse backend is running.'));

async function ensureDefaultAdmin() {
  const existing = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });
  if (!existing) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await new Admin({ email: DEFAULT_ADMIN_EMAIL, passwordHash }).save();
    console.log('Created default admin:', DEFAULT_ADMIN_EMAIL);
  }
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('MongoDB connected');
  await ensureDefaultAdmin();
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});
