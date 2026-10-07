import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { formatINR, formatINRCompact } from '../../lib/format';

// Diverging bars: how the grand total moves when one factor changes
export function TornadoChart({ sensitivity }) {
  const data = sensitivity.map((s) => ({ name: s.factor, value: s.impactAmount, pct: s.impactPct }));
  const h = Math.max(240, data.length * 44);
  return (
    <ChartCard title="Sensitivity: what moves your total most" label="Tornado chart of cost impact per factor" height={h} table={{ columns: ['Factor', 'Impact', 'Impact %'], rows: data.map((d) => [d.name, formatINR(d.value), `${d.pct}%`]) }}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#CBD5E1" />
          <XAxis type="number" tickFormatter={formatINRCompact} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
          <ReferenceLine x={0} stroke="#334155" />
          <Tooltip formatter={(v, n, p) => [`${formatINR(v)} (${p.payload.pct}%)`, 'Impact']} />
          <Bar dataKey="value" radius={4}>{data.map((d) => <Cell key={d.name} fill={d.value >= 0 ? '#F43F5E' : '#14B8A6'} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
