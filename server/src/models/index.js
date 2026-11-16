import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const base = { timestamps: true };
const ObjectId = Schema.Types.ObjectId;

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'accountant', 'storekeeper', 'sales'], default: 'sales' },
  active: { type: Boolean, default: true },
  lastLogin: Date,
}, base));

const Product = model('Product', new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: String, default: 'Steel Props' },
  size: String,
  model: String,
  unit: { type: String, default: 'pcs' },
  purchaseCost: { type: Number, default: 0, min: 0 },
  dailyRate: { type: Number, default: 0, min: 0 },
  sellPrice: { type: Number, default: 0, min: 0 },
  warehouse: { type: String, default: 'Main' },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  description: String,
  // Invariant: total = available + rented + sold + damaged + lost
  total: { type: Number, default: 0, min: 0 },
  available: { type: Number, default: 0, min: 0 },
  rented: { type: Number, default: 0, min: 0 },
  sold: { type: Number, default: 0, min: 0 },
  damaged: { type: Number, default: 0, min: 0 },
  lost: { type: Number, default: 0, min: 0 },
}, base));

const Customer = model('Customer', new Schema({
  name: { type: String, required: true, trim: true },
  company: String,
  phone: String,
  email: String,
  identificationNo: String,
  address: String,
  notes: String,
}, base));

const Project = model('Project', new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, sparse: true },
  customer: { type: ObjectId, ref: 'Customer', required: true },
  location: String,
  startDate: String,
  expectedCompletion: String,
  status: { type: String, enum: ['planning', 'active', 'onHold', 'completed'], default: 'active' },
  description: String,
}, base));

const RentalLine = new Schema({
  product: { type: ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
});

const ReturnItem = new Schema({
  lineId: { type: ObjectId, required: true },
  good: { type: Number, default: 0, min: 0 },
  damaged: { type: Number, default: 0, min: 0 },
}, { _id: false });

const ReturnEvent = new Schema({
  date: { type: String, required: true },
  items: [ReturnItem],
  note: String,
  by: { type: ObjectId, ref: 'User' },
});

const Rental = model('Rental', new Schema({
  no: { type: String, required: true, unique: true }, // also the invoice number
  customer: { type: ObjectId, ref: 'Customer', required: true },
  project: { type: ObjectId, ref: 'Project' },
  lines: { type: [RentalLine], validate: (v) => v.length > 0 },
  start: { type: String, required: true },
  end: { type: String, required: true },
  deposit: { type: Number, default: 0, min: 0 },
  notes: String,
  returns: [ReturnEvent],
  createdBy: { type: ObjectId, ref: 'User' },
}, base));

const Sale = model('Sale', new Schema({
  no: { type: String, required: true, unique: true },
  customer: { type: ObjectId, ref: 'Customer', required: true },
  product: { type: ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxPct: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  date: { type: String, required: true },
  notes: String,
  createdBy: { type: ObjectId, ref: 'User' },
}, base));

const Payment = model('Payment', new Schema({
  refType: { type: String, enum: ['rental', 'sale'], required: true },
  refId: { type: ObjectId, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'USD' },
  method: { type: String, enum: ['cash', 'bank', 'mobile'], required: true },
  reference: String,
  date: { type: String, required: true },
  notes: String,
  recordedBy: { type: ObjectId, ref: 'User' },
}, base));
Payment.schema.index({ refType: 1, refId: 1 });

const Expense = model('Expense', new Schema({
  category: { type: String, enum: ['transport', 'repair', 'salary', 'warehouseRent', 'other'], required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: String, required: true },
  note: String,
  project: { type: ObjectId, ref: 'Project' },
  createdBy: { type: ObjectId, ref: 'User' },
}, base));

const Damage = model('Damage', new Schema({
  product: { type: ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['damaged', 'lost'], required: true },
  qty: { type: Number, required: true, min: 1 },
  reason: String,
  cost: { type: Number, default: 0, min: 0 },
  date: { type: String, required: true },
  responsibility: { type: String, enum: ['company', 'customer', 'none'], default: 'none' },
  rental: { type: ObjectId, ref: 'Rental' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdBy: { type: ObjectId, ref: 'User' },
}, base));

const Settings = model('Settings', new Schema({
  key: { type: String, default: 'main', unique: true },
  companyName: { type: String, default: 'Kaah Steel Props & Shoring' },
  address: String,
  phone: String,
  email: String,
  currency: { type: String, enum: ['USD', 'SOS'], default: 'USD' },
  graceDays: { type: Number, default: 0, min: 0 },
}, base));

const AuditLog = model('AuditLog', new Schema({
  user: { type: ObjectId, ref: 'User' },
  action: String,
  entity: String,
  entityId: String,
  detail: String,
  at: { type: Date, default: Date.now },
}));

export { User, Product, Customer, Project, Rental, Sale, Payment, Expense, Damage, Settings, AuditLog };
