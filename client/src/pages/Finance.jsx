import { useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { money, today, downloadCsv } from '../lib/format.js';
import { PageHeader, DataTable, Modal, Field, Stat, StatusBadge, useData, useForm } from '../components/ui.jsx';

const EXPENSE_CATS = ['transport', 'repair', 'salary', 'warehouseRent', 'other'];
const REPORTS = ['products', 'rentals', 'sales', 'payments', 'expenses'];

export default function Finance() {
  const { t } = useI18n();
  const [tab, setTab] = useState('expenses');
  const tabs = [['expenses', t('expenseTab')], ['damage', t('damageTab')], ['reports', t('reportsTab')]];

  return (
    <>
      <PageHeader title={t('finance')} />
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn-dark' : 'btn-ghost'}>{label}</button>
        ))}
      </div>
      {tab === 'expenses' && <Expenses />}
      {tab === 'damage' && <Damage />}
      {tab === 'reports' && <Reports />}
    </>
  );
}

function Expenses() {
  const { t } = useI18n();
  const { data, error, reload } = useData('/expenses');
  const [open, setOpen] = useState(false);
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      await api('/expenses', { method: 'POST', body: { ...v, amount: Number(v.amount) } });
      setOpen(false);
      reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <button className="btn-primary" onClick={() => { setV({ category: 'transport', date: today() }); setFerr(''); setOpen(true); }}>+ {t('addExpense')}</button>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      <DataTable
        heads={[t('date'), t('category'), t('amount'), t('project'), t('notes')]}
        empty={t('noData')}
        rows={(data || []).map((e) => [e.date, t(e.category), <span className="font-bold">{money(e.amount)}</span>, e.project?.name || '-', e.note || '-'])}
      />

      <Modal open={open} title={t('addExpense')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('category')} className="sm:col-span-2">
            <select value={v.category || ''} onChange={set('category')}>
              {EXPENSE_CATS.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </Field>
          <Field label={t('amount')}><input type="number" step="0.01" min="0" required value={v.amount ?? ''} onChange={set('amount')} /></Field>
          <Field label={t('date')}><input type="date" required value={v.date || ''} onChange={set('date')} /></Field>
          <Field label={t('notes')} className="sm:col-span-2"><input value={v.note || ''} onChange={set('note')} /></Field>
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

function Damage() {
  const { t } = useI18n();
  const damages = useData('/damages');
  const products = useData('/products');
  const [open, setOpen] = useState(false);
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      await api('/damages', { method: 'POST', body: { ...v, qty: Number(v.qty), cost: Number(v.cost) || 0 } });
      setOpen(false);
      damages.reload(); products.reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (d) => {
    await api(`/damages/${d._id}`, { method: 'PATCH', body: { status: d.status === 'open' ? 'resolved' : 'open' } });
    damages.reload();
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <button className="btn-primary" onClick={() => { setV({ type: 'damaged', date: today(), responsibility: 'none', cost: 0 }); setFerr(''); setOpen(true); }}>+ {t('recordDamage')}</button>
      </div>
      {damages.error && <p className="text-red-700">{damages.error}</p>}
      <DataTable
        heads={[t('date'), t('product'), t('type'), t('qty'), t('cost'), t('responsibility'), t('reason'), t('status'), t('actions')]}
        empty={t('noData')}
        rows={(damages.data || []).map((d) => [
          d.date,
          d.product?.name || '-',
          <span className={d.type === 'lost' ? 'text-red-700 font-semibold' : 'text-orange font-semibold'}>{t(d.type)}</span>,
          d.qty,
          money(d.cost),
          t(d.responsibility),
          d.reason || '-',
          <StatusBadge status={d.status} label={d.status === 'open' ? t('open') : t('completed')} />,
          <button className="btn-ghost !py-1" onClick={() => toggle(d)}>{d.status === 'open' ? t('resolve') : t('reopen')}</button>,
        ])}
      />

      <Modal open={open} title={t('recordDamage')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('product')} className="sm:col-span-2">
            <select required value={v.product || ''} onChange={set('product')}>
              <option value="">—</option>
              {(products.data || []).map((p) => <option key={p._id} value={p._id}>{p.name} — {t('available')}: {p.available}</option>)}
            </select>
          </Field>
          <Field label={t('type')}>
            <select value={v.type || 'damaged'} onChange={set('type')}>
              <option value="damaged">{t('damaged')}</option>
              <option value="lost">{t('lost')}</option>
            </select>
          </Field>
          <Field label={t('qty')}><input type="number" min="1" required value={v.qty ?? ''} onChange={set('qty')} /></Field>
          <Field label={t('cost')}><input type="number" step="0.01" min="0" value={v.cost ?? 0} onChange={set('cost')} /></Field>
          <Field label={t('responsibility')}>
            <select value={v.responsibility || 'none'} onChange={set('responsibility')}>
              <option value="none">—</option>
              <option value="company">{t('company')}</option>
              <option value="customer">{t('customer')}</option>
            </select>
          </Field>
          <Field label={t('date')}><input type="date" required value={v.date || ''} onChange={set('date')} /></Field>
          <Field label={t('reason')} className="sm:col-span-2"><input value={v.reason || ''} onChange={set('reason')} /></Field>
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

function Reports() {
  const { t } = useI18n();
  const pl = useData('/reports/pl');
  const [err, setErr] = useState('');

  const exportKind = async (kind) => {
    setErr('');
    try {
      const rows = await api(`/reports/${kind}`);
      downloadCsv(kind, rows);
    } catch (x) {
      setErr(x.message);
    }
  };

  const d = pl.data;
  return (
    <>
      {d && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Stat label={t('rentalRev')} value={money(d.rentalRevenue)} />
          <Stat label={t('salesRevenue')} value={money(d.salesRevenue)} />
          <Stat label={t('expenses')} value={money(d.expenses)} tone="text-red-700" />
          <Stat label={t('net')} value={money(d.net)} tone="text-green-700" />
          <Stat label={t('collected')} value={money(d.collected)} />
        </div>
      )}
      <div className="card p-4">
        <h3 className="font-semibold mb-3">{t('exportCsv')}</h3>
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((k) => <button key={k} className="btn-ghost" onClick={() => exportKind(k)}>{t(k)}</button>)}
        </div>
        {err && <p className="text-red-700 text-sm mt-3">{err}</p>}
      </div>
    </>
  );
}
