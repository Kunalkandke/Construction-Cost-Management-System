import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { NumberInput, Select } from '../../components/ui/Form';
import { Badge, Banner, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { Tabs } from '../../components/ui/Tabs';
import { GroupedBars } from '../../components/charts/TierBars';
import { adminApi } from '../../api/admin';
import { formatDate, formatINR, formatINRCompact, titleCase } from '../../lib/format';
import { PageHeader, useAct, useAdminList, useListState } from './adminKit';

function ActualsTable() {
  const ls = useListState({ verified: '' });
  const { data, isLoading, error, refetch } = useAdminList('/actuals', { ...ls.params, ...(ls.s.verified ? { verified: ls.s.verified } : {}) });
  const { act } = useAct();
  const cols = [
    { key: 'estimateTitle', header: 'Estimate' }, { key: 'tier', header: 'Tier', render: (r) => (r.tier ? titleCase(r.tier) : '-') }, { key: 'category', header: 'Category' },
    { key: 'plannedAmount', header: 'Planned', align: 'right', render: (r) => (r.plannedAmount ? formatINR(r.plannedAmount) : '-') }, { key: 'actualAmount', header: 'Actual', align: 'right', render: (r) => formatINR(r.actualAmount) },
    { key: 'ratio', header: 'Ratio', align: 'right', render: (r) => r.ratio ?? '-' }, { key: 'completedOn', header: 'Completed', render: (r) => formatDate(r.completedOn) },
    { key: 'verified', header: 'Status', render: (r) => (r.verified ? <Badge tone="success" icon={CheckCircle2}>Verified</Badge> : <Badge tone="warning">Pending</Badge>) },
  ];
  return (
    <GlassCard strong padding="p-4">
      <div className="mb-3 max-w-xs"><Select label="Status" value={ls.s.verified} onChange={(e) => ls.set({ verified: e.target.value })} placeholder="All" options={[{ value: 'false', label: 'Pending' }, { value: 'true', label: 'Verified' }]} /></div>
      <DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage}
        actions={(r) => <Button size="sm" variant={r.verified ? 'ghost' : 'secondary'} onClick={() => act(() => adminApi.patch(`/actuals/${r.id}`, { verified: !r.verified }), r.verified ? 'Verification removed' : 'Verified')}>{r.verified ? 'Unverify' : 'Verify'}</Button>} />
    </GlassCard>
  );
}

function Calibration() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/actuals/calibration'], queryFn: () => adminApi.get('/actuals/calibration') });
  const { act, busy } = useAct();
  const [apply, setApply] = useState(null);
  const [normKey, setNormKey] = useState('');
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <Skeleton className="h-64" />;
  const cols = [{ key: 'tier', header: 'Tier', render: (r) => titleCase(r.tier) }, { key: 'category', header: 'Category' }, { key: 'projects', header: 'Projects', align: 'right' }, { key: 'plannedTotal', header: 'Planned', align: 'right', render: (r) => formatINR(r.plannedTotal) }, { key: 'actualTotal', header: 'Actual', align: 'right', render: (r) => formatINR(r.actualTotal) }, { key: 'meanRatio', header: 'Mean ratio', align: 'right' }];
  const chart = data.rows.map((r) => ({ name: `${titleCase(r.tier).slice(0, 3)} ${r.category}`, planned: r.plannedTotal, actual: r.actualTotal }));
  return (
    <div className="space-y-4">
      <Banner kind="info">{data.note}</Banner>
      {data.rows.length > 0 && <GroupedBars title="Planned vs actual by category" data={chart} series={[{ key: 'planned', name: 'Planned' }, { key: 'actual', name: 'Actual' }]} format={formatINR} axisFormat={formatINRCompact} height={300} />}
      <GlassCard strong padding="p-4"><DataTable columns={cols} rows={data.rows.map((r, i) => ({ ...r, id: i }))} actions={(r) => <Button size="sm" variant="secondary" onClick={() => { setNormKey(''); setApply(r); }}>Apply to a norm</Button>} empty={<p className="p-6 text-center text-sm text-ink-500">No verified actuals yet.</p>} /></GlassCard>
      <ConfirmDialog open={Boolean(apply)} onClose={() => setApply(null)} title="Apply suggested norm change" confirmLabel="Apply" loading={busy}
        message={<div className="space-y-3"><p>Multiply a consumption norm by <b>{apply?.suggestedFactor}</b> ({titleCase(apply?.tier)} tier, {apply?.category}). Choose the norm that drives this category.</p>
          <label className="block text-sm font-medium">Norm key<input className="glass-input mt-1" placeholder="e.g. N_RCC_SUPER" value={normKey} onChange={(e) => setNormKey(e.target.value.toUpperCase())} /></label>
          <p className="text-xs text-ink-500">This changes future calculations only and is recorded in the audit log.</p></div>}
        onConfirm={async () => { const r = await act(() => adminApi.post('/actuals/calibration/apply', { normKey, tier: apply.tier, factor: apply.suggestedFactor, confirm: true }), 'Norm updated'); if (r.ok) setApply(null); }} />
    </div>
  );
}

export default function Actuals() {
  const [tab, setTab] = useState('list');
  return (
    <div><Seo title="Actuals" noindex /><PageHeader title="Actuals and calibration" subtitle="Verify real project costs and compare them with estimates" />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ id: 'list', label: 'Submitted actuals' }, { id: 'calib', label: 'Calibration report' }]} />
      {tab === 'list' ? <ActualsTable /> : <Calibration />}
    </div>
  );
}
