import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api, getToken, setToken } from './lib/api.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Customers from './pages/Customers.jsx';
import Rentals from './pages/Rentals.jsx';
import Invoices from './pages/Invoices.jsx';
import Payments from './pages/Payments.jsx';
import Finance from './pages/Finance.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session from the saved token on page load.
  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // Any 401 from the API logs the user out.
  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener('kaah:logout', out);
    return () => window.removeEventListener('kaah:logout', out);
  }, []);

  if (!ready) return <div className="p-10 text-center text-dark">…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const logout = () => { setToken(null); setUser(null); };

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={logout} />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="customers" element={<Customers />} />
        <Route path="rentals" element={<Rentals />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
        <Route path="finance" element={<Finance />} />
        <Route path="admin" element={user.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
