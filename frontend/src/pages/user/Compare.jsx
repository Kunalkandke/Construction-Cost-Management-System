import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { GroupedBars } from '../../components/charts/TierBars';
import { estimatesApi } from '../../api/estimates';
import { formatINR, formatINRCompact, formatNumber, titleCase } from '../../lib/format';
import { GitCompare } from 'lucide-react';

export default function Compare() {
  const [params] = useSearchParams();
  const ids = (params.get('ids') || '').split(',').filter(Boolean);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['compare', ids.join(',')], queryFn: () => estimatesApi.compare(ids), enabled: ids.length >= 2 && ids.length <= 4, retry: false });
  if (ids.length < 2 || ids.length > 4) return <div className="container-page py-10"><GlassCard><EmptyState icon={GitCompare} title="Pick 2 to 4 estimates" action={<Link to="/estimates"><Button>Go to my estimates</Button></Link>}>Tick "Compare" on the estimates you want to see side by side.</EmptyState></GlassCard></div>;
  if (isLoading) return <div className="container-page space-y-3 py-10"><Skeleton className="h-10" /><Skeleton className="h-72" /></div>;
  if (error) return <div className="container-page py-10"><GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard></div>;
  const { estimates, categories } = data;
  const hi = (c, i) => (c.lowestIndex !== c.highestIndex ? (i === c.lowestIndex ? 'bg-success-50 font-semibold text-success' : i === c.highestIndex ? 'bg-danger-50 font-semibold text-danger' : '') : '');
  const chart = categories.map((c) => ({ name: c.label, ...Object.fromEntries(estimates.map((e, i) => [`e${i}`, c.values[i]])) }));
  const cheapest = estimates.reduce((a, b) => (b.grandTotal < a.grandTotal ? b : a));
  return (
    <div className="container-page space-y-5 py-8"><Seo title="Compare estimates" noindex />
      <div><h1 className="text-3xl font-extrabold">Compare estimates</h1><p className="text-ink-500">Green marks the lowest amount, red the highest. Differences are against the first estimate.</p></div>
      <GlassCard strong padding="p-0"><div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-50/80 text-left"><tr><th className="px-3 py-3 text-xs uppercase text-ink-500">&nbsp;</th>{estimates.map((e) => <th key={e.id} className="px-3 py-3"><Link to={`/estimates/${e.id}`} className="font-bold text-brand-700 hover:underline">{e.title}</Link>{e.id === cheapest.id && <Badge tone="success" className="ml-1">Lowest</Badge>}</th>)}</tr></thead>
          <tbody>
            {[['House', (e) => `${titleCase(e.inputs.houseType)} ${e.inputs.houseType === 'FLAT' ? '' : e.inputs.floors}`], ['BHK', (e) => `${e.inputs.bhk} BHK`], ['Quality', (e) => titleCase(e.inputs.qualityTier)], ['Structure', (e) => titleCase(e.inputs.structureType)], ['Total area', (e) => `${formatNumber(e.totalAreaSqm, 1)} sqm`]].map(([label, fn]) => (
              <tr key={label} className="border-t border-ink-300/30"><th scope="row" className="px-3 py-2 text-left font-medium text-ink-500">{label}</th>{estimates.map((e) => <td key={e.id} className="px-3 py-2">{fn(e)}</td>)}</tr>))}
            {categories.map((c) => (
              <tr key={c.key} className="border-t border-ink-300/30"><th scope="row" className="px-3 py-2 text-left font-medium">{c.label}</th>{c.values.map((v, i) => <td key={i} className={`tabular px-3 py-2 ${hi(c, i)}`}>{formatINR(v)}</td>)}</tr>))}
            <tr className="border-t-2 border-ink-300/60 bg-accent-50/60 font-bold"><th scope="row" className="px-3 py-2 text-left">Grand total</th>{estimates.map((e) => <td key={e.id} className="tabular px-3 py-2">{formatINR(e.grandTotal)}</td>)}</tr>
            <tr className="border-t border-ink-300/30"><th scope="row" className="px-3 py-2 text-left font-medium text-ink-500">Cost per sqft</th>{estimates.map((e) => <td key={e.id} className="tabular px-3 py-2">{formatINR(e.costPerSqft)}</td>)}</tr>
            <tr className="border-t border-ink-300/30"><th scope="row" className="px-3 py-2 text-left font-medium text-ink-500">Difference</th>{estimates.map((e, i) => <td key={e.id} className="tabular px-3 py-2">{i === 0 ? '-' : `${e.differenceAmount >= 0 ? '+' : '-'}${formatINR(Math.abs(e.differenceAmount))} (${e.differencePct}%)`}</td>)}</tr>
          </tbody>
        </table></div></GlassCard>
      <GroupedBars title="Category comparison" data={chart} series={estimates.map((e, i) => ({ key: `e${i}`, name: e.title }))} format={formatINR} axisFormat={formatINRCompact} height={320} />
    </div>
  );
}
