import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, FileSpreadsheet, FileText, GitCompare, LayoutGrid, List, Share2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Select, Checkbox } from '../../components/ui/Form';
import { Badge, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { Pagination } from '../../components/ui/DataTable';
import { ShareModal } from '../../components/estimate/ShareModal';
import { MiniDonut } from './Dashboard';
import { useEstimates, useEstimateMutations } from '../../hooks/useEstimate';
import { useDebounce } from '../../hooks/useDebounce';
import { useMeta } from '../../hooks/useMeta';
import { estimatesApi } from '../../api/estimates';
import { formatDate, formatINR, formatNumber, titleCase } from '../../lib/format';

export default function Estimates() {
  const nav = useNavigate();
  const { data: meta } = useMeta();
  const [f, setF] = useState({ q: '', houseType: '', tier: '', sort: '-created_at', page: 1 });
  const [view, setView] = useState('grid');
  const [picked, setPicked] = useState([]);
  const [del, setDel] = useState(null);
  const [share, setShare] = useState(null);
  const q = useDebounce(f.q, 350);
  const { data, isLoading, error, refetch } = useEstimates({ page: f.page, pageSize: 12, sort: f.sort, ...(q ? { q } : {}), ...(f.houseType ? { houseType: f.houseType } : {}), ...(f.tier ? { tier: f.tier } : {}) });
  const { remove, duplicate } = useEstimateMutations();
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : (toast('You can compare up to 4 estimates'), p)));
  const exp = async (fn, id, label) => { const t = toast.loading(`Preparing ${label}...`); try { await fn(id); toast.success(`${label} ready`, { id: t }); } catch { toast.dismiss(t); } };
  const upd = (patch) => setF({ ...f, page: 1, ...patch });

  const actions = (r) => (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" icon={Copy} onClick={() => duplicate.mutate(r.id)} aria-label={`Duplicate ${r.title}`} />
      <Button size="sm" variant="ghost" icon={Share2} onClick={() => setShare(r)} aria-label={`Share ${r.title}`} />
      <Button size="sm" variant="ghost" icon={FileText} onClick={() => exp(estimatesApi.exportPdf, r.id, 'PDF')} aria-label={`Export ${r.title} as PDF`} />
      <Button size="sm" variant="ghost" icon={FileSpreadsheet} onClick={() => exp(estimatesApi.exportXlsx, r.id, 'Excel')} aria-label={`Export ${r.title} as Excel`} />
      <Button size="sm" variant="ghost" icon={Trash2} className="text-danger" onClick={() => setDel(r)} aria-label={`Delete ${r.title}`} />
    </div>
  );
  return (
    <div className="container-page space-y-4 py-8">
      <Seo title="My estimates" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-extrabold">My estimates</h1>
        <div className="flex gap-2">{picked.length >= 2 && <Button icon={GitCompare} onClick={() => nav(`/compare?ids=${picked.join(',')}`)}>Compare ({picked.length})</Button>}
          <Button variant="secondary" icon={view === 'grid' ? List : LayoutGrid} onClick={() => setView(view === 'grid' ? 'list' : 'grid')} aria-label="Toggle grid or list view" /></div></div>
      <GlassCard padding="p-4"><div className="grid gap-3 sm:grid-cols-4">
        <div><label htmlFor="q" className="mb-1 block text-sm font-medium text-ink-700">Search</label><input id="q" className="glass-input" placeholder="Title..." value={f.q} onChange={(e) => upd({ q: e.target.value })} /></div>
        <Select label="House type" value={f.houseType} onChange={(e) => upd({ houseType: e.target.value })} placeholder="All" options={(meta?.houseTypes || []).map((h) => ({ value: h.code, label: h.name }))} />
        <Select label="Tier" value={f.tier} onChange={(e) => upd({ tier: e.target.value })} placeholder="All" options={['BASIC', 'STANDARD', 'PREMIUM'].map((t) => ({ value: t, label: titleCase(t) }))} />
        <Select label="Sort by" value={f.sort} onChange={(e) => upd({ sort: e.target.value })} options={[{ value: '-created_at', label: 'Newest first' }, { value: 'created_at', label: 'Oldest first' }, { value: '-grand_total', label: 'Highest cost' }, { value: 'grand_total', label: 'Lowest cost' }]} />
      </div></GlassCard>
      {error ? <GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard> : isLoading ? <Skeleton className="h-64" /> : !data.rows.length ? (
        <GlassCard><EmptyState icon={FileText} title="No estimates found" action={<Link to="/estimate"><Button>Start an estimate</Button></Link>}>Try clearing the filters, or create a new estimate.</EmptyState></GlassCard>
      ) : (
        <>
          <ul className={view === 'grid' ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
            {data.rows.map((r) => (
              <li key={r.id}><GlassCard hoverLift className="space-y-3">
                <div className="flex items-start gap-3"><MiniDonut categories={r.categories} />
                  <div className="min-w-0 flex-1"><Link to={`/estimates/${r.id}`} className="block truncate font-bold text-brand-700 hover:underline">{r.title}</Link>
                    <p className="num text-xl">{formatINR(r.grandTotal)}</p><p className="text-xs text-ink-500">{formatNumber(r.totalAreaSqm, 1)} sqm &middot; {formatINR(r.costPerSqft)}/sqft &middot; {formatDate(r.createdAt)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">{r.inputs?.qualityTier && <Badge tone="brand">{titleCase(r.inputs.qualityTier)}</Badge>}{r.inputs?.floors && <Badge>{r.inputs.floors}</Badge>}{r.isShared && <Badge tone="success">Shared</Badge>}</div></div></div>
                <div className="flex items-center justify-between"><Checkbox label="Compare" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />{actions(r)}</div>
              </GlassCard></li>))}
          </ul>
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </>
      )}
      <ConfirmDialog open={Boolean(del)} onClose={() => setDel(null)} danger title="Delete this estimate?" confirmLabel="Delete" loading={remove.isPending}
        message={<>"{del?.title}" will be removed from your account and any share link will stop working.</>} onConfirm={async () => { await remove.mutateAsync(del.id); setDel(null); setPicked((p) => p.filter((x) => x !== del.id)); }} />
      {share && <ShareModal open onClose={() => setShare(null)} estimate={{ id: share.id }} />}
    </div>
  );
}
