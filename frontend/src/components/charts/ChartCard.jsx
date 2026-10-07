import { useState } from 'react';
import { Table2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

// Every chart gets an accessible name and a "View data" table alternative.
export function ChartCard({ title, label, table, children, height = 280, className = '' }) {
  const [showData, setShowData] = useState(false);
  return (
    <GlassCard className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        {table && (
          <button type="button" onClick={() => setShowData((s) => !s)} aria-pressed={showData} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
            <Table2 className="h-3.5 w-3.5" aria-hidden />{showData ? 'View chart' : 'View data'}
          </button>
        )}
      </div>
      {showData && table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr>{table.columns.map((c) => <th key={c} scope="col" className="px-2 py-1 text-left text-xs uppercase text-ink-500">{c}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-ink-300/40">{r.map((v, j) => <td key={j} className={`px-2 py-1 ${j ? 'tabular' : ''}`}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={label || title} style={{ minHeight: Math.max(240, height) }}>{children}</div>
      )}
    </GlassCard>
  );
}
