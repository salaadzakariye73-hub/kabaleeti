import { PageHeader, Stat, Notes, useData } from '../components/ui.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { money } from '../lib/format.js';

export default function Dashboard() {
  const { t } = useI18n();
  const { data, error } = useData('/dashboard');

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-dark">…</p>;

  const cur = data.currency;
  const T = data.totals;

  return (
    <>
      <PageHeader title={t('dashboard')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Stat label={t('activeRentals')} value={data.activeRentals} />
        <Stat label={t('overdue')} value={data.overdueRentals} tone="text-red-700" />
        <Stat label={t('outstanding')} value={money(data.outstanding, cur)} tone="text-red-700" />
        <Stat label={t('collected')} value={money(data.collected, cur)} tone="text-green-700" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Stat label={t('inventory_total')} value={T.inventory} />
        <Stat label={t('available')} value={T.available} tone="text-green-700" />
        <Stat label={t('rented')} value={T.rented} tone="text-orange" />
        <Stat label={`${t('damaged')} / ${t('lost')}`} value={`${T.damaged} / ${T.lost}`} tone="text-red-700" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label={t('monthRent')} value={money(data.monthRentalRevenue, cur)} />
        <Stat label={t('salesRevenue')} value={money(data.salesRevenue, cur)} />
        <Stat label={t('expenses')} value={money(data.expenses, cur)} />
        <Stat label={t('profit')} value={money(data.profit, cur)} tone="text-green-700" />
      </div>

      <Notes
        title={t('overdue')}
        items={data.overdueList.map((r) => `${r.no} — ${r.customer} — ${r.end}`)}
      />
      <Notes
        title={t('upcoming')}
        items={data.upcomingReturns.map((r) => `${r.no} — ${r.customer} — ${r.end}`)}
      />
      <Notes
        title={t('lowStock')}
        items={data.lowStock.map((p) => `${p.name} (${p.sku}) — ${t('available')}: ${p.available}`)}
      />
    </>
  );
}
