import { AuditLog } from '../models/index.js';

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Wrap async route handlers so errors reach the error middleware (Express 4).
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const audit = (user, action, entity, entityId, detail = '') =>
  AuditLog.create({ user: user?._id, action, entity, entityId: String(entityId ?? ''), detail: String(detail) }).catch(() => {});

export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
