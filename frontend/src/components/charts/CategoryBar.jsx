import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS } from '../../lib/constants';
import { formatINR, formatINRCompact } from '../../lib/format';

export function CategoryBar({ categories, title = 'Category-wise cost' }) {
  const data = [...categories].sort((a, b) => b.amount - a.amount).map((c) => ({ name: c.label, value: c.amount }));
  return (
    <ChartCard title={title} label="Horizontal bar chart of cost per category" height={Math.max(260, data.length * 34)} table={{ columns: ['Category', 'Amount'], rows: data.map((d) => [d.name, formatINR(d.value)]) }}>
      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#CBD5E1" />
          <XAxis type="number" tickFormatter={formatINRCompact} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => formatINR(v)} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>{data.map((d, i) => <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
