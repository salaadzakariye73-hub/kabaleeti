export const money = (n, cur = 'USD') =>
  cur === 'SOS'
    ? `SOS ${Math.round(Number(n) || 0).toLocaleString('en-US')}`
    : `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const today = () => new Date().toISOString().slice(0, 10);

export const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// Client-side estimate only (the server is the source of truth for billing).
export const estimate = (lines, start, end) => {
  const days = Math.max(1, dayDiff(start, end));
  return lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0) * days, 0);
};

export function downloadCsv(name, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = '﻿' + [cols, ...rows.map((r) => cols.map((c) => r[c]))].map((r) => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${today()}.csv`;
  a.click();
}
