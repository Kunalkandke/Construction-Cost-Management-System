import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS } from '../../lib/constants';
import { formatINR, formatINRCompact } from '../../lib/format';

export function FloorStack({ floorSplit }) {
  const row = Object.fromEntries(floorSplit.map((f) => [f.label, f.amount]));
  return (
    <ChartCard title="Floor-wise split" label="Stacked bar of cost split by floor" height={240} table={{ columns: ['Part', 'Amount'], rows: floorSplit.map((f) => [f.label, formatINR(f.amount)]) }}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={[{ name: 'Cost', ...row }]} layout="vertical" margin={{ left: 0, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#CBD5E1" />
          <XAxis type="number" tickFormatter={formatINRCompact} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(v) => formatINR(v)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {floorSplit.map((f, i) => <Bar key={f.label} dataKey={f.label} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
