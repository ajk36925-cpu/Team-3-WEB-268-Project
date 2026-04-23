require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const { connectToDatabase, mongoose } = require('../config/db');
const User = require('../models/User');
const Session = require('../models/Session');
const Order = require('../models/Order');
const ContactSubmission = require('../models/ContactSubmission');
const CateringRequest = require('../models/CateringRequest');
const MenuItem = require('../models/MenuItem');

const ROOT = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const MENU_PATH = path.join(ROOT, 'data', 'menu.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function seed() {
  await connectToDatabase();

  const db = readJson(DB_PATH);
  const menu = readJson(MENU_PATH);

  if (Array.isArray(db.users)) {
    for (const user of db.users) {
      await User.updateOne({ id: user.id }, { $set: user }, { upsert: true });
    }
  }

  if (Array.isArray(db.sessions)) {
    for (const session of db.sessions) {
      await Session.updateOne({ token: session.token }, { $set: session }, { upsert: true });
    }
  }

  if (Array.isArray(db.orders)) {
    for (const order of db.orders) {
      await Order.updateOne({ id: order.id }, { $set: order }, { upsert: true });
    }
  }

  if (Array.isArray(db.contactSubmissions)) {
    for (const contact of db.contactSubmissions) {
      await ContactSubmission.updateOne({ id: contact.id }, { $set: contact }, { upsert: true });
    }
  }

  if (Array.isArray(db.cateringRequests)) {
    for (const catering of db.cateringRequests) {
      await CateringRequest.updateOne({ id: catering.id }, { $set: catering }, { upsert: true });
    }
  }

  if (Array.isArray(menu)) {
    for (const item of menu) {
      await MenuItem.updateOne({ id: item.id }, { $set: { ...item, isActive: true } }, { upsert: true });
    }
  }

  console.log('MongoDB seed complete.');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('MongoDB seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
