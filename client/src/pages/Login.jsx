import { useState } from 'react';
import { api, setToken } from '../lib/api.js';
import { Field } from '../components/ui.jsx';
import { useI18n } from '../lib/i18n.jsx';

export default function Login({ onLogin }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(d.token);
      onLogin(d.user);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-charcoal">Kaah <span className="text-orange">Steel Props</span></div>
          <div className="text-xs text-dark">Rental & Business Management</div>
        </div>
        <Field label={t('email')} className="w-full">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
        </Field>
        <Field label={t('password')} className="w-full">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
        </Field>
        {err && <p className="text-red-700 text-sm">{err}</p>}
        <button className="btn-primary w-full justify-center" disabled={busy}>{t('login')}</button>
      </form>
    </div>
  );
}
