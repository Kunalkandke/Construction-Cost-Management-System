import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { formatINR, formatINRCompact, formatMonth } from '../../lib/format';

export function CashFlowChart({ cashFlow }) {
  const data = cashFlow.map((c) => ({ name: formatMonth(c.label), Spend: c.amount, Cumulative: c.cumulative }));
  return (
    <ChartCard title="Monthly cash flow" label="Monthly spend bars with a cumulative line" table={{ columns: ['Month', 'Spend', 'Cumulative'], rows: data.map((d) => [d.name, formatINR(d.Spend), formatINR(d.Cumulative)]) }}>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatINRCompact} tick={{ fontSize: 11 }} width={56} />
          <Tooltip formatter={(v) => formatINR(v)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Spend" fill="#1F78B4" radius={[6, 6, 0, 0]} />
          <Line type="monotone" dataKey="Cumulative" stroke="#E8941A" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
