import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS } from '../../lib/constants';

// Generic grouped bar chart. data: [{ name, [seriesKey]: number }]
export function GroupedBars({ title, label, data, series, format = (v) => v, axisFormat = (v) => v, layout = 'horizontal', height = 280 }) {
  const horizontal = layout === 'horizontal';
  return (
    <ChartCard title={title} label={label || title} height={height} table={{ columns: ['Name', ...series.map((s) => s.name)], rows: data.map((d) => [d.name, ...series.map((s) => format(d[s.key]))]) }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={horizontal ? 'horizontal' : 'vertical'} margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
          {horizontal ? <><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={axisFormat} tick={{ fontSize: 11 }} width={56} /></> : <><XAxis type="number" tickFormatter={axisFormat} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} /></>}
          <Tooltip formatter={(v) => format(v)} />
          {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || CHART_COLORS[i % CHART_COLORS.length]} radius={[6, 6, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
