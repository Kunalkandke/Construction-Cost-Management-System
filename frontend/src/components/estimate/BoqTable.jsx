import { Fragment, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { SOURCE_LABEL } from '../../lib/constants';
import { formatINR, formatNumber } from '../../lib/format';
import { downloadText } from '../../lib/download';

export const SourceChip = ({ source }) => <Badge tone={source === 'CPWD_DSR_CORRECTED' ? 'warning' : source === 'CUSTOM' ? 'neutral' : 'brand'}>{SOURCE_LABEL[source] || source}</Badge>;

export function BoqTable({ result }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return result.categories.map((c) => ({
      ...c, items: result.lineItems.filter((l) => l.category === c.key && (!needle || l.description.toLowerCase().includes(needle) || l.itemCode.toLowerCase().includes(needle))),
    })).filter((g) => g.items.length);
  }, [result, q]);

  const exportCsv = () => {
    const head = ['Category', 'Code', 'Item', 'Unit', 'Quantity', 'Rate', 'Amount', 'Source'];
    const rows = result.lineItems.map((l) => [l.category, l.itemCode, `"${l.description.replace(/"/g, '""')}"`, l.unit, l.quantity, l.rate, l.amount, l.source]);
    downloadText([head, ...rows].map((r) => r.join(',')).join('\n'), 'ccms-boq.csv');
  };
  return (
    <GlassCard strong padding="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
          <input className="glass-input pl-9" placeholder="Search items" aria-label="Search BOQ items" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Download CSV</Button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 z-10 bg-brand-50/95 text-left text-xs uppercase text-ink-500">
            <tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Quantity</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Source</th></tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.key}>
                <tr className="bg-brand-50/60"><th colSpan={5} scope="colgroup" className="px-3 py-2 text-left font-bold">{g.label}</th><td className="num px-3 py-2 text-right">{formatINR(g.amount)}</td><td /></tr>
                {g.items.map((l, i) => (
                  <tr key={`${l.itemCode}-${i}`} className="border-t border-ink-300/30 bg-white/50">
                    <td className="px-3 py-2 font-mono text-xs">{l.itemCode}</td><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2">{l.unit}</td>
                    <td className="tabular px-3 py-2 text-right">{formatNumber(l.quantity, 3)}</td><td className="tabular px-3 py-2 text-right">{formatINR(l.rate)}</td>
                    <td className="tabular px-3 py-2 text-right font-semibold">{formatINR(l.amount)}</td><td className="px-3 py-2"><SourceChip source={l.source} /></td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {!groups.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-500">No items match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
