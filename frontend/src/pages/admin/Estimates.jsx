import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Badge, ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { EstimateView } from '../../components/estimate/EstimateView';
import { useMeta } from '../../hooks/useMeta';
import { adminApi } from '../../api/admin';
import { formatDate, formatINR, formatNumber, titleCase } from '../../lib/format';
import { PageHeader, useAct, useAdminList, useListState } from './adminKit';

export function AdminEstimates() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { data: meta } = useMeta();
  const ls = useListState({ q: sp.get('q') || '', houseType: sp.get('houseType') || '', tier: sp.get('tier') || '', from: '', to: '', minAmount: '', maxAmount: '', sort: '-created_at' });
  const f = ls.s;
  const params = { ...ls.params, ...(f.houseType ? { houseType: f.houseType } : {}), ...(f.tier ? { tier: f.tier } : {}), ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}), ...(f.minAmount ? { minAmount: f.minAmount } : {}), ...(f.maxAmount ? { maxAmount: f.maxAmount } : {}) };
  const { data, isLoading, error, refetch } = useAdminList('/estimates', params);
  const [del, setDel] = useState(null);
  const { act, busy } = useAct();
  const cols = [
    { key: 'title', header: 'Title', sortable: true }, { key: 'user', header: 'User', render: (r) => (r.user ? r.user.email : <span className="text-ink-500">anonymised</span>) },
    { key: 'houseType', header: 'House', render: (r) => titleCase(r.inputs?.houseType) + (r.inputs?.houseType === 'FLAT' ? '' : ` ${r.inputs?.floors}`) },
    { key: 'tier', header: 'Tier', render: (r) => <Badge tone="brand">{titleCase(r.inputs?.qualityTier)}</Badge> }, { key: 'totalAreaSqm', header: 'Area', align: 'right', render: (r) => `${formatNumber(r.totalAreaSqm, 1)} sqm` },
    { key: 'grand_total', header: 'Grand total', align: 'right', sortable: true, render: (r) => formatINR(r.grandTotal) }, { key: 'created_at', header: 'Created', sortable: true, render: (r) => formatDate(r.createdAt) },
  ];
  return (
    <div><Seo title="Estimates" noindex />
      <PageHeader title="Estimates" subtitle="Everything users have calculated" actions={<Button variant="secondary" icon={Download} onClick={() => adminApi.download('/estimates/export.csv', 'ccms-estimates.csv', params)}>Export CSV</Button>} />
      <GlassCard strong padding="p-4">
        <div className="mb-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Input label="Search title" value={f.q} onChange={(e) => ls.set({ q: e.target.value })} />
          <Select label="House type" value={f.houseType} onChange={(e) => ls.set({ houseType: e.target.value })} placeholder="All" options={(meta?.houseTypes || []).map((h) => ({ value: h.code, label: h.name }))} />
          <Select label="Tier" value={f.tier} onChange={(e) => ls.set({ tier: e.target.value })} placeholder="All" options={['BASIC', 'STANDARD', 'PREMIUM'].map((t) => ({ value: t, label: titleCase(t) }))} />
          <Input label="From" type="date" value={f.from} onChange={(e) => ls.set({ from: e.target.value })} /><Input label="To" type="date" value={f.to} onChange={(e) => ls.set({ to: e.target.value })} />
          <div className="grid grid-cols-2 gap-2"><Input label="Min Rs." inputMode="numeric" value={f.minAmount} onChange={(e) => ls.set({ minAmount: e.target.value.replace(/\D/g, '') })} /><Input label="Max Rs." inputMode="numeric" value={f.maxAmount} onChange={(e) => ls.set({ maxAmount: e.target.value.replace(/\D/g, '') })} /></div>
        </div>
        <DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage} sort={f.sort} onSort={(sort) => ls.set({ sort })}
          onRowClick={(r) => nav(`/admin/estimates/${r.id}`)} actions={(r) => <Button size="sm" variant="ghost" className="text-danger" icon={Trash2} aria-label={`Delete ${r.title}`} onClick={() => setDel(r)} />} />
      </GlassCard>
      <ConfirmDialog open={Boolean(del)} onClose={() => setDel(null)} danger title="Delete this estimate?" loading={busy} confirmLabel="Delete" message={`"${del?.title}" will be soft-deleted and its share link revoked.`}
        onConfirm={async () => { const r = await act(() => adminApi.del(`/estimates/${del.id}`), 'Estimate deleted'); if (r.ok) setDel(null); }} />
    </div>
  );
}

export function AdminEstimateDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/estimates', id], queryFn: () => adminApi.get(`/estimates/${id}`) });
  const sets = useAdminList('/rate-sets', { pageSize: 50 });
  const [setId, setSetId] = useState('');
  const [prev, setPrev] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const { act } = useAct();
  if (isLoading) return <PageSkeleton />;
  if (error) return <GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard>;
  const preview = async () => { setBusy(true); try { setPrev(await adminApi.get(`/estimates/${id}/recalculate`, { rateSetId: setId })); } finally { setBusy(false); } };
  return (
    <div className="space-y-4"><Seo title="Estimate detail" noindex />
      <Link to="/admin/estimates" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" aria-hidden />All estimates</Link>
      <GlassCard strong><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{data.title}</h1>
        <p className="text-sm text-ink-500">By {data.user ? `${data.user.name} (${data.user.email})` : 'anonymised user'} &middot; engine v{data.engineVersion} &middot; {data.mode}</p></div>
        <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Delete</Button></div></GlassCard>
      <GlassCard strong><h2 className="mb-2 text-lg font-bold">Recalculate in preview</h2><p className="mb-3 text-sm text-ink-500">Run this estimate's inputs against any rate set (including drafts). Nothing is saved.</p>
        <div className="flex flex-wrap items-end gap-3"><Select label="Rate set" value={setId} onChange={(e) => setSetId(e.target.value)} placeholder="Active rate set" options={(sets.data?.rows || []).map((s) => ({ value: s.id, label: `${s.name} (${s.status})` }))} /><Button loading={busy} onClick={preview}>Recalculate</Button></div>
        {prev && <p className="mt-3 text-sm">Saved: <b className="num">{formatINR(prev.previous.grandTotal)}</b> &rarr; Preview: <b className="num">{formatINR(prev.preview.grandTotal)}</b> <Badge tone={prev.difference > 0 ? 'danger' : 'success'}>{prev.difference >= 0 ? '+' : '-'}{formatINR(Math.abs(prev.difference))}</Badge> using {prev.preview.ratesUsed.rateSetName}</p>}</GlassCard>
      <EstimateView result={data.results} estimate={data} variant="shared" title={data.title} />
      <GlassCard strong><h2 className="mb-2 text-lg font-bold">Raw inputs</h2><pre className="max-h-72 overflow-auto rounded-xl bg-ink-900 p-4 text-xs text-green-200">{JSON.stringify(data.inputs, null, 2)}</pre></GlassCard>
      <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Delete this estimate?" confirmLabel="Delete" message="It will be soft-deleted and its share link revoked."
        onConfirm={async () => { const r = await act(() => adminApi.del(`/estimates/${id}`), 'Estimate deleted'); if (r.ok) nav('/admin/estimates'); }} />
    </div>
  );
}
