import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';

export function TrendLine({ title, data, xKey = 'date', yKey = 'count', name = 'Count' }) {
  return (
    <ChartCard title={title} label={title} table={{ columns: [xKey, name], rows: data.map((d) => [d[xKey], d[yKey]]) }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} name={name} stroke="#1F78B4" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
