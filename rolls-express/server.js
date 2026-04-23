require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { connectToDatabase, mongoose } = require('./backend/config/db');
const User = require('./backend/models/User');
const Session = require('./backend/models/Session');
const Order = require('./backend/models/Order');
const ContactSubmission = require('./backend/models/ContactSubmission');
const CateringRequest = require('./backend/models/CateringRequest');
const MenuItem = require('./backend/models/MenuItem');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    zip: user.zip,
    loyaltyPoints: user.loyaltyPoints || 0,
    loyaltyTier: user.loyaltyTier || 'Member'
  };
}

async function getSession(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  return Session.findOne({ token }).lean();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/menu', async (req, res) => {
  const menu = await MenuItem.find({ isActive: { $ne: false } }).sort({ category: 1, name: 1 }).lean();
  res.json(menu);
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, phone, address, zip } = req.body;
  if (!name || !email || !password || !phone || !address || !zip) {
    return res.status(400).json({ error: 'All sign up fields are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    return res.status(409).json({ error: 'An account already exists for that email address.' });
  }

  const user = await User.create({
    id: generateId('user'),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(String(password)),
    phone: String(phone).trim(),
    address: String(address).trim(),
    zip: String(zip).trim(),
    loyaltyPoints: 0,
    loyaltyTier: 'Member'
  });

  res.status(201).json({ message: 'Account created successfully.', user: sanitizeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.passwordHash !== hashPassword(String(password))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = crypto.randomUUID();
  await Session.deleteMany({ userId: user.id });
  await Session.create({ token, userId: user.id });

  res.json({ message: 'Login successful.', token, user: sanitizeUser(user) });
});

app.post('/api/auth/retrieve-username', async (req, res) => {
  const { phone, zip } = req.body;
  if (!phone || !zip) {
    return res.status(400).json({ error: 'Phone number and ZIP code are required.' });
  }

  const user = await User.findOne({
    phone: String(phone).trim(),
    zip: String(zip).trim()
  }).lean();

  if (!user) {
    return res.status(404).json({ error: 'No account matched that phone number and ZIP code.' });
  }

  res.json({ username: user.email });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, phone, newPassword } = req.body;
  if (!email || !phone || !newPassword) {
    return res.status(400).json({ error: 'Email, phone number, and a new password are required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const user = await User.findOne({
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim()
  });

  if (!user) {
    return res.status(404).json({ error: 'No matching account was found for that email and phone number.' });
  }

  user.passwordHash = hashPassword(String(newPassword));
  await user.save();
  await Session.deleteMany({ userId: user.id });

  res.json({ message: 'Password reset successful. You can now log in with your new password.' });
});

app.get('/api/auth/me', async (req, res) => {
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const user = await User.findOne({ id: session.userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    await Session.deleteOne({ token });
  }
  res.json({ message: 'Logged out.' });
});

app.post('/api/orders', async (req, res) => {
  const { customer, cart, fulfillment } = req.body;
  if (!customer || !cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return res.status(400).json({ error: 'A cart with at least one item is required.' });
  }
  if (!customer.name || !customer.email || !customer.phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required for checkout.' });
  }

  const order = await Order.create({
    id: generateId('order'),
    customer: {
      name: customer.name,
      email: String(customer.email).trim().toLowerCase(),
      phone: customer.phone,
      address: customer.address || ''
    },
    cart,
    fulfillment: fulfillment || {},
    status: 'Submitted'
  });

  const user = await User.findOne({ email: String(customer.email).trim().toLowerCase() });
  if (user) {
    const earnedPoints = Math.max(1, Math.floor(Number(cart.subtotal || 0)));
    user.loyaltyPoints = Number(user.loyaltyPoints || 0) + earnedPoints;
    user.loyaltyTier = user.loyaltyPoints >= 50 ? 'Gold Member' : 'Member';
    await user.save();
  }

  res.status(201).json({
    message: 'Order submitted successfully.',
    orderId: order.id,
    fulfillment: order.fulfillment
  });
});

app.post('/api/contact', async (req, res) => {
  const { name, firstName, lastName, email, phone, address, message } = req.body;
  const fullName = String(name || [firstName, lastName].filter(Boolean).join(' ')).trim();
  if (!fullName || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  await ContactSubmission.create({
    id: generateId('contact'),
    name: fullName,
    firstName: firstName || '',
    lastName: lastName || '',
    email: String(email).trim().toLowerCase(),
    phone: phone || '',
    address: address || '',
    message
  });

  res.status(201).json({ message: 'Your contact request has been received.' });
});

app.post('/api/catering', async (req, res) => {
  const { name, email, phone, address, eventDetails } = req.body;
  if (!name || !email || !phone || !eventDetails) {
    return res.status(400).json({ error: 'Name, email, phone, and event details are required.' });
  }

  await CateringRequest.create({
    id: generateId('catering'),
    name,
    email: String(email).trim().toLowerCase(),
    phone,
    address: address || '',
    eventDetails
  });

  res.status(201).json({ message: 'Your catering inquiry has been submitted.' });
});

app.use(express.static(ROOT));

app.get('*', (req, res) => {
  const requested = req.path === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, req.path);
  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    return res.sendFile(requested);
  }
  res.status(404).sendFile(path.join(ROOT, 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`Rolls Express running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
