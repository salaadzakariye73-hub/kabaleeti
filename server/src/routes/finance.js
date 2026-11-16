import { Router } from 'express';
import { Product, Rental, Sale, Payment, Expense, Damage, Settings } from '../models/index.js';
import { can } from '../middleware/auth.js';
import { httpError, wrap, audit, todayStr, money } from '../lib/util.js';
import { computeRental, paidMap } from '../lib/billing.js';
import { takeAvailable } from '../lib/stock.js';

const router = Router();

// ---------- Expenses ----------
router.get('/expenses', wrap(async (req, res) => {
  res.json(await Expense.find().sort({ date: -1, createdAt: -1 }).populate('project', 'name'));
}));

router.post('/expenses', can('accountant', 'manager'), wrap(async (req, res) => {
  const expense = await Expense.create({ ...req.body, date: req.body.date || todayStr(), createdBy: req.user._id });
  audit(req.user, 'expense.create', 'Expense', expense._id, expense.amount);
  res.status(201).json(expense);
}));

// ---------- Damage & loss ----------
router.get('/damages', wrap(async (req, res) => {
  res.json(await Damage.find().sort({ date: -1, createdAt: -1 }).populate('product', 'name sku'));
}));

// Damaged/lost units must come from available stock. Cost is also booked as a repair expense.
router.post('/damages', can('storekeeper', 'manager'), wrap(async (req, res) => {
  const { product, type, qty, reason = '', cost = 0, date = todayStr(), responsibility = 'none', rental } = req.body;
  const n = Number(qty);
  if (!['damaged', 'lost'].includes(type)) throw httpError(400, 'Type must be damaged or lost');
  if (!(n > 0)) throw httpError(400, 'Quantity must be greater than 0');
  const inc = type === 'lost' ? { lost: n } : { damaged: n };
  if (!(await takeAvailable(product, n, inc))) throw httpError(409, 'Not enough available stock for this record');

  const damage = await Damage.create({ product, type, qty: n, reason, cost: money(cost), date, responsibility, rental: rental || undefined, createdBy: req.user._id });
  if (damage.cost > 0) {
    await Expense.create({ category: 'repair', amount: damage.cost, date, note: `Damage: ${reason || type}`, createdBy: req.user._id });
  }
  audit(req.user, 'damage.create', 'Damage', damage._id, type);
  res.status(201).json(damage);
}));

router.patch('/damages/:id', can('storekeeper', 'manager'), wrap(async (req, res) => {
  const damage = await Damage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!damage) throw httpError(404, 'Record not found');
  res.json(damage);
}));

// ---------- Dashboard ----------
router.get('/dashboard', wrap(async (req, res) => {
  const today = todayStr();
  const month = today.slice(0, 7);
  const [products, rentals, sales, expenses, payments, settings] = await Promise.all([
    Product.find().lean(),
    Rental.find().populate('customer', 'name').lean(),
    Sale.find().lean(),
    Expense.find().lean(),
    Payment.find().lean(),
    Settings.findOne({ key: 'main' }).lean(),
  ]);
  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

  const rentalCalc = rentals.map((r) => ({ r, c: computeRental(r, today) }));
  const active = rentalCalc.filter(({ c }) => c.open > 0);
  const upcoming = active.filter(({ r }) => r.end >= today && (new Date(r.end) - new Date(today)) / 86400000 <= 7)
    .map(({ r }) => ({ no: r.no, customer: r.customer?.name, end: r.end }));
  const overdue = active.filter(({ r }) => r.end < today).map(({ r }) => ({ no: r.no, customer: r.customer?.name, end: r.end }));
  const rentalPaid = await paidMap('rental', rentals.map((r) => r._id));
  const salePaid = await paidMap('sale', sales.map((s) => s._id));

  const rentalBilled = sum(rentalCalc, (x) => x.c.total);
  const salesRevenue = sum(sales, (s) => s.total);
  const cogs = sum(sales, (s) => s.qty * (products.find((p) => String(p._id) === String(s.product))?.purchaseCost || 0));
  const expenseTotal = sum(expenses, (e) => e.amount);
  const collected = sum(payments, (p) => p.amount);
  const outstanding = rentalCalc.reduce((s, { r, c }) => s + c.total - (rentalPaid.get(String(r._id)) || 0), 0)
    + sales.reduce((s, x) => s + x.total - (salePaid.get(String(x._id)) || 0), 0);

  res.json({
    currency: settings?.currency || 'USD',
    totals: {
      inventory: sum(products, (p) => p.total),
      available: sum(products, (p) => p.available),
      rented: sum(products, (p) => p.rented),
      sold: sum(products, (p) => p.sold),
      damaged: sum(products, (p) => p.damaged),
      lost: sum(products, (p) => p.lost),
    },
    monthRentalRevenue: money(sum(rentalCalc.filter(({ r }) => r.start.slice(0, 7) === month), (x) => x.c.total)),
    salesRevenue: money(salesRevenue),
    outstanding: money(outstanding),
    expenses: money(expenseTotal),
    profit: money(rentalBilled + salesRevenue - cogs - expenseTotal),
    collected: money(collected),
    activeRentals: active.length,
    overdueRentals: overdue.length,
    upcomingReturns: upcoming,
    overdueList: overdue,
    lowStock: products.filter((p) => p.total > 0 && p.available <= p.lowStockThreshold)
      .map((p) => ({ name: p.name, sku: p.sku, available: p.available })),
  });
}));

// ---------- Reports ----------
// kind = products | rentals | sales | payments | expenses | pl   (JSON; the client turns it into CSV)
router.get('/reports/:kind', can('accountant', 'manager'), wrap(async (req, res) => {
  const { kind } = req.params;
  const today = todayStr();
  if (kind === 'products') {
    const products = await Product.find().sort({ name: 1 }).lean();
    return res.json(products.map((p) => ({ sku: p.sku, name: p.name, total: p.total, available: p.available, rented: p.rented, sold: p.sold, damaged: p.damaged, lost: p.lost })));
  }
  if (kind === 'rentals') {
    const rentals = await Rental.find().populate('customer', 'name').sort({ start: -1 }).lean();
    const paid = await paidMap('rental', rentals.map((r) => r._id));
    return res.json(rentals.map((r) => {
      const c = computeRental(r, today);
      const p = paid.get(String(r._id)) || 0;
      return { no: r.no, customer: r.customer?.name, start: r.start, end: r.end, total: c.total, paid: p, balance: money(c.total - p), status: c.status };
    }));
  }
  if (kind === 'sales') {
    const sales = await Sale.find().populate('customer', 'name').sort({ date: -1 }).lean();
    const paid = await paidMap('sale', sales.map((s) => s._id));
    return res.json(sales.map((s) => ({ no: s.no, date: s.date, customer: s.customer?.name, qty: s.qty, total: s.total, paid: paid.get(String(s._id)) || 0 })));
  }
  if (kind === 'payments') {
    const payments = await Payment.find().sort({ date: -1 }).lean();
    return res.json(payments.map((p) => ({ date: p.date, type: p.refType, amount: p.amount, method: p.method, reference: p.reference })));
  }
  if (kind === 'expenses') {
    const expenses = await Expense.find().sort({ date: -1 }).lean();
    return res.json(expenses.map((e) => ({ date: e.date, category: e.category, amount: e.amount, note: e.note })));
  }
  if (kind === 'pl') {
    const rentals = await Rental.find().lean();
    const sales = await Sale.find().lean();
    const payments = await Payment.find().lean();
    const expenses = await Expense.find().lean();
    const rentalRevenue = money(rentals.reduce((s, r) => s + computeRental(r, today).total, 0));
    const salesRevenue = money(sales.reduce((s, x) => s + x.total, 0));
    const expenseTotal = money(expenses.reduce((s, e) => s + e.amount, 0));
    return res.json({ rentalRevenue, salesRevenue, expenses: expenseTotal, net: money(rentalRevenue + salesRevenue - expenseTotal), collected: money(payments.reduce((s, p) => s + p.amount, 0)) });
  }
  throw httpError(404, 'Unknown report');
}));

// ---------- Settings ----------
router.get('/settings', wrap(async (req, res) => {
  const s = await Settings.findOneAndUpdate({ key: 'main' }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json(s);
}));

router.put('/settings', can(), wrap(async (req, res) => {
  const { companyName, address, phone, email, currency, graceDays } = req.body;
  const s = await Settings.findOneAndUpdate({ key: 'main' }, { companyName, address, phone, email, currency, graceDays }, { upsert: true, new: true, runValidators: true });
  audit(req.user, 'settings.update', 'Settings', s._id);
  res.json(s);
}));

export default router;
