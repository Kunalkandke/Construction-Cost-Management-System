import { GlassCard } from '../ui/GlassCard';
import { CashFlowChart } from '../charts/CashFlowChart';
import { formatINR, formatMonth } from '../../lib/format';

export function ScheduleTab({ result }) {
  const { schedule } = result;
  const n = schedule.durationMonths;
  return (
    <div className="space-y-4">
      <GlassCard strong>
        <h3 className="mb-1 font-bold">Construction timeline ({n} months)</h3>
        <p className="mb-3 text-sm text-ink-500">Stages overlap. Bars show when each stage is active.</p>
        <div className="overflow-x-auto">
          <div className="min-w-[560px] space-y-2" role="img" aria-label="Gantt chart of construction stages across months">
            <div className="grid text-[10px] text-ink-500" style={{ gridTemplateColumns: `180px repeat(${n}, 1fr)` }}>
              <span />{schedule.cashFlow.map((c) => <span key={c.month} className="text-center">{formatMonth(c.label).slice(0, 3)}</span>)}
            </div>
            {schedule.stages.map((s) => (
              <div key={s.name} className="grid items-center gap-0" style={{ gridTemplateColumns: `180px repeat(${n}, 1fr)` }}>
                <span className="truncate pr-2 text-xs font-medium">{s.name}</span>
                {Array.from({ length: n }, (_, i) => {
                  const m = i + 1; const on = m >= s.startMonth && m <= s.endMonth;
                  return <span key={m} className={`h-5 ${on ? 'bg-brand-500' : 'bg-ink-300/30'} ${m === s.startMonth ? 'rounded-l-md' : ''} ${m === s.endMonth ? 'rounded-r-md' : ''}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
      <CashFlowChart cashFlow={schedule.cashFlow} />
      <GlassCard strong padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-brand-50/80 text-left text-xs uppercase text-ink-500"><tr><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Months</th><th className="px-3 py-2 text-right">Share</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
            <tbody>{schedule.stages.map((s) => <tr key={s.name} className="border-t border-ink-300/30"><td className="px-3 py-2">{s.name}</td><td className="px-3 py-2">{s.startMonth === s.endMonth ? s.startMonth : `${s.startMonth}-${s.endMonth}`}</td><td className="tabular px-3 py-2 text-right">{s.pct}%</td><td className="tabular px-3 py-2 text-right font-semibold">{formatINR(s.amount)}</td></tr>)}</tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
