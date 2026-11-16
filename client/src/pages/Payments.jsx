import { useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { money, today } from '../lib/format.js';
import { PageHeader, SearchBox, DataTable, Modal, Field, Stat, useData, useForm } from '../components/ui.jsx';

export default function Payments() {
  const { t } = useI18n();
  const payments = useData('/payments');
  const docs = useData('/payments/open-documents');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const list = (payments.data || []).filter((p) =>
    `${p.docNo} ${p.customerName} ${p.reference || ''}`.toLowerCase().includes(q.toLowerCase()));
  const received = (payments.data || []).reduce((s, p) => s + p.amount, 0);

  const openNew = () => {
    setV({ date: today(), method: 'cash', amount: '' });
    setFerr('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      const [refType, refId] = (v.doc || '|').split('|');
      await api('/payments', {
        method: 'POST',
        body: { refType, refId, amount: Number(v.amount), method: v.method, date: v.date, reference: v.reference || '', notes: v.notes || '' },
      });
      setOpen(false);
      payments.reload(); docs.reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const selected = (docs.data || []).find((d) => `${d.refType}|${d.refId}` === v.doc);

  return (
    <>
      <PageHeader title={t('payments')}>
        <button className="btn-primary" onClick={openNew}>+ {t('recordPayment')}</button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 mb-4 max-w-xl">
        <Stat label={t('collected')} value={money(received)} tone="text-green-700" />
        <Stat label={t('outstanding')} value={money((docs.data || []).reduce((s, d) => s + d.balance, 0))} tone="text-red-700" />
      </div>

      <SearchBox value={q} onChange={setQ} placeholder={t('search')} />
      <DataTable
        heads={[t('date'), t('docNo'), t('customer'), t('amount'), t('method'), t('reference'), t('notes')]}
        empty={t('noData')}
        rows={list.map((p) => [
          p.date,
          <span className="font-mono text-xs">{p.docNo}</span>,
          p.customerName,
          <span className="font-bold text-green-700">{money(p.amount, p.currency)}</span>,
          t(p.method),
          p.reference || '-',
          p.notes || '-',
        ])}
      />

      <Modal open={open} title={t('recordPayment')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('selectDoc')} className="sm:col-span-2">
            <select required value={v.doc || ''} onChange={set('doc')}>
              <option value="">—</option>
              {(docs.data || []).map((d) => (
                <option key={`${d.refType}|${d.refId}`} value={`${d.refType}|${d.refId}`}>
                  {d.no} — {d.customer} — {t('balance')}: {money(d.balance)}
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <div className="sm:col-span-2 text-sm bg-peach/40 rounded-lg px-3 py-2">
              {t('balance')}: <span className="font-bold text-red-700">{money(selected.balance)}</span>
            </div>
          )}
          <Field label={t('amount')}>
            <input type="number" step="0.01" min="0.01" required value={v.amount ?? ''} onChange={set('amount')} />
          </Field>
          <Field label={t('method')}>
            <select value={v.method} onChange={set('method')}>
              <option value="cash">{t('cash')}</option>
              <option value="bank">{t('bank')}</option>
              <option value="mobile">{t('mobile')}</option>
            </select>
          </Field>
          <Field label={t('date')}><input type="date" required value={v.date || ''} onChange={set('date')} /></Field>
          <Field label={t('reference')}><input value={v.reference || ''} onChange={set('reference')} /></Field>
          <Field label={t('notes')} className="sm:col-span-2"><input value={v.notes || ''} onChange={set('notes')} /></Field>
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
