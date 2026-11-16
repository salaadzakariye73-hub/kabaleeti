import { useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { money } from '../lib/format.js';
import { PageHeader, SearchBox, DataTable, Modal, Field, useData, useForm } from '../components/ui.jsx';

export default function Customers() {
  const { t } = useI18n();
  const { data, error, reload } = useData('/customers');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = (data || []).filter((c) => `${c.name} ${c.phone || ''} ${c.company || ''}`.toLowerCase().includes(q.toLowerCase()));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      await api('/customers', { method: 'POST', body: v });
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
      <PageHeader title={t('customers')}>
        <button className="btn-primary" onClick={() => { setV({}); setFerr(''); setOpen(true); }}>+ {t('addCustomer')}</button>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} placeholder={t('search')} />
      {error && <p className="text-red-700 mb-3">{error}</p>}

      <DataTable
        heads={[t('name'), t('phone'), t('email'), t('rentals'), t('total'), t('paid'), t('balance')]}
        empty={t('noData')}
        rows={rows.map((c) => [
          <div><div className="font-medium">{c.name}</div>{c.company && <div className="text-xs text-dark">{c.company}</div>}</div>,
          c.phone || '-',
          c.email || '-',
          c.rentals,
          money(c.billed),
          <span className="text-green-700">{money(c.paid)}</span>,
          <span className={c.balance > 0 ? 'text-red-700 font-bold' : 'font-bold'}>{money(c.balance)}</span>,
        ])}
      />

      <Modal open={open} title={t('addCustomer')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('name')} className="sm:col-span-2"><input required value={v.name || ''} onChange={set('name')} /></Field>
          <Field label={t('company')}><input value={v.company || ''} onChange={set('company')} /></Field>
          <Field label={t('phone')}><input value={v.phone || ''} onChange={set('phone')} /></Field>
          <Field label={t('email')}><input type="email" value={v.email || ''} onChange={set('email')} /></Field>
          <Field label={t('identificationNo')}><input value={v.identificationNo || ''} onChange={set('identificationNo')} /></Field>
          <Field label={t('address')} className="sm:col-span-2"><input value={v.address || ''} onChange={set('address')} /></Field>
          <Field label={t('notes')} className="sm:col-span-2"><textarea rows="2" value={v.notes || ''} onChange={set('notes')} /></Field>
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
