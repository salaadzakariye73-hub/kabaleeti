import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Users, CalendarClock, ReceiptText, Wallet, BarChart3, Settings, Menu, LogOut, Languages } from 'lucide-react';
import { useI18n } from '../lib/i18n.jsx';

export default function Layout({ user, onLogout }) {
  const { t, lang, toggle } = useI18n();
  const [drawer, setDrawer] = useState(false);

  const items = [
    ['/', 'dashboard', LayoutDashboard],
    ['/inventory', 'inventory', Package],
    ['/customers', 'customers', Users],
    ['/rentals', 'rentals', CalendarClock],
    ['/invoices', 'invoices', ReceiptText],
    ['/payments', 'payments', Wallet],
    ['/finance', 'finance', BarChart3],
  ];
  if (user.role === 'admin') items.push(['/admin', 'admin', Settings]);

  const sidebar = (
    <div className="flex flex-col h-full p-4">
      <div className="mb-6">
        <div className="text-orange font-bold text-lg leading-tight">Kaah Steel Props</div>
        <div className="text-xs text-gray-400">Equipment Operations</div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(([to, key, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setDrawer(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive ? 'bg-dark text-white border-l-4 border-orange' : 'text-gray-300 hover:bg-dark/60'
              }`}
          >
            <Icon size={18} />
            {t(key)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-dark text-xs text-gray-400">
        <div className="text-white text-sm">{user.name}</div>
        <div className="uppercase tracking-wide">{user.role}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 bg-charcoal text-white sticky top-0 h-screen">{sidebar}</aside>

      {/* Phone/tablet drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-charcoal text-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button className="md:hidden text-charcoal" onClick={() => setDrawer(true)} aria-label="menu">
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-ghost" onClick={toggle}>
              <Languages size={16} />
              {lang === 'so' ? 'English' : 'Af-Soomaali'}
            </button>
            <button className="btn-dark" onClick={onLogout}>
              <LogOut size={16} />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
