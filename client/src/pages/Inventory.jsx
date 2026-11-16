import { useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { money } from '../lib/format.js';
import { PageHeader, SearchBox, DataTable, Modal, Field, useData, useForm } from '../components/ui.jsx';

export default function Inventory() {
  const { t } = useI18n();
  const { data, error, reload } = useData('/products');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // 'add' | { restock: product }
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = (data || []).filter((p) => `${p.name} ${p.sku} ${p.size || ''}`.toLowerCase().includes(q.toLowerCase()));

  const openAdd = () => { setV({ unit: 'pcs', lowStockThreshold: 5, qty: 0 }); setFerr(''); setModal('add'); };
  const openRestock = (product) => { setV({ qty: '' }); setFerr(''); setModal({ restock: product }); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      if (modal === 'add') {
        await api('/products', { method: 'POST', body: v });
      } else {
        await api(`/products/${modal.restock._id}/stock`, { method: 'POST', body: { qty: Number(v.qty) } });
      }
      setModal(null);
      reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t('inventory')}>
        <button className="btn-primary" onClick={openAdd}>+ {t('addProduct')}</button>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} placeholder={t('search')} />
      {error && <p className="text-red-700 mb-3">{error}</p>}

      <DataTable
        heads={[t('sku'), t('product'), t('size'), t('unit'), t('total'), t('available'), t('rented'), t('sold'), t('damaged'), t('lost'), t('dailyRate'), t('sellPrice'), t('warehouse'), t('actions')]}
        empty={t('noData')}
        rows={rows.map((p) => [
          p.sku,
          <span className="font-medium">{p.name}</span>,
          p.size || '-',
          p.unit,
          p.total,
          <span className={p.available <= p.lowStockThreshold ? 'text-red-700 font-bold' : 'text-green-700 font-bold'}>{p.available}</span>,
          <span className="text-orange font-semibold">{p.rented}</span>,
          p.sold,
          p.damaged,
          p.lost,
          money(p.dailyRate),
          money(p.sellPrice),
          p.warehouse,
          <button className="btn-ghost !py-1" onClick={() => openRestock(p)}>{t('restock')}</button>,
        ])}
      />

      <Modal open={!!modal} title={modal === 'add' ? t('addProduct') : `${t('restock')}: ${modal?.restock?.name || ''}`} onClose={() => setModal(null)}>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modal === 'add' ? (
            <>
              <Field label={t('name')} className="sm:col-span-2"><input required value={v.name || ''} onChange={set('name')} /></Field>
              <Field label={t('sku')}><input value={v.sku || ''} onChange={set('sku')} placeholder="PRP-ACW-350" /></Field>
              <Field label={t('category')}><input value={v.category || ''} onChange={set('category')} /></Field>
              <Field label={t('size')}><input value={v.size || ''} onChange={set('size')} placeholder="2.0m - 3.5m" /></Field>
              <Field label={t('unit')}><input value={v.unit || ''} onChange={set('unit')} /></Field>
              <Field label={t('openingQty')}><input type="number" min="0" value={v.qty ?? ''} onChange={set('qty')} /></Field>
              <Field label={t('purchaseCost')}><input type="number" step="any" min="0" value={v.purchaseCost ?? ''} onChange={set('purchaseCost')} /></Field>
              <Field label={t('dailyRate')}><input type="number" step="any" min="0" value={v.dailyRate ?? ''} onChange={set('dailyRate')} /></Field>
              <Field label={t('sellPrice')}><input type="number" step="any" min="0" value={v.sellPrice ?? ''} onChange={set('sellPrice')} /></Field>
              <Field label={t('warehouse')}><input value={v.warehouse || ''} onChange={set('warehouse')} /></Field>
            </>
          ) : (
            <Field label={t('qty')} className="sm:col-span-2">
              <input type="number" min="1" required value={v.qty || ''} onChange={set('qty')} />
            </Field>
          )}
          {ferr && <p className="text-red-700 text-sm sm:col-span-2">{ferr}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>{t('cancel')}</button>
            <button className="btn-primary" disabled={busy}>{t('save')}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
