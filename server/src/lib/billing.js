import { Payment } from '../models/index.js';
import { money, todayStr } from './util.js';

const DAY = 86400000;
export const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
// Rental days = difference between start and end, minimum 1 (matches the spec example: 30 days).
export const billDays = (a, b) => Math.max(1, dayDiff(a, b));

/**
 * Computes billing for a rental, per line and per return event.
 * Each returned unit is billed from start up to the day it came back;
 * units still out are billed to the expected end (or today if overdue).
 * `rental` must be a plain object (use .toObject()).
 */
export function computeRental(rental, today = todayStr()) {
  const lines = rental.lines.map((line) => {
    const id = String(line._id);
    let returned = 0;
    let billed = 0;
    for (const ret of rental.returns || []) {
      for (const item of ret.items.filter((i) => String(i.lineId) === id)) {
        const n = item.good + item.damaged;
        returned += n;
        billed += n * line.rate * billDays(rental.start, ret.date);
      }
    }
    const remaining = line.qty - returned;
    if (remaining > 0) {
      const endDate = rental.end > today ? rental.end : today;
      billed += remaining * line.rate * billDays(rental.start, endDate);
    }
    return { lineId: id, product: line.product, qty: line.qty, rate: line.rate, returned, remaining, billed: money(billed) };
  });

  const total = money(lines.reduce((s, l) => s + l.billed, 0));
  const open = lines.reduce((s, l) => s + l.remaining, 0);
  let status = 'active';
  if (open === 0) status = 'completed';
  else if (today > rental.end) status = 'overdue';
  else if ((rental.returns || []).length) status = 'partial';

  return { lines, total, open, status };
}

// Sums confirmed payments per document id. Returns Map<id, amount>.
export async function paidMap(refType, ids) {
  const rows = await Payment.aggregate([
    { $match: { refType, refId: { $in: ids } } },
    { $group: { _id: '$refId', paid: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), money(r.paid)]));
}
