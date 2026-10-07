import { TrendingUp } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { KpiCard } from '../ui/Feedback';
import { EscalationChart } from '../charts/EscalationChart';
import { TornadoChart } from '../charts/TornadoChart';
import { formatINR, formatMonth } from '../../lib/format';

export function PredictionTab({ result }) {
  const p = result.prediction;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Projected total at completion" value={formatINR(p.projectedTotal)} icon={TrendingUp} hint={`Completion ${formatMonth(p.completionMonth)}`} />
        <KpiCard label="Expected escalation" value={`${p.escalationPct}%`} hint={`Blended price rise about ${p.blendedAnnualPct}% a year`} />
        <KpiCard label="Basis" value={p.basis === 'rate_history' ? 'Rate history' : 'Default'} hint={p.basis === 'rate_history' ? 'Fitted from past rates of key items' : 'Not enough rate history yet, so a default yearly rise is assumed'} />
      </div>
      <EscalationChart series={p.series} />
      <TornadoChart sensitivity={result.sensitivity} />
      <GlassCard>
        <h3 className="mb-2 font-bold">Reading the sensitivity chart</h3>
        <ul className="space-y-1 text-sm text-ink-700">
          {result.sensitivity.slice(0, 4).map((s) => <li key={s.factor}>If <b>{s.factor.toLowerCase()}</b>, your total moves by about <b className="num">{formatINR(Math.abs(s.impactAmount))}</b> ({Math.abs(s.impactPct)}%).</li>)}
        </ul>
      </GlassCard>
    </div>
  );
}
