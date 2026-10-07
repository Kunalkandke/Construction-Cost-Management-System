import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS } from '../../lib/constants';
import { formatINR, formatINRCompact } from '../../lib/format';

// max 8 slices: the rest is grouped as "Other"
export function groupSlices(items, max = 8) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  return [...head, { name: 'Other', value: sorted.slice(max - 1).reduce((a, b) => a + b.value, 0) }];
}

export function Donut({ data, centerLabel, centerValue, title, label, money = true, height = 280, onSliceClick }) {
  const slices = groupSlices(data);
  const total = slices.reduce((a, b) => a + b.value, 0);
  const fmt = (v) => (money ? formatINR(v) : String(v));
  return (
    <ChartCard title={title} label={label} height={height} table={{ columns: ['Name', 'Value', 'Share'], rows: slices.map((s) => [s.name, fmt(s.value), `${total ? Math.round((s.value / total) * 1000) / 10 : 0}%`]) }}>
      <div className="relative h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none" onClick={onSliceClick ? (d) => onSliceClick(d.name) : undefined} style={onSliceClick ? { cursor: 'pointer' } : undefined}>
              {slices.map((s, i) => <Cell key={s.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        {(centerValue !== undefined || centerLabel) && (
          <div className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="num font-display text-xl text-ink-900">{centerValue ?? (money ? formatINRCompact(total) : total)}</p>
            {centerLabel && <p className="text-xs text-ink-500">{centerLabel}</p>}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

export const CostDonut = ({ categories, total }) => (
  <Donut title="Cost by category" label="Donut chart of cost by category" data={categories.map((c) => ({ name: c.label, value: c.amount }))} centerValue={formatINRCompact(total)} centerLabel="Subtotal" />
);
