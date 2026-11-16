import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { PageHeader, DataTable, Modal, Field, useData, useForm } from '../components/ui.jsx';

const ROLES = ['admin', 'manager', 'accountant', 'storekeeper', 'sales'];

export default function Admin() {
  const { t } = useI18n();
  const [tab, setTab] = useState('users');
  return (
    <>
      <PageHeader title={t('admin')} />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('users')} className={tab === 'users' ? 'btn-dark' : 'btn-ghost'}>{t('users')}</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'btn-dark' : 'btn-ghost'}>{t('settings')}</button>
      </div>
      {tab === 'users' ? <Users /> : <CompanySettings />}
    </>
  );
}

function Users() {
  const { t } = useI18n();
  const { data, error, reload } = useData('/users');
  const [open, setOpen] = useState(false);
  const [v, set, setV] = useForm({});
  const [ferr, setFerr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFerr('');
    try {
      await api('/users', { method: 'POST', body: v });
      setOpen(false);
      reload();
    } catch (x) {
      setFerr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (u, body) => {
    try {
      await api(`/users/${u.id}`, { method: 'PATCH', body });
      reload();
    } catch (x) {
      alert(x.message);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <button className="btn-primary" onClick={() => { setV({ role: 'sales' }); setFerr(''); setOpen(true); }}>+ {t('addUser')}</button>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      <DataTable
        heads={[t('name'), t('email'), t('phone'), t('role'), t('active_status'), t('actions')]}
        empty={t('noData')}
        rows={(data || []).map((u) => [
          u.name,
          u.email,
          u.phone || '-',
          <select value={u.role} onChange={(e) => patch(u, { role: e.target.value })} className="!py-1">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>,
          <span className={u.active ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{u.active ? 'Active' : 'Off'}</span>,
          <button className="btn-ghost !py-1" onClick={() => patch(u, { active: !u.active })}>{u.active ? 'Disable' : 'Enable'}</button>,
        ])}
      />

      <Modal open={open} title={t('addUser')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('name')} className="sm:col-span-2"><input required value={v.name || ''} onChange={set('name')} /></Field>
          <Field label={t('email')}><input type="email" required value={v.email || ''} onChange={set('email')} /></Field>
          <Field label={t('phone')}><input value={v.phone || ''} onChange={set('phone')} /></Field>
          <Field label={t('role')}>
            <select value={v.role || 'sales'} onChange={set('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label={t('password')}><input type="password" minLength="8" required value={v.password || ''} onChange={set('password')} /></Field>
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

function CompanySettings() {
  const { t } = useI18n();
  const [v, set, setV] = useForm({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings').then(setV).catch((x) => setErr(x.message));
  }, [setV]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const s = await api('/settings', {
        method: 'PUT',
        body: { ...v, graceDays: Number(v.graceDays) || 0 },
      });
      setV(s);
      setMsg(t('saved'));
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <form onSubmit={submit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
      <Field label={t('companyName')} className="sm:col-span-2"><input value={v.companyName || ''} onChange={set('companyName')} /></Field>
      <Field label={t('address')} className="sm:col-span-2"><input value={v.address || ''} onChange={set('address')} /></Field>
      <Field label={t('phone')}><input value={v.phone || ''} onChange={set('phone')} /></Field>
      <Field label={t('email')}><input type="email" value={v.email || ''} onChange={set('email')} /></Field>
      <Field label={t('currency')}>
        <select value={v.currency || 'USD'} onChange={set('currency')}>
          <option value="USD">USD ($)</option>
          <option value="SOS">SOS</option>
        </select>
      </Field>
      <Field label={t('graceDays')}><input type="number" min="0" value={v.graceDays ?? 0} onChange={set('graceDays')} /></Field>
      {err && <p className="text-red-700 text-sm sm:col-span-2">{err}</p>}
      {msg && <p className="text-green-700 text-sm sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2 flex justify-end">
        <button className="btn-primary">{t('save')}</button>
      </div>
    </form>
  );
}
