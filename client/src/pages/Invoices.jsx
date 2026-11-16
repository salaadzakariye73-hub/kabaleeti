import { useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { money, today } from '../lib/format.js';
import { PageHeader, SearchBox, DataTable, Modal, Field, StatusBadge, useData, useForm } from '../components/ui.jsx';

export default function Invoices() {
  const { t } = useI18n();
  const [tab, setTab] = useState('rentals'); // rentals | sales
  const [filter, setFilter] = useState('all'); // all | unpaid | paid
  const [q, setQ] = useState('');
  const rentals = useData('/rentals');
  const sales = useData('/sales');
  const customers = useData('/customers');
  const products = useData('/products');

  const [open, setOpen] = useState(false);
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const statusLabel = { active: t('active'), partial: t('partial'), overdue: t('overdue'), completed: t('completed') };

  const rentalRows = (rentals.data || [])
    .filter((r) => (filter === 'unpaid' ? r.balance > 0.005 : filter === 'paid' ? r.balance <= 0.005 : true))
    .filter((r) => `${r.no} ${r.customer?.name || ''}`.toLowerCase().includes(q.toLowerCase()));

  const saleRows = (sales.data || [])
    .filter((s) => (filter === 'unpaid' ? s.balance > 0.005 : filter === 'paid' ? s.balance <= 0.005 : true))
    .filter((s) => `${s.no} ${s.customer?.name || ''}`.toLowerCase().includes(q.toLowerCase()));

  const openSale = () => {
    setV({ date: today(), qty: 1, discount: 0, taxPct: 0 });
    setFerr('');
    setOpen(true);
  };

  const pickProduct = (productId) => {
    const p = (products.data || []).find((x) => x._id === productId);
    setV({ ...v, product: productId, price: p ? p.sellPrice : '' });
  };

  const submitSale = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      await api('/sales', { method: 'POST', body: v });
      setOpen(false);
      sales.reload(); products.reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const netPreview = (Number(v.qty) || 0) * (Number(v.price) || 0) - (Number(v.discount) || 0);
  const totalPreview = netPreview + netPreview * (Number(v.taxPct) || 0) / 100;

  return (
    <>
      <PageHeader title={t('invoices')}>
        {tab === 'sales' && <button className="btn-primary" onClick={openSale}>+ {t('newSale')}</button>}
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-3">
        {['rentals', 'sales'].map((k) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn-dark' : 'btn-ghost'}>
            {k === 'rentals' ? t('rentals') : t('sales')}
          </button>
        ))}
        <span className="mx-2 hidden sm:inline" />
        {[['all', t('allFilter')], ['unpaid', t('unpaid')], ['paid', t('paid')]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-sm ${filter === k ? 'bg-orange text-white' : 'bg-white border border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>
      <SearchBox value={q} onChange={setQ} placeholder={t('search')} />

      {tab === 'rentals' ? (
        <DataTable
          heads={[t('invoiceNo'), t('customer'), t('productsCol'), t('start'), t('end'), t('total'), t('paid'), t('balance'), t('status')]}
          empty={t('noData')}
          rows={rentalRows.map((r) => [
            <span className="font-mono text-xs">{r.no}</span>,
            <div><div className="font-medium">{r.customer?.name}</div><div className="text-xs text-dark">{r.project?.name || ''}</div></div>,
            <span className="whitespace-normal block max-w-[220px] text-xs">{(r.productNames || []).join(', ')}</span>,
            r.start, r.end,
            money(r.total),
            <span className="text-green-700">{money(r.paid)}</span>,
            <span className={r.balance > 0 ? 'text-red-700 font-bold' : 'font-bold'}>{money(r.balance)}</span>,
            <StatusBadge status={r.status} label={statusLabel[r.status]} />,
          ])}
        />
      ) : (
        <DataTable
          heads={[t('invoiceNo'), t('date'), t('customer'), t('product'), t('qty'), t('total'), t('paid'), t('balance')]}
          empty={t('noData')}
          rows={saleRows.map((s) => [
            <span className="font-mono text-xs">{s.no}</span>,
            s.date,
            s.customer?.name,
            s.product?.name,
            s.qty,
            money(s.total),
            <span className="text-green-700">{money(s.paid)}</span>,
            <span className={s.balance > 0 ? 'text-red-700 font-bold' : 'font-bold'}>{money(s.balance)}</span>,
          ])}
        />
      )}

      <Modal open={open} title={t('newSale')} onClose={() => setOpen(false)}>
        <form onSubmit={submitSale} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('customer')} className="sm:col-span-2">
            <select required value={v.customer || ''} onChange={set('customer')}>
              <option value="">—</option>
              {(customers.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t('product')} className="sm:col-span-2">
            <select required value={v.product || ''} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">—</option>
              {(products.data || []).map((p) => (
                <option key={p._id} value={p._id}>{p.name} — {t('available')}: {p.available}</option>
              ))}
            </select>
          </Field>
          <Field label={t('qty')}><input type="number" min="1" required value={v.qty ?? ''} onChange={set('qty')} /></Field>
          <Field label={t('price')}><input type="number" step="any" min="0" value={v.price ?? ''} onChange={set('price')} /></Field>
          <Field label={t('discount')}><input type="number" step="any" min="0" value={v.discount ?? 0} onChange={set('discount')} /></Field>
          <Field label={t('taxPct')}><input type="number" step="any" min="0" value={v.taxPct ?? 0} onChange={set('taxPct')} /></Field>
          <Field label={t('date')}><input type="date" required value={v.date || ''} onChange={set('date')} /></Field>
          <Field label={t('notes')}><input value={v.notes || ''} onChange={set('notes')} /></Field>
          <div className="sm:col-span-2 rounded-xl bg-charcoal text-white p-3 flex justify-between">
            <span className="text-sm">{t('total')}</span>
            <span className="font-bold text-orange">{money(totalPreview)}</span>
          </div>
          {ferr && <p className="text-red-700 text-sm sm:col-span-2">{ferr}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t('cancel')}</button>
            <button className="btn-primary" disabled={busy}>{t('save')}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
