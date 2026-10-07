import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { DataTable } from '../../components/ui/DataTable';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input, NumberInput, Select, Textarea, Toggle } from '../../components/ui/Form';
import { Modal, ConfirmDialog } from '../../components/ui/Overlay';
import { Banner } from '../../components/ui/Feedback';
import { useDebounce } from '../../hooks/useDebounce';

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold">{title}</h1>{subtitle && <p className="text-ink-500">{subtitle}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>
);

export function useAdminList(path, params, enabled = true) {
  return useQuery({ queryKey: ['admin', path, params], queryFn: () => adminApi.list(path, params), placeholderData: (p) => p, enabled });
}

// Runs an admin mutation with toast feedback and refreshes admin queries
export function useAct() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const act = async (fn, success) => {
    setBusy(true);
    try { const r = await fn(); if (success) toast.success(success); qc.invalidateQueries({ queryKey: ['admin'] }); return { ok: true, data: r }; }
    catch (e) { toast.error(e.details?.[0]?.message ? `${e.message}: ${e.details[0].message}` : e.message); return { ok: false, error: e }; }
    finally { setBusy(false); }
  };
  return { act, busy };
}

// list state: page / sort / debounced search
export function useListState(initial = {}) {
  const [s, setS] = useState({ page: 1, q: '', sort: '', ...initial });
  const q = useDebounce(s.q, 350);
  const params = { page: s.page, pageSize: 20, ...(q ? { q } : {}), ...(s.sort ? { sort: s.sort } : {}) };
  return { s, set: (patch) => setS((o) => ({ ...o, page: 1, ...patch })), setPage: (page) => setS((o) => ({ ...o, page })), params, q };
}

export const SearchBox = ({ value, onChange, placeholder = 'Search...' }) => (
  <input className="glass-input max-w-xs" aria-label="Search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
);

const toStr = (v, type) => (type === 'json' ? JSON.stringify(v ?? {}, null, 2) : v === null || v === undefined ? '' : String(v));

/**
 * Generic CRUD editor driven by config. fields: [{ name, label, type: text|number|bool|json|select|textarea, options?, createOnly?, hint? }]
 * Values are sent camelCase; the API maps them to columns.
 */
export function ResourceEditor({ path, columns, fields, canCreate = false, canDelete = false, createDefaults = {}, noun = 'record', searchable = true, pageSize = 20, itemPath }) {
  const ls = useListState();
  const { data, isLoading, error, refetch } = useAdminList(path, { ...ls.params, pageSize });
  const { act, busy } = useAct();
  const [edit, setEdit] = useState(null); // null | {row?} 
  const [del, setDel] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const rowPath = itemPath || path;

  useEffect(() => {
    if (!edit) return;
    const base = edit.row || createDefaults;
    setForm(Object.fromEntries(fields.map((f) => [f.name, f.type === 'bool' ? Boolean(base[f.name] ?? (f.default ?? false)) : f.type === 'number' ? (base[f.name] ?? null) : toStr(base[f.name] ?? f.default, f.type)])));
    setErr('');
  }, [edit]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const body = {};
    for (const f of fields) {
      if (edit.row && f.createOnly) continue;
      if (!edit.row && f.editOnly) continue;
      let v = form[f.name];
      if (f.type === 'json') { try { v = JSON.parse(v); } catch { setErr(`${f.label}: invalid JSON`); return; } }
      else if (f.type === 'number') { if (v === null || v === undefined) { if (f.optional) { body[f.name] = null; continue; } setErr(`${f.label} is required`); return; } }
      else if (f.type !== 'bool' && v === '' && f.optional) continue;
      body[f.name] = v;
    }
    const r = await act(() => (edit.row ? adminApi.patch(`${rowPath}/${edit.row.id}`, body) : adminApi.post(path, body)), edit.row ? 'Saved' : 'Created');
    if (r.ok) setEdit(null); else setErr(r.error.details?.map((d) => `${d.path}: ${d.message}`).join('; ') || r.error.message);
  };

  const renderField = (f) => {
    const dis = Boolean(edit.row && f.createOnly);
    const common = { label: f.label, hint: f.hint, disabled: dis };
    if (f.type === 'bool') return <Toggle key={f.name} checked={form[f.name]} onChange={(v) => setForm({ ...form, [f.name]: v })} label={f.label} />;
    if (f.type === 'number') return <NumberInput key={f.name} {...common} value={form[f.name]} onChange={(n) => setForm({ ...form, [f.name]: n })} />;
    if (f.type === 'select') return <Select key={f.name} {...common} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} options={f.options} />;
    if (f.type === 'json' || f.type === 'textarea') return <Textarea key={f.name} {...common} rows={f.type === 'json' ? 8 : 3} className={f.type === 'json' ? 'font-mono text-xs' : ''} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />;
    return <Input key={f.name} {...common} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />;
  };

  return (
    <GlassCard strong padding="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {searchable ? <input className="glass-input max-w-xs" aria-label="Search" placeholder="Search..." value={ls.s.q} onChange={(e) => ls.set({ q: e.target.value })} /> : <span />}
        {canCreate && <Button icon={Plus} onClick={() => setEdit({})}>New {noun}</Button>}
      </div>
      <DataTable columns={columns} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage}
        actions={(r) => <div className="flex justify-end gap-1"><Button size="sm" variant="secondary" onClick={() => setEdit({ row: r })}>Edit</Button>{canDelete && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDel(r)}>Delete</Button>}</div>} />
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={`${edit?.row ? 'Edit' : 'New'} ${noun}`} size="lg"
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={submit}>Save</Button></>}>
        <div className="space-y-3">{err && <Banner kind="danger">{err}</Banner>}{edit && fields.filter((f) => (edit.row ? !f.createOnlyHidden : !f.editOnly)).map(renderField)}</div>
      </Modal>
      <ConfirmDialog open={Boolean(del)} onClose={() => setDel(null)} danger title={`Delete ${noun}?`} confirmLabel="Delete" loading={busy}
        message="Records referenced by estimates are deactivated instead of removed. Every change is written to the audit log."
        onConfirm={async () => { const r = await act(() => adminApi.del(`${rowPath}/${del.id}`), 'Removed'); if (r.ok) setDel(null); }} />
    </GlassCard>
  );
}
