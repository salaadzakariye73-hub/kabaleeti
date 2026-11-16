import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';

// Loads JSON from the API. Call reload() after any change.
export function useData(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    api(path)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

// Form state helper: const [v, set, setV] = useForm({...}); <input value={v.name||''} onChange={set('name')} />
export function useForm(initial) {
  const [v, setV] = useState(initial);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  return [v, set, setV];
}

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div
        className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 bg-charcoal text-white rounded-t-2xl sticky top-0">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="close"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-dark ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, tone = 'text-charcoal' }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-dark">{label}</div>
      <div className={`text-xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}

const STATUS = {
  active: 'bg-blue-50 text-blue-700',
  partial: 'bg-peach/70 text-charcoal',
  overdue: 'bg-red-50 text-red-700',
  completed: 'bg-green-50 text-green-700',
  open: 'bg-peach/70 text-charcoal',
  resolved: 'bg-green-50 text-green-700',
};

export function StatusBadge({ status, label }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[status] || 'bg-gray-100 text-dark'}`}>{label}</span>;
}

// Responsive table: scrolls horizontally on phones instead of breaking the layout.
export function DataTable({ heads, rows, empty = '—' }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>{heads.map((h, i) => <th key={i} className="th">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((cells, i) => (
            <tr key={i} className="hover:bg-orange/5">
              {cells.map((c, j) => <td key={j} className="td">{c}</td>)}
            </tr>
          )) : (
            <tr><td className="td text-center text-gray-400" colSpan={heads.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <input
      className="w-full sm:max-w-xs mb-4"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function Notes({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="card p-4 mb-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="list-disc pl-5 text-sm space-y-1">
        {items.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}
