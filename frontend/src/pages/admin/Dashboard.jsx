import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, FileText, Layers, Users } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge, Banner, ErrorState, KpiCard, Skeleton } from '../../components/ui/Feedback';
import { SegmentedControl } from '../../components/ui/Form';
import { Donut } from '../../components/charts/CostDonut';
import { TrendLine } from '../../components/charts/TrendLine';
import { GroupedBars } from '../../components/charts/TierBars';
import { adminApi } from '../../api/admin';
import { formatDateTime, formatINR, formatINRCompact, formatNumber, titleCase } from '../../lib/format';
import { PageHeader } from './adminKit';

export default function AdminDashboard() {
  const [range, setRange] = useState('30d');
  const nav = useNavigate();
  const { data: d, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'stats', range], queryFn: () => adminApi.get('/dashboard/stats', { range }), placeholderData: (p) => p });
  if (error) return <GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard>;
  if (isLoading || !d) return <div className="space-y-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-32" /><Skeleton className="h-72" /></div>;
  const e = d.estimates;
  const toDonut = (arr, fmt = (k) => k) => arr.map((x) => ({ name: fmt(x.key), value: x.count }));
  return (
    <div className="space-y-5"><Seo title="Admin dashboard" noindex />
      <PageHeader title="Dashboard" subtitle="Usage and data quality at a glance" actions={<SegmentedControl label="Range" value={range} onChange={setRange} options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />} />
      {d.alerts.length > 0 && <div className="space-y-2" aria-label="Data quality alerts">{d.alerts.map((a) => <Banner key={a.code} kind={a.severity === 'danger' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'}>{a.message}</Banner>)}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Users" value={formatNumber(d.users.total)} hint={`${d.users.new} new, ${d.users.active} active, ${d.users.blocked} blocked`} />
        <KpiCard icon={FileText} label="Estimates" value={formatNumber(e.total)} hint={`${e.inRange} in the last ${range.replace('d', ' days')}`} />
        <KpiCard icon={Bot} label="AI calls" value={formatNumber(d.ai.calls)} hint={`${d.ai.successRate}% ok, ${d.ai.fallbackRate}% fallback, ${d.ai.avgLatencyMs} ms avg`} />
        <KpiCard icon={Layers} label="Active rate set" value={d.rates?.name || 'None'} hint={d.rates ? `${d.rates.fiscalYear}, ${d.rates.verified ? 'verified' : 'unverified'}, ${d.rates.ageDays} days old, ${d.rates.staleItemCount} stale items` : 'Publish a rate set'} />
      </div>
      <TrendLine title="Estimates per day" data={e.byDay} name="Estimates" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Donut title="By house type" money={false} data={toDonut(e.byHouseType, titleCase)} onSliceClick={(name) => nav(`/admin/estimates?houseType=${e.byHouseType.find((x) => titleCase(x.key) === name)?.key || ''}`)} height={260} />
        <Donut title="By quality tier" money={false} data={toDonut(e.byTier, titleCase)} onSliceClick={(name) => nav(`/admin/estimates?tier=${name.toUpperCase()}`)} height={260} />
        <Donut title="By floors" money={false} data={toDonut(e.byFloors)} height={260} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GroupedBars title="Top locations" layout="vertical" data={e.topLocations.map((l) => ({ name: l.name, count: l.count }))} series={[{ key: 'count', name: 'Estimates' }]} height={280} />
        <GroupedBars title="Average cost per sqft by tier" data={e.avgByTier.map((t) => ({ name: titleCase(t.tier), sqft: t.avgCostPerSqft }))} series={[{ key: 'sqft', name: 'Cost per sqft' }]} format={formatINR} axisFormat={formatINRCompact} height={280} />
      </div>
      <GlassCard strong><h2 className="mb-3 text-lg font-bold">Recent activity</h2>
        {d.recentActivity.length ? <ul className="divide-y divide-ink-300/40 text-sm">{d.recentActivity.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><Badge tone="brand">{a.action}</Badge> <span className="text-ink-500">{a.entity}</span></span><span className="text-xs text-ink-500">{formatDateTime(a.createdAt)}</span></li>)}</ul> : <p className="text-sm text-ink-500">No activity yet.</p>}
        <Link to="/admin/audit" className="mt-2 inline-block text-sm font-semibold text-brand-700">Open audit log</Link></GlassCard>
    </div>
  );
}
