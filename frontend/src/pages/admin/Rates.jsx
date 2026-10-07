import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Archive, CheckCircle2, Copy, Download, FileUp, Plus, Rocket } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input, Select, Toggle, Checkbox } from '../../components/ui/Form';
import { Badge, Banner, ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay';
import { Tabs } from '../../components/ui/Tabs';
import { adminApi } from '../../api/admin';
import { useMeta } from '../../hooks/useMeta';
import { SOURCE_LABEL } from '../../lib/constants';
import { formatDate, formatINR } from '../../lib/format';
import { PageHeader, ResourceEditor, useAct, useAdminList, useListState } from './adminKit';

const statusTone = { draft: 'warning', published: 'success', archived: 'neutral' };
const SOURCES = Object.keys(SOURCE_LABEL).filter((s) => s !== 'CPWD_DSR_CORRECTED');
const GROUPS = ['structure', 'finishing', 'electrical', 'plumbing', 'openings'];

export function RateSets() {
  const ls = useListState({ status: '' });
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useAdminList('/rate-sets', { ...ls.params, ...(ls.s.status ? { status: ls.s.status } : {}) });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', fiscalYear: '2026-27', sourceLabel: '', effectiveFrom: '', fromActive: true });
  const { act, busy } = useAct();
  const create = async () => {
    const r = await act(() => adminApi.post('/rate-sets', { name: f.name, fiscalYear: f.fiscalYear, ...(f.sourceLabel ? { sourceLabel: f.sourceLabel } : {}), ...(f.effectiveFrom ? { effectiveFrom: f.effectiveFrom } : {}), ...(f.fromActive ? { cloneFromActive: true } : {}) }), 'Draft rate set created');
    if (r.ok) { setOpen(false); nav(`/admin/rates/${r.data.id}`); }
  };
  const cols = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <Link className="font-semibold text-brand-700 hover:underline" to={`/admin/rates/${r.id}`}>{r.name}</Link> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status]}>{r.status}</Badge> }, { key: 'fiscalYear', header: 'Fiscal year' },
    { key: 'isVerified', header: 'Verified', render: (r) => (r.isVerified ? <Badge tone="success" icon={CheckCircle2}>Verified</Badge> : <Badge tone="warning">Illustrative</Badge>) },
    { key: 'itemCount', header: 'Items', align: 'right' }, { key: 'effectiveFrom', header: 'Effective', render: (r) => formatDate(r.effectiveFrom) },
  ];
  return (
    <div><Seo title="Rate sets" noindex />
      <PageHeader title="Rates" subtitle="One published set is active. Edit drafts, then validate and publish." actions={<Button icon={Plus} onClick={() => setOpen(true)}>New rate set</Button>} />
      <GlassCard strong padding="p-4">
        <div className="mb-3 max-w-xs"><Select label="Status" value={ls.s.status} onChange={(e) => ls.set({ status: e.target.value })} placeholder="All" options={['draft', 'published', 'archived'].map((s) => ({ value: s, label: s }))} /></div>
        <DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage} />
      </GlassCard>
      <Modal open={open} onClose={() => setOpen(false)} title="New draft rate set" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!f.name} onClick={create}>Create draft</Button></>}>
        <div className="space-y-3"><Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /><Input label="Fiscal year" value={f.fiscalYear} onChange={(e) => setF({ ...f, fiscalYear: e.target.value })} hint="Format 2026-27" />
          <Input label="Source label" value={f.sourceLabel} onChange={(e) => setF({ ...f, sourceLabel: e.target.value })} /><Input label="Effective from" type="date" value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} />
          <Toggle checked={f.fromActive} onChange={(v) => setF({ ...f, fromActive: v })} label="Start as a copy of the active set" description="Otherwise the draft starts empty (import a CSV next)" /></div>
      </Modal>
    </div>
  );
}

const ITEM_FIELDS = [
  { name: 'itemCode', label: 'Item code', type: 'text', createOnly: true }, { name: 'category', label: 'Category', type: 'text' }, { name: 'description', label: 'Description', type: 'text' }, { name: 'unit', label: 'Unit', type: 'text' },
  { name: 'baseRate', label: 'State SSR rate (Rs.)', type: 'number', optional: true, hint: 'Leave empty to use the DSR fallback' }, { name: 'dsrRate', label: 'CPWD DSR rate (Rs.)', type: 'number', optional: true },
  { name: 'source', label: 'Source', type: 'select', options: SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] })), default: 'CUSTOM' }, { name: 'sourceRef', label: 'Source reference', type: 'text', optional: true },
  { name: 'labourPct', label: 'Labour %', type: 'number' }, { name: 'group', label: 'Group', type: 'select', options: GROUPS.map((g) => ({ value: g, label: g })), default: 'structure' },
  { name: 'leadLiftApplied', label: 'Lead/lift already applied', type: 'bool' }, { name: 'isActive', label: 'Active', type: 'bool', default: true },
];

export function RateDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('items');
  const { data: s, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/rate-sets', id], queryFn: () => adminApi.get(`/rate-sets/${id}`) });
  const { act, busy } = useAct();
  const [pub, setPub] = useState(false);
  const [ack, setAck] = useState(false);
  const [arch, setArch] = useState(false);
  if (isLoading) return <PageSkeleton />;
  if (error) return <GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard>;
  const draft = s.status === 'draft';
  const cols = [
    { key: 'itemCode', header: 'Code', sortable: true }, { key: 'description', header: 'Description' }, { key: 'unit', header: 'Unit' },
    { key: 'baseRate', header: 'Base rate', align: 'right', render: (r) => (r.baseRate === null ? '-' : formatINR(r.baseRate)) }, { key: 'dsrRate', header: 'DSR rate', align: 'right', render: (r) => (r.dsrRate === null ? '-' : formatINR(r.dsrRate)) },
    { key: 'source', header: 'Source', render: (r) => <Badge tone="brand">{SOURCE_LABEL[r.source]}</Badge> }, { key: 'labourPct', header: 'Labour %', align: 'right' }, { key: 'group', header: 'Group' },
  ];
  const tryPublish = async () => { const r = await act(() => adminApi.post(`/rate-sets/${id}/publish`, { confirm: true, acknowledgeChanges: ack }), 'Rate set published'); if (r.ok) setPub(false); };
  return (
    <div className="space-y-4"><Seo title={s.name} noindex />
      <Link to="/admin/rates" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" aria-hidden />All rate sets</Link>
      <GlassCard strong><div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{s.name}</h1><div className="mt-1 flex flex-wrap gap-2"><Badge tone={statusTone[s.status]}>{s.status}</Badge><Badge>{s.fiscalYear}</Badge>{s.isVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Illustrative</Badge>}<Badge tone="brand">{s.itemCount} items</Badge></div>
          <p className="mt-1 text-sm text-ink-500">{s.sourceLabel}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Copy} loading={busy} onClick={async () => { await act(() => adminApi.post(`/rate-sets/${id}/clone`), 'Cloned as a new draft'); }}>Clone</Button>
          <Button variant="secondary" icon={Download} onClick={() => adminApi.download(`/rate-sets/${id}/items/export.csv`, `rates-${s.name}.csv`)}>Export CSV</Button>
          {draft && <><Button icon={Rocket} onClick={() => { setAck(false); setPub(true); }}>Publish</Button><Button variant="ghost" icon={Archive} onClick={() => setArch(true)}>Archive</Button></>}
          {s.status === 'archived' && <Button icon={Rocket} onClick={() => { setAck(false); setPub(true); }}>Re-publish (rollback)</Button>}
        </div></div>
        {draft && <div className="mt-3 max-w-md"><Toggle checked={s.isVerified} onChange={(v) => act(() => adminApi.patch(`/rate-sets/${id}`, { isVerified: v }), 'Updated')} label="Mark as verified against the official SSR" description="Removes the illustrative banner when published" /></div>}
      </GlassCard>
      {draft && s.missingItems?.length > 0 && <Banner kind="warning" title={`${s.missingItems.length} problem(s) block publishing`}><ul className="mt-1 max-h-40 list-disc overflow-auto pl-5">{s.missingItems.slice(0, 40).map((m) => <li key={m.path}><b>{m.path}</b>: {m.message}</li>)}</ul></Banner>}
      {draft && s.missingItems?.length === 0 && <Banner kind="success">All required items are present. Ready to publish.</Banner>}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'items', label: 'Items' }, { id: 'import', label: 'Import CSV' }, { id: 'diff', label: 'Diff' }, { id: 'preview', label: 'Preview calculator' }]} />
      {tab === 'items' && <ResourceEditorItems id={id} draft={draft} cols={cols} />}
      {tab === 'import' && <ImportPanel id={id} draft={draft} />}
      {tab === 'diff' && <DiffPanel id={id} />}
      {tab === 'preview' && <PreviewPanel id={id} />}
      <Modal open={pub} onClose={() => setPub(false)} title="Publish this rate set" footer={<><Button variant="ghost" onClick={() => setPub(false)}>Cancel</Button><Button icon={Rocket} loading={busy} disabled={s.missingItems?.length > 0 || (s.largeChanges?.length > 0 && !ack)} onClick={tryPublish}>Publish now</Button></>}>
        <div className="space-y-3 text-sm">
          <p>Publishing archives the current active set. Saved estimates are never recalculated.</p>
          {s.missingItems?.length > 0 ? <Banner kind="danger" title="Validation failed">{s.missingItems.length} required item(s) are missing or invalid. Fix them first.</Banner> : <Banner kind="success">Completeness, units and rate checks passed.</Banner>}
          {s.largeChanges?.length > 0 && <><Banner kind="warning" title={`${s.largeChanges.length} rate(s) changed by more than 40%`}><ul className="mt-1 max-h-32 overflow-auto pl-5">{s.largeChanges.map((c) => <li key={c.itemCode}>{c.itemCode}: {formatINR(c.oldRate)} to {formatINR(c.newRate)} ({c.changePct}%)</li>)}</ul></Banner>
            <Checkbox label="I have checked these large changes" checked={ack} onChange={(e) => setAck(e.target.checked)} /></>}
        </div>
      </Modal>
      <ConfirmDialog open={arch} onClose={() => setArch(false)} danger title="Archive this draft?" confirmLabel="Archive" loading={busy} message="Archived sets can be re-published later (same validation)." onConfirm={async () => { const r = await act(() => adminApi.post(`/rate-sets/${id}/archive`, { confirm: true }), 'Archived'); if (r.ok) setArch(false); }} />
    </div>
  );
}

function ResourceEditorItems({ id, draft, cols, }) {
  // Items are read-only unless the set is a draft
  if (!draft) return <ReadOnlyItems id={id} cols={cols} />;
  return <ResourceEditor path={`/rate-sets/${id}/items`} itemPath="/rate-items" columns={cols} fields={ITEM_FIELDS} canCreate canDelete noun="rate item" pageSize={50} />;
}
function ReadOnlyItems({ id, cols }) {
  const ls = useListState();
  const { data, isLoading, error, refetch } = useAdminList(`/rate-sets/${id}/items`, { ...ls.params, pageSize: 50 });
  return <GlassCard strong padding="p-4"><input className="glass-input mb-3 max-w-xs" aria-label="Search items" placeholder="Search code or description" value={ls.s.q} onChange={(e) => ls.set({ q: e.target.value })} /><DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage} /></GlassCard>;
}

function ImportPanel({ id, draft }) {
  const ref = useRef(null);
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const { act } = useAct();
  if (!draft) return <GlassCard><p className="text-sm text-ink-500">Only draft rate sets accept imports. Clone this set to make changes.</p></GlassCard>;
  const dry = async () => { setBusy(true); try { setRes(await adminApi.upload(`/rate-sets/${id}/items/import`, file, { dryRun: true })); } catch (e) { setRes({ failed: e.message }); } finally { setBusy(false); } };
  const commit = async () => { const r = await act(() => adminApi.upload(`/rate-sets/${id}/items/import`, file, { dryRun: false }), 'Rates imported'); if (r.ok) { setRes(null); setFile(null); } };
  return (
    <GlassCard strong className="space-y-3">
      <p className="text-sm text-ink-700">Columns: <code>item_code, category, description, unit, base_rate, dsr_rate, source, source_ref, labour_pct, group</code> (max 5,000 rows). A dry run checks every row and shows the difference against the active set before anything is saved.</p>
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { setFile(e.target.files[0] || null); setRes(null); }} aria-label="CSV file" />
      <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" icon={FileUp} onClick={() => ref.current.click()}>Choose CSV</Button>{file && <span className="text-sm">{file.name}</span>}<Button disabled={!file} loading={busy} onClick={dry}>Dry run</Button></div>
      {res?.failed && <Banner kind="danger">{res.failed}</Banner>}
      {res?.summary && (
        <div className="space-y-3">
          <Banner kind={res.summary.errorCount ? 'danger' : 'success'} title={`${res.summary.validRows} of ${res.summary.totalRows} rows valid, ${res.summary.errorCount} error(s)`}>
            {res.errors.length > 0 && <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5">{res.errors.slice(0, 100).map((e, i) => <li key={i}>Row {e.row} ({e.itemCode || '?'}) {e.field}: {e.message}</li>)}</ul>}</Banner>
          {res.diff && <div className="grid gap-2 text-sm sm:grid-cols-3"><Badge tone="success">{res.diff.added.length} added</Badge><Badge tone="warning">{res.diff.changed.length} changed</Badge><Badge tone="danger">{res.diff.missing.length} missing vs active</Badge></div>}
          {res.diff?.changed?.length > 0 && <ul className="max-h-40 overflow-auto text-xs">{res.diff.changed.slice(0, 60).map((c) => <li key={c.itemCode} className={Math.abs(c.changePct) > 40 ? 'font-semibold text-danger' : ''}>{c.itemCode}: {formatINR(c.oldRate)} to {formatINR(c.newRate)} ({c.changePct}%)</li>)}</ul>}
          <Button disabled={res.summary.errorCount > 0} loading={busy} onClick={commit}>Confirm import</Button>
        </div>)}
    </GlassCard>
  );
}

function DiffPanel({ id }) {
  const sets = useAdminList('/rate-sets', { pageSize: 50 });
  const [other, setOther] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'diff', id, other], queryFn: () => adminApi.get(`/rate-sets/${id}/diff/${other}`), enabled: Boolean(other) });
  return (
    <GlassCard strong className="space-y-3">
      <Select label="Compare with" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Select a rate set" options={(sets.data?.rows || []).filter((s) => s.id !== id).map((s) => ({ value: s.id, label: `${s.name} (${s.status})` }))} />
      {isLoading && <p className="text-sm text-ink-500">Comparing...</p>}
      {data && <div className="grid gap-4 lg:grid-cols-3 text-sm">
        <div><h3 className="mb-1 font-bold text-success">Added ({data.added.length})</h3><ul className="max-h-60 overflow-auto">{data.added.map((a) => <li key={a.itemCode}>{a.itemCode} {formatINR(a.rate)}</li>)}</ul></div>
        <div><h3 className="mb-1 font-bold text-warning">Changed ({data.changed.length})</h3><ul className="max-h-60 overflow-auto">{data.changed.map((c) => <li key={c.itemCode} className={c.changePct > 0 ? 'text-danger' : 'text-success'}>{c.itemCode}: {formatINR(c.oldRate)} to {formatINR(c.newRate)} ({c.changePct}%)</li>)}</ul></div>
        <div><h3 className="mb-1 font-bold text-danger">Missing ({data.missing.length})</h3><ul className="max-h-60 overflow-auto">{data.missing.map((a) => <li key={a.itemCode}>{a.itemCode} {formatINR(a.rate)}</li>)}</ul></div></div>}
    </GlassCard>
  );
}

function PreviewPanel({ id }) {
  const { data: meta } = useMeta();
  const [f, setF] = useState({ bhk: 2, floors: 'G+1', area: 120, tier: 'STANDARD', mode: 'DETAILED' });
  const [out, setOut] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!meta) return null;
  const run = async () => {
    setBusy(true); setErr('');
    try {
      const loc = meta.locations.find((l) => l.displayName.startsWith('Chhatrapati')) || meta.locations[0];
      setOut(await adminApi.post(`/rate-sets/${id}/preview`, { mode: f.mode, input: { houseType: 'PLOT_HOUSE', floors: f.floors, bhk: f.bhk, builtUpAreaSqm: Number(f.area), areaBasis: 'PER_FLOOR', qualityTier: f.tier, locationId: loc.id, structureType: 'RCC_FRAME', addons: [] } }));
    } catch (e) { setErr(e.details?.length ? e.details.map((d) => `${d.path}: ${d.message}`).join('; ') : e.message); setOut(null); } finally { setBusy(false); }
  };
  return (
    <GlassCard strong className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-5">
        <Select label="Mode" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={[{ value: 'DETAILED', label: 'Detailed' }, { value: 'QUICK', label: 'Quick' }]} />
        <Select label="BHK" value={f.bhk} onChange={(e) => setF({ ...f, bhk: Number(e.target.value) })} options={meta.bhkConfigs.map((b) => ({ value: b.bhk, label: `${b.bhk} BHK` }))} />
        <Select label="Floors" value={f.floors} onChange={(e) => setF({ ...f, floors: e.target.value })} options={meta.floorOptions.map((o) => ({ value: o.code, label: o.code }))} />
        <Input label="Area / floor (sqm)" inputMode="decimal" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
        <Select label="Tier" value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })} options={['BASIC', 'STANDARD', 'PREMIUM'].map((t) => ({ value: t, label: t }))} />
      </div>
      <Button loading={busy} onClick={run}>Calculate with this rate set</Button>
      {err && <Banner kind="danger">{err}</Banner>}
      {out && <div className="text-sm"><p>Grand total <b className="num text-lg">{formatINR(out.grandTotal)}</b> &middot; {formatINR(out.costPerSqft)}/sqft &middot; range {formatINR(out.range.min)} - {formatINR(out.range.max)}</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">{out.categories.map((c) => <li key={c.key} className="flex justify-between border-b border-ink-300/30"><span>{c.label}</span><span className="num">{formatINR(c.amount)}</span></li>)}</ul></div>}
    </GlassCard>
  );
}
