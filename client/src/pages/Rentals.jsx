import { useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { money, today, estimate } from '../lib/format.js';
import { PageHeader, SearchBox, DataTable, Modal, Field, StatusBadge, useData } from '../components/ui.jsx';

const emptyLine = () => ({ product: '', qty: 1, rate: '' });

export default function Rentals() {
  const { t } = useI18n();
  const rentals = useData('/rentals');
  const products = useData('/products');
  const customers = useData('/customers');
  const projects = useData('/projects');

  const [q, setQ] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [retFor, setRetFor] = useState(null); // rental being returned
  const [form, setForm] = useState({});
  const [lines, setLines] = useState([emptyLine()]);
  const [retForm, setRetForm] = useState({ date: today(), items: {} });
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const list = (rentals.data || []).filter((r) =>
    `${r.no} ${r.customer?.name || ''} ${(r.productNames || []).join(' ')} ${r.project?.name || ''}`.toLowerCase().includes(q.toLowerCase()));

  const openNew = () => {
    setForm({ start: today(), end: '', deposit: 0, notes: '' });
    setLines([emptyLine()]);
    setFerr('');
    setNewOpen(true);
  };

  const updateLine = (i, patch) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const pickProduct = (i, productId) => {
    const p = (products.data || []).find((x) => x._id === productId);
    updateLine(i, { product: productId, rate: p ? p.dailyRate : '' });
  };

  const validLines = lines.filter((l) => l.product && Number(l.qty) > 0);
  const preview = form.start && form.end && form.end >= form.start ? estimate(validLines.map((l) => ({ qty: l.qty, rate: l.rate })), form.start, form.end) : 0;

  const submitNew = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      await api('/rentals', {
        method: 'POST',
        body: {
          customer: form.customer,
          project: form.project || undefined,
          start: form.start,
          end: form.end,
          deposit: Number(form.deposit) || 0,
          notes: form.notes || '',
          lines: validLines.map((l) => ({ product: l.product, qty: Number(l.qty), rate: l.rate === '' ? undefined : Number(l.rate) })),
        },
      });
      setNewOpen(false);
      rentals.reload(); products.reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const openReturn = (r) => {
    setRetFor(r);
    setRetForm({ date: today(), items: {} });
    setFerr('');
  };

  const setItem = (lineId, key, value) =>
    setRetForm((f) => ({ ...f, items: { ...f.items, [lineId]: { ...(f.items[lineId] || {}), [key]: value } } }));

  const submitReturn = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      const items = Object.entries(retForm.items)
        .map(([lineId, x]) => ({ lineId, good: Number(x.good) || 0, damaged: Number(x.damaged) || 0 }))
        .filter((i) => i.good + i.damaged > 0);
      await api(`/rentals/${retFor._id}/returns`, { method: 'POST', body: { date: retForm.date, items } });
      setRetFor(null);
      rentals.reload(); products.reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = { active: t('active'), partial: t('partial'), overdue: t('overdue'), completed: t('completed') };

  return (
    <>
      <PageHeader title={t('rentals')}>
        <button className="btn-primary" onClick={openNew}>+ {t('newRental')}</button>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} placeholder={t('search')} />
      {rentals.error && <p className="text-red-700 mb-3">{rentals.error}</p>}

      <DataTable
        heads={[t('docNo'), t('customer'), t('productsCol'), t('start'), t('end'), t('openQty'), t('total'), t('paid'), t('balance'), t('status'), t('actions')]}
        empty={t('noData')}
        rows={list.map((r) => [
          <span className="font-mono text-xs">{r.no}</span>,
          <div><div className="font-medium">{r.customer?.name}</div>{r.project?.name && <div className="text-xs text-dark">{r.project.name}</div>}</div>,
          <span className="whitespace-normal block max-w-[220px] text-xs">{(r.productNames || []).join(', ')}</span>,
          r.start,
          r.end,
          r.open,
          money(r.total),
          <span className="text-green-700">{money(r.paid)}</span>,
          <span className={r.balance > 0 ? 'text-red-700 font-bold' : 'font-bold'}>{money(r.balance)}</span>,
          <StatusBadge status={r.status} label={statusLabel[r.status]} />,
          r.open > 0 ? <button className="btn-ghost !py-1" onClick={() => openReturn(r)}>{t('return')}</button> : '—',
        ])}
      />

      {/* New rental */}
      <Modal open={newOpen} title={t('newRental')} onClose={() => setNewOpen(false)} wide>
        <form onSubmit={submitNew} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('customer')}>
              <select required value={form.customer || ''} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                <option value="">—</option>
                {(customers.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('project')}>
              <select value={form.project || ''} onChange={(e) => setForm({ ...form, project: e.target.value })}>
                <option value="">—</option>
                {(projects.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t('start')}>
              <input type="date" required value={form.start || ''} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label={t('end')}>
              <input type="date" required value={form.end || ''} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
          </div>

          <div>
            <div className="text-xs font-semibold text-dark mb-2">{t('productsCol')}</div>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const p = (products.data || []).find((x) => x._id === l.product);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <Field label={t('product')} className="col-span-12 sm:col-span-6">
                      <select required value={l.product} onChange={(e) => pickProduct(i, e.target.value)}>
                        <option value="">—</option>
                        {(products.data || []).map((x) => (
                          <option key={x._id} value={x._id}>{x.name} ({x.sku}) — {t('available')}: {x.available}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t('qty')} className="col-span-4 sm:col-span-2">
                      <input type="number" min="1" max={p?.available} value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} />
                    </Field>
                    <Field label={t('rate')} className="col-span-5 sm:col-span-3">
                      <input type="number" step="any" min="0" value={l.rate} onChange={(e) => updateLine(i, { rate: e.target.value })} />
                    </Field>
                    <button type="button" className="col-span-3 sm:col-span-1 text-red-700 text-sm pb-2"
                      onClick={() => setLines((ls) => ls.length > 1 ? ls.filter((_, k) => k !== i) : ls)}>✕</button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn-ghost mt-2 !py-1" onClick={() => setLines((ls) => [...ls, emptyLine()])}>+ {t('productsCol')}</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('deposit')}>
              <input type="number" step="any" min="0" value={form.deposit ?? 0} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
            </Field>
            <Field label={t('notes')}>
              <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-xl bg-charcoal text-white p-4 flex flex-wrap gap-6 items-center">
            <div><div className="text-xs text-gray-400">{t('totalPreview')}</div><div className="text-xl font-bold text-orange">{money(preview)}</div></div>
            <div className="text-xs text-gray-300">{form.start && form.end ? `${t('lineDays')}: ${Math.max(1, Math.round((new Date(form.end) - new Date(form.start)) / 86400000))}` : ''}</div>
          </div>

          {ferr && <p className="text-red-700 text-sm">{ferr}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setNewOpen(false)}>{t('cancel')}</button>
            <button className="btn-primary" disabled={busy}>{t('save')}</button>
          </div>
        </form>
      </Modal>

      {/* Return */}
      <Modal open={!!retFor} title={`${t('return')} — ${retFor?.no || ''}`} onClose={() => setRetFor(null)} wide>
        {retFor && (
          <form onSubmit={submitReturn} className="space-y-4">
            <Field label={t('returnDate')}>
              <input type="date" required value={retForm.date} onChange={(e) => setRetForm({ ...retForm, date: e.target.value })} className="sm:max-w-xs" />
            </Field>
            <div className="card overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr>
                  <th className="th">{t('productsCol')}</th><th className="th">{t('remaining')}</th>
                  <th className="th">{t('goodUnits')}</th><th className="th">{t('damagedUnits')}</th>
                </tr></thead>
                <tbody>
                  {retFor.lines.filter((l) => l.remaining > 0).map((l) => (
                    <tr key={l.lineId}>
                      <td className="td">{l.productName}</td>
                      <td className="td font-bold">{l.remaining}</td>
                      <td className="td"><input type="number" min="0" max={l.remaining} className="w-24" value={retForm.items[l.lineId]?.good ?? ''} onChange={(e) => setItem(l.lineId, 'good', e.target.value)} /></td>
                      <td className="td"><input type="number" min="0" max={l.remaining} className="w-24" value={retForm.items[l.lineId]?.damaged ?? ''} onChange={(e) => setItem(l.lineId, 'damaged', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ferr && <p className="text-red-700 text-sm">{ferr}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setRetFor(null)}>{t('cancel')}</button>
              <button className="btn-primary" disabled={busy}>{t('save')}</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
