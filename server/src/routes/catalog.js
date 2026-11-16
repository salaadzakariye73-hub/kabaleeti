import { Router } from 'express';
import { Product, Customer, Project, Rental, Sale, Payment } from '../models/index.js';
import { can } from '../middleware/auth.js';
import { httpError, wrap, audit } from '../lib/util.js';
import { paidMap, computeRental } from '../lib/billing.js';

const router = Router();

// ---------- Products / inventory ----------
router.get('/products', wrap(async (req, res) => {
  const products = await Product.find().sort({ name: 1 });
  res.json(products);
}));

router.post('/products', can('manager', 'storekeeper'), wrap(async (req, res) => {
  const { qty = 0, ...fields } = req.body; // qty = opening stock, becomes total and available
  const n = Math.max(0, Number(qty) || 0);
  const product = await Product.create({ ...fields, total: n, available: n });
  audit(req.user, 'product.create', 'Product', product._id, product.name);
  res.status(201).json(product);
}));

router.patch('/products/:id', can('manager', 'storekeeper'), wrap(async (req, res) => {
  // Stock counters are never edited directly; use /stock or the rental/return/sale flows.
  const { total, available, rented, sold, damaged, lost, ...fields } = req.body;
  const product = await Product.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
  if (!product) throw httpError(404, 'Product not found');
  audit(req.user, 'product.update', 'Product', product._id);
  res.json(product);
}));

// Restock: adds units to total AND available together, keeping the invariant.
router.post('/products/:id/stock', can('storekeeper', 'manager'), wrap(async (req, res) => {
  const n = Number(req.body.qty);
  if (!(n > 0)) throw httpError(400, 'Quantity must be greater than 0');
  const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { total: n, available: n } }, { new: true });
  if (!product) throw httpError(404, 'Product not found');
  audit(req.user, 'stock.in', 'Product', product._id, `+${n}`);
  res.json(product);
}));

// ---------- Customers ----------
router.get('/customers', wrap(async (req, res) => {
  const [customers, rentals, sales, payments] = await Promise.all([
    Customer.find().sort({ name: 1 }).lean(),
    Rental.find().lean(),
    Sale.find().lean(),
    Payment.find().lean(),
  ]);
  const rentalPaid = await paidMap('rental', rentals.map((r) => r._id));
  const salePaid = await paidMap('sale', sales.map((s) => s._id));
  const out = customers.map((c) => {
    const myRentals = rentals.filter((r) => String(r.customer) === String(c._id));
    const mySales = sales.filter((s) => String(s.customer) === String(c._id));
    const billed = myRentals.reduce((s, r) => s + computeRental(r).total, 0)
      + mySales.reduce((s, x) => s + x.total, 0);
    const paid = myRentals.reduce((s, r) => s + (rentalPaid.get(String(r._id)) || 0), 0)
      + mySales.reduce((s, x) => s + (salePaid.get(String(x._id)) || 0), 0);
    return { ...c, rentals: myRentals.length, billed: Math.round(billed * 100) / 100, paid: Math.round(paid * 100) / 100, balance: Math.round((billed - paid) * 100) / 100 };
  });
  void payments;
  res.json(out);
}));

router.post('/customers', can('manager', 'sales'), wrap(async (req, res) => {
  const customer = await Customer.create(req.body);
  audit(req.user, 'customer.create', 'Customer', customer._id, customer.name);
  res.status(201).json(customer);
}));

router.patch('/customers/:id', can('manager', 'sales'), wrap(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) throw httpError(404, 'Customer not found');
  audit(req.user, 'customer.update', 'Customer', customer._id);
  res.json(customer);
}));

// ---------- Projects ----------
router.get('/projects', wrap(async (req, res) => {
  res.json(await Project.find().populate('customer', 'name').sort({ createdAt: -1 }));
}));

router.post('/projects', can('manager', 'sales'), wrap(async (req, res) => {
  const project = await Project.create(req.body);
  audit(req.user, 'project.create', 'Project', project._id, project.name);
  res.status(201).json(project);
}));

router.patch('/projects/:id', can('manager', 'sales'), wrap(async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!project) throw httpError(404, 'Project not found');
  res.json(project);
}));

export default router;
