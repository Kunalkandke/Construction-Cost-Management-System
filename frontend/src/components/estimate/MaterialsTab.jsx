import { Boxes, HardHat } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { KpiCard, EmptyState } from '../ui/Feedback';
import { formatINR, formatNumber } from '../../lib/format';

export function MaterialsTab({ result }) {
  const { materials, labour } = result;
  return (
    <div className="space-y-4">
      {materials.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {materials.map((m) => <KpiCard key={m.key} label={m.label} value={formatNumber(m.quantity, m.quantity < 100 ? 1 : 0)} hint={m.unit} icon={Boxes} />)}
        </div>
      ) : (
        <GlassCard><EmptyState icon={Boxes} title="Material take-off needs the Detailed mode">Quick estimates use composite rates, so quantities of cement, steel and other materials are not itemised.</EmptyState></GlassCard>
      )}
      <GlassCard strong>
        <div className="flex items-start gap-3"><HardHat className="h-6 w-6 text-accent-600" aria-hidden />
          <div><h3 className="font-bold">Labour</h3>
            <p className="text-sm text-ink-500">A view of the cost, already included in the item rates (not an extra charge).</p></div></div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-ink-500">Labour portion</dt><dd className="num text-2xl">{formatINR(labour.totalAmount)}</dd></div>
          <div><dt className="text-xs text-ink-500">Share of cost</dt><dd className="num text-2xl">{labour.sharePct}%</dd></div>
          <div><dt className="text-xs text-ink-500">Approx. man-days</dt><dd className="num text-2xl">{formatNumber(labour.mandays)}</dd></div>
        </dl>
      </GlassCard>
    </div>
  );
}
