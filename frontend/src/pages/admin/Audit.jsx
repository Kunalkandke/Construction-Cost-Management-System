import { Fragment, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Badge, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/DataTable';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime } from '../../lib/format';
import { PageHeader, useAdminList, useListState } from './adminKit';

const Json = ({ label, v, tone }) => (v ? <div className="min-w-0"><p className={`mb-1 text-xs font-bold uppercase ${tone}`}>{label}</p><pre className="max-h-64 overflow-auto rounded-lg bg-ink-900 p-3 text-xs text-green-200">{JSON.stringify(v, null, 2)}</pre></div> : null);

export default function Audit() {
  const { isSuper } = useAuth();
  const ls = useListState({ action: '', entity: '', from: '', to: '' });
  const f = ls.s;
  const extra = { ...(f.action ? { action: f.action } : {}), ...(f.entity ? { entity: f.entity } : {}), ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}) };
  const { data, isLoading, error, refetch } = useAdminList('/audit-logs', { ...ls.params, ...extra });
  const [open, setOpen] = useState(null);
  return (
    <div><Seo title="Audit log" noindex />
      <PageHeader title="Audit log" subtitle="Every admin change and security event, with before and after values" actions={isSuper && <Button variant="secondary" icon={Download} onClick={() => adminApi.download('/audit-logs/export.csv', 'ccms-audit.csv', extra)}>Export CSV</Button>} />
      <GlassCard strong padding="p-4">
        <div className="mb-3 grid gap-3 sm:grid-cols-4"><Input label="Action contains" value={f.action} onChange={(e) => ls.set({ action: e.target.value })} placeholder="rate_set.publish" /><Input label="Entity" value={f.entity} onChange={(e) => ls.set({ entity: e.target.value })} placeholder="user" />
          <Input label="From" type="date" value={f.from} onChange={(e) => ls.set({ from: e.target.value })} /><Input label="To" type="date" value={f.to} onChange={(e) => ls.set({ to: e.target.value })} /></div>
        {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Skeleton className="h-64" /> : !data.rows.length ? <EmptyState title="No log entries">Nothing matches these filters.</EmptyState> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-brand-50/80 text-left text-xs uppercase text-ink-500"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th><th className="px-3 py-2" /></tr></thead>
            <tbody>{data.rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-ink-300/30 bg-white/50"><td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td><td className="px-3 py-2">{r.actor?.email || <span className="text-ink-500">system</span>}</td><td className="px-3 py-2"><Badge tone="brand">{r.action}</Badge></td><td className="px-3 py-2">{r.entity} <span className="text-xs text-ink-500">{r.entityId?.slice(0, 8)}</span></td>
                  <td className="px-3 py-2 text-right"><button type="button" className="rounded p-1 hover:bg-ink-100" aria-expanded={open === r.id} aria-label="Toggle details" onClick={() => setOpen(open === r.id ? null : r.id)}><ChevronDown className={`h-4 w-4 transition ${open === r.id ? 'rotate-180' : ''}`} /></button></td></tr>
                {open === r.id && <tr className="bg-brand-50/40"><td colSpan={5} className="px-3 py-3"><div className="grid gap-3 md:grid-cols-2"><Json label="Before" v={r.before} tone="text-danger" /><Json label="After" v={r.after} tone="text-success" />{!r.before && !r.after && <p className="text-sm text-ink-500">No payload recorded. IP: {r.ip || '-'}</p>}</div></td></tr>}
              </Fragment>))}</tbody></table></div>)}
        {data && <Pagination meta={data.meta} onPage={ls.setPage} />}
      </GlassCard>
    </div>
  );
}
