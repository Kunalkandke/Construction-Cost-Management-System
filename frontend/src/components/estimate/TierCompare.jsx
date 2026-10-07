import { Check } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { GroupedBars } from '../charts/TierBars';
import { formatINR, formatINRCompact, titleCase } from '../../lib/format';

export function TierCompare({ result, onSwitchTier, switching }) {
  const current = result.inputs.qualityTier;
  const cur = result.tierComparison.find((t) => t.tier === current);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {result.tierComparison.map((t) => {
          const diff = t.grandTotal - cur.grandTotal;
          const sel = t.tier === current;
          return (
            <GlassCard key={t.tier} strong className={sel ? 'ring-2 ring-brand-500' : ''}>
              <div className="flex items-center justify-between"><h4 className="font-bold">{titleCase(t.tier)}</h4>{sel && <Badge tone="brand" icon={Check}>Selected</Badge>}</div>
              <p className="num mt-2 font-display text-2xl">{formatINR(t.grandTotal)}</p>
              <p className="text-sm text-ink-500">{formatINR(t.costPerSqft)} / sqft</p>
              <p className={`mt-1 text-sm font-semibold ${diff > 0 ? 'text-danger' : diff < 0 ? 'text-success' : 'text-ink-500'}`}>{sel ? 'Your selection' : `${diff > 0 ? '+' : '-'}${formatINR(Math.abs(diff))} vs selected`}</p>
              {!sel && onSwitchTier && <Button size="sm" variant="secondary" className="mt-3 w-full" loading={switching === t.tier} onClick={() => onSwitchTier(t.tier)}>Switch to this tier</Button>}
            </GlassCard>
          );
        })}
      </div>
      <GroupedBars title="Tier comparison" data={result.tierComparison.map((t) => ({ name: titleCase(t.tier), total: t.grandTotal }))} series={[{ key: 'total', name: 'Grand total' }]} format={formatINR} axisFormat={formatINRCompact} height={240} />
    </div>
  );
}
