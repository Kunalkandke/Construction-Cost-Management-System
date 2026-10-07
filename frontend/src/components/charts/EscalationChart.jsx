import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { formatINR, formatINRCompact, formatMonth } from '../../lib/format';

export function EscalationChart({ series }) {
  const data = series.map((s) => ({ name: formatMonth(s.label), Base: s.baseCumulative, Projected: s.projectedCumulative }));
  return (
    <ChartCard title="Price escalation: base vs projected spend" label="Area chart comparing base and projected cumulative spend" table={{ columns: ['Month', 'Base', 'Projected'], rows: data.map((d) => [d.name, formatINR(d.Base), formatINR(d.Projected)]) }}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ left: 0, right: 8 }}>
          <defs>
            <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E8941A" stopOpacity={0.5} /><stop offset="95%" stopColor="#E8941A" stopOpacity={0.05} /></linearGradient>
            <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1F78B4" stopOpacity={0.4} /><stop offset="95%" stopColor="#1F78B4" stopOpacity={0.05} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatINRCompact} tick={{ fontSize: 11 }} width={56} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => formatINR(v)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Base" stroke="#1F78B4" fill="url(#gBase)" strokeWidth={2} />
          <Area type="monotone" dataKey="Projected" stroke="#E8941A" fill="url(#gProj)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
