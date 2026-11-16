import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Product, Settings } from './models/index.js';

// Creates the first admin account and the company settings. Run once: npm run seed
await mongoose.connect(process.env.MONGODB_URI);

const email = (process.env.ADMIN_EMAIL || 'admin@kaahprops.so').toLowerCase();
if (!(await User.exists({ email }))) {
  await User.create({
    name: 'Admin',
    email,
    role: 'admin',
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10),
  });
  console.log(`Admin created: ${email}`);
}

await Settings.updateOne({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true });

if (!(await Product.exists({}))) {
  await Product.create([
    { name: 'Standard Acrow Steel Prop (2.0m - 3.5m)', sku: 'PRP-ACW-350', category: 'Steel Props', size: '2.0m - 3.5m', unit: 'pcs', purchaseCost: 25, dailyRate: 0.6, sellPrice: 45, total: 500, available: 500, warehouse: 'Mogadishu Yard A' },
    { name: 'Forged U-Head Jack & Base Plate Set', sku: 'ACC-UHJ-900', category: 'Accessories', unit: 'set', purchaseCost: 4, dailyRate: 0.25, sellPrice: 9, total: 1000, available: 1000, warehouse: 'Mogadishu Yard B' },
  ]);
  console.log('Sample products created');
}

await mongoose.disconnect();
console.log('Seed done');
