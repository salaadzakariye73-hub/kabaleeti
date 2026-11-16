import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { httpError } from '../lib/util.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Login required'));
  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(sub);
    if (!user || !user.active) return next(httpError(401, 'Invalid session'));
    req.user = user;
    next();
  } catch {
    next(httpError(401, 'Session expired, please log in again'));
  }
}

// Admin always passes. Other roles must be listed.
export const can = (...roles) => (req, res, next) =>
  req.user.role === 'admin' || roles.includes(req.user.role)
    ? next()
    : next(httpError(403, 'Your role cannot do this'));
