import { Router } from 'express';
import { Product, Rental, Sale, Payment, Customer } from '../models/index.js';
import { can } from '../middleware/auth.js';
import { httpError, wrap, audit, todayStr, money } from '../lib/util.js';
import { computeRental, paidMap } from '../lib/billing.js';
import { takeAvailable, releaseAvailable } from '../lib/stock.js';

const router = Router();

// Builds the invoice-style view of one rental (balance, status, per-line billing).
async function rentalView(rental) {
  const plain = rental.toObject ? rental.toObject() : rental;
  const calc = computeRental(plain);
  const paid = (await paidMap('rental', [plain._id])).get(String(plain._id)) || 0;
  const products = await Product.find({ _id: { $in: plain.lines.map((l) => l.product) } }, 'name sku').lean();
  const name = (id) => products.find((p) => String(p._id) === String(id))?.name || '-';
  return {
    ...plain,
    productNames: plain.lines.map((l) => name(l.product)),
    lines: calc.lines.map((l, i) => ({ ...l, productName: name(l.product), ...{ rateLabel: plain.lines[i].rate } })),
    total: calc.total,
    open: calc.open,
    status: calc.status,
    paid: money(paid),
    balance: money(calc.total - paid),
  };
}

// ---------- Rentals ----------
router.get('/rentals', wrap(async (req, res) => {
  const rentals = await Rental.find().populate('customer', 'name').populate('project', 'name').sort({ createdAt: -1 });
  const views = await Promise.all(rentals.map(rentalView));
  res.json(views);
}));

router.get('/rentals/:id', wrap(async (req, res) => {
  const rental = await Rental.findById(req.params.id).populate('customer').populate('project');
  if (!rental) throw httpError(404, 'Rental not found');
  res.json(await rentalView(rental));
}));

async function nextInvoiceNo() {
  const year = new Date().getFullYear();
  const count = await Rental.countDocuments({ no: new RegExp(`^INV-${year}-`) });
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

router.post('/rentals', can('manager', 'sales'), wrap(async (req, res) => {
  const { customer, project, lines = [], start, end, deposit = 0, notes = '' } = req.body;
  if (!customer || !start || !end || end < start) throw httpError(400, 'Customer, start and end dates are required');
  if (!(await Customer.exists({ _id: customer }))) throw httpError(400, 'Customer not found');
  if (!lines.length) throw httpError(400, 'Add at least one equipment line');

  // Reserve stock line by line; roll back everything if one line fails.
  const reserved = [];
  try {
    for (const line of lines) {
      const qty = Number(line.qty);
      if (!(qty > 0)) throw httpError(400, 'Quantity must be greater than 0');
      const product = await Product.findById(line.product);
      if (!product) throw httpError(400, 'Product not found');
      const rate = line.rate !== undefined && line.rate !== '' ? Number(line.rate) : product.dailyRate;
      if (!(await takeAvailable(product._id, qty, { rented: qty }))) {
        throw httpError(409, `Not enough available stock for ${product.name} (available: ${product.available})`);
      }
      reserved.push({ product: product._id, qty, rate, name: product.name });
    }
  } catch (err) {
    for (const r of reserved) await releaseAvailable(r.product, r.qty, { rented: r.qty });
    throw err;
  }

  const rental = await Rental.create({
    no: await nextInvoiceNo(),
    customer, project: project || undefined,
    lines: reserved.map(({ product, qty, rate }) => ({ product, qty, rate })),
    start, end, deposit: Number(deposit) || 0, notes,
    createdBy: req.user._id,
  });
  audit(req.user, 'rental.create', 'Rental', rental._id, rental.no);
  res.status(201).json(await rentalView(rental));
}));

// Partial or full return. Good units go back to available; damaged units go to damaged stock.
router.post('/rentals/:id/returns', can('storekeeper', 'manager', 'sales'), wrap(async (req, res) => {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw httpError(404, 'Rental not found');
  const date = req.body.date || todayStr();
  const items = (req.body.items || []).map((i) => ({
    lineId: i.lineId,
    good: Number(i.good) || 0,
    damaged: Number(i.damaged) || 0,
  })).filter((i) => i.good + i.damaged > 0);
  if (!items.length) throw httpError(400, 'Enter at least one returned unit');
  if (date < rental.start) throw httpError(400, 'Return date cannot be before start date');

  // Validate against what is still out, per line.
  const calc = computeRental(rental.toObject(), todayStr());
  for (const item of items) {
    const line = calc.lines.find((l) => l.lineId === String(item.lineId));
    if (!line) throw httpError(400, 'Unknown rental line');
    if (item.good + item.damaged > line.remaining) {
      throw httpError(400, `Returning more than remaining (${line.remaining}) on a line`);
    }
  }

  // Apply stock changes for each item.
  for (const item of items) {
    const line = rental.lines.id(item.lineId);
    await Product.updateOne(
      { _id: line.product },
      { $inc: { rented: -(item.good + item.damaged), available: item.good, damaged: item.damaged } },
    );
  }
  rental.returns.push({ date, items, note: req.body.note || '', by: req.user._id });
  await rental.save();
  audit(req.user, 'rental.return', 'Rental', rental._id, date);
  res.status(201).json(await rentalView(rental));
}));

// ---------- Sales ----------
router.get('/sales', wrap(async (req, res) => {
  const sales = await Sale.find().populate('customer', 'name').populate('product', 'name sku').sort({ createdAt: -1 }).lean();
  const paid = await paidMap('sale', sales.map((s) => s._id));
  res.json(sales.map((s) => {
    const p = paid.get(String(s._id)) || 0;
    return { ...s, paid: p, balance: money(s.total - p) };
  }));
}));

router.post('/sales', can('manager', 'sales'), wrap(async (req, res) => {
  const { customer, product, qty, price, discount = 0, taxPct = 0, date = todayStr(), notes = '' } = req.body;
  const n = Number(qty);
  if (!(await Customer.exists({ _id: customer }))) throw httpError(400, 'Customer not found');
  const p = await Product.findById(product);
  if (!p) throw httpError(400, 'Product not found');
  if (!(n > 0)) throw httpError(400, 'Quantity must be greater than 0');
  if (!(await takeAvailable(p._id, n, { sold: n }))) {
    throw httpError(409, `Not enough available stock for ${p.name} (available: ${p.available})`);
  }
  const unitPrice = price !== undefined && price !== '' ? Number(price) : p.sellPrice;
  const net = n * unitPrice - Number(discount);
  const total = money(net + net * Number(taxPct) / 100);
  const count = await Sale.countDocuments();
  const sale = await Sale.create({
    no: `SAL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
    customer, product: p._id, qty: n, price: unitPrice,
    discount: Number(discount), taxPct: Number(taxPct), total, date, notes,
    createdBy: req.user._id,
  });
  audit(req.user, 'sale.create', 'Sale', sale._id, sale.no);
  res.status(201).json(sale);
}));

// ---------- Payments ----------
router.get('/payments', wrap(async (req, res) => {
  const payments = await Payment.find().sort({ date: -1, createdAt: -1 }).lean();
  const rentals = await Rental.find({}, 'no customer').populate('customer', 'name').lean();
  const sales = await Sale.find({}, 'no customer').populate('customer', 'name').lean();
  const docs = new Map([...rentals, ...sales].map((d) => [String(d._id), d]));
  res.json(payments.map((p) => {
    const d = docs.get(String(p.refId));
    return { ...p, docNo: d?.no || '-', customerName: d?.customer?.name || '-' };
  }));
}));

// Open documents with balance, for the "record payment" dropdown.
router.get('/payments/open-documents', wrap(async (req, res) => {
  const rentals = await Rental.find().populate('customer', 'name');
  const views = await Promise.all(rentals.map(rentalView));
  const sales = await Sale.find().populate('customer', 'name').lean();
  const salePaid = await paidMap('sale', sales.map((s) => s._id));
  const out = [
    ...views.filter((r) => r.balance > 0.005).map((r) => ({ refType: 'rental', refId: r._id, no: r.no, customer: r.customer?.name, balance: r.balance })),
    ...sales.map((s) => ({ refType: 'sale', refId: s._id, no: s.no, customer: s.customer?.name, balance: money(s.total - (salePaid.get(String(s._id)) || 0)) }))
      .filter((s) => s.balance > 0.005),
  ];
  res.json(out);
}));

router.post('/payments', can('accountant', 'manager'), wrap(async (req, res) => {
  const { refType, refId, amount, method, reference = '', date = todayStr(), notes = '', currency = 'USD' } = req.body;
  const amt = money(amount);
  if (!['rental', 'sale'].includes(refType)) throw httpError(400, 'Choose rental or sale');
  if (!(amt > 0)) throw httpError(400, 'Amount must be greater than 0');

  let doc, total;
  if (refType === 'rental') {
    doc = await Rental.findById(refId);
    if (!doc) throw httpError(404, 'Rental not found');
    total = computeRental(doc.toObject()).total;
  } else {
    doc = await Sale.findById(refId);
    if (!doc) throw httpError(404, 'Sale not found');
    total = doc.total;
  }
  const paid = (await paidMap(refType, [doc._id])).get(String(doc._id)) || 0;
  const balance = money(total - paid);
  if (amt > balance + 0.001) throw httpError(400, `Amount is more than the balance (${balance})`);

  const payment = await Payment.create({ refType, refId, amount: amt, currency, method, reference, date, notes, recordedBy: req.user._id });
  audit(req.user, 'payment.create', 'Payment', payment._id, `${amt} on ${doc.no || refId}`);
  res.status(201).json(payment);
}));

export default router;
