import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { requireAuth, can } from '../middleware/auth.js';
import { httpError, wrap, audit } from '../lib/util.js';

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, lastLogin: u.lastLogin });

const router = Router();

router.post('/login', wrap(async (req, res) => {
  const { email = '', password = '' } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError(401, 'Email or password is incorrect');
  }
  user.lastLogin = new Date();
  await user.save();
  const token = jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
  audit(user, 'login', 'User', user._id);
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---- Users & roles (admin only, mounted at /api/users) ----
export const usersRouter = Router();
usersRouter.use(can());

usersRouter.get('/', wrap(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json(users.map(publicUser));
}));

usersRouter.post('/', wrap(async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  if (!name || !email || !password || password.length < 8) throw httpError(400, 'Name, email and an 8+ character password are required');
  const user = await User.create({ name, email, phone, role, passwordHash: await bcrypt.hash(password, 10) });
  audit(req.user, 'user.create', 'User', user._id, email);
  res.status(201).json(publicUser(user));
}));

usersRouter.patch('/:id', wrap(async (req, res) => {
  const { name, phone, role, active, password } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (password) {
    if (password.length < 8) throw httpError(400, 'Password must be 8+ characters');
    user.passwordHash = await bcrypt.hash(password, 10);
  }
  await user.save();
  audit(req.user, 'user.update', 'User', user._id, role || '');
  res.json(publicUser(user));
}));

export default router;
