import { Product } from '../models/index.js';

/**
 * Atomically takes `qty` units out of available stock and applies extra counters.
 * `inc` example: { rented: qty } or { sold: qty } or { damaged: qty }.
 * Returns false (and changes nothing) if available stock is not enough.
 * Available stock can therefore never go negative, even with concurrent requests.
 */
export async function takeAvailable(productId, qty, inc = {}) {
  const r = await Product.updateOne(
    { _id: productId, available: { $gte: qty } },
    { $inc: { available: -qty, ...inc } },
  );
  return r.modifiedCount === 1;
}

// Reverses a takeAvailable (used to roll back a failed multi-line operation).
export async function releaseAvailable(productId, qty, inc = {}) {
  const reversed = Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, -v]));
  await Product.updateOne({ _id: productId }, { $inc: { available: qty, ...reversed } });
}
