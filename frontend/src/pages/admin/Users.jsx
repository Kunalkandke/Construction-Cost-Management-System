import { useState } from 'react';
import { Mail, ShieldOff, ShieldCheck, LogOut, Trash2 } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Feedback';
import { DataTable } from '../../components/ui/DataTable';
import { Drawer, ConfirmDialog } from '../../components/ui/Overlay';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatDateTime, formatINR } from '../../lib/format';
import { PageHeader, SearchBox, useAct, useAdminList, useListState } from './adminKit';

const roleTone = { super_admin: 'danger', admin: 'accent', user: 'brand' };

export default function Users() {
  const ls = useListState({ role: '', status: '' });
  const { user: me, isSuper } = useAuth();
  const { data, isLoading, error, refetch } = useAdminList('/users', { ...ls.params, ...(ls.s.role ? { role: ls.s.role } : {}), ...(ls.s.status ? { status: ls.s.status } : {}) });
  const [sel, setSel] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { act, busy } = useAct();
  const detail = useQuery({ queryKey: ['admin', '/users', sel?.id], queryFn: () => adminApi.get(`/users/${sel.id}`), enabled: Boolean(sel) });
  const u = detail.data || sel;
  const canTouch = (t) => t.id === me.id || t.role === 'user' || isSuper;
  const cols = [
    { key: 'name', header: 'Name', sortable: true }, { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', render: (r) => <Badge tone={roleTone[r.role]}>{r.role}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'success' : 'danger'}>{r.status}</Badge> },
    { key: 'estimateCount', header: 'Estimates', align: 'right' }, { key: 'lastLoginAt', header: 'Last login', sortable: true, render: (r) => formatDate(r.lastLoginAt) }, { key: 'createdAt', header: 'Joined', sortable: true, render: (r) => formatDate(r.createdAt) },
  ];
  const run = async (fn, msg) => { const r = await act(fn, msg); if (r.ok) { setConfirm(null); } return r; };
  return (
    <div><Seo title="Users" noindex /><PageHeader title="Users" subtitle="Search, block, reset passwords and manage roles" />
      <GlassCard strong padding="p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3"><SearchBox value={ls.s.q} onChange={(q) => ls.set({ q })} placeholder="Name or email" />
          <Select aria-label="Role" value={ls.s.role} onChange={(e) => ls.set({ role: e.target.value })} placeholder="All roles" options={['user', 'admin', 'super_admin'].map((r) => ({ value: r, label: r }))} />
          <Select aria-label="Status" value={ls.s.status} onChange={(e) => ls.set({ status: e.target.value })} placeholder="All statuses" options={['active', 'blocked'].map((r) => ({ value: r, label: r }))} /></div>
        <DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage} sort={ls.s.sort} onSort={(sort) => ls.set({ sort })} onRowClick={setSel} />
      </GlassCard>
      <Drawer open={Boolean(sel)} onClose={() => setSel(null)} title={u?.name || 'User'}>
        {u && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-2"><dt className="text-ink-500">Email</dt><dd className="break-all">{u.email}</dd><dt className="text-ink-500">Phone</dt><dd>{u.phone || '-'}</dd><dt className="text-ink-500">Role</dt><dd><Badge tone={roleTone[u.role]}>{u.role}</Badge></dd>
              <dt className="text-ink-500">Status</dt><dd><Badge tone={u.status === 'active' ? 'success' : 'danger'}>{u.status}</Badge></dd><dt className="text-ink-500">Joined</dt><dd>{formatDateTime(u.createdAt)}</dd><dt className="text-ink-500">Last login</dt><dd>{formatDateTime(u.lastLoginAt)}</dd><dt className="text-ink-500">Active sessions</dt><dd>{u.activeSessions ?? '-'}</dd></dl>
            {u.recentEstimates?.length > 0 && <div><h3 className="mb-1 font-bold">Recent estimates</h3><ul className="space-y-1">{u.recentEstimates.map((e) => <li key={e.id} className="flex justify-between"><span className="truncate">{e.title}</span><span className="num">{formatINR(e.grandTotal)}</span></li>)}</ul></div>}
            {canTouch(u) ? (
              <div className="flex flex-col gap-2">
                {u.id !== me.id && <Button variant="secondary" icon={u.status === 'active' ? ShieldOff : ShieldCheck} onClick={() => setConfirm({ title: u.status === 'active' ? 'Block this user?' : 'Unblock this user?', fn: () => adminApi.patch(`/users/${u.id}`, { status: u.status === 'active' ? 'blocked' : 'active' }), msg: 'User updated' })}>{u.status === 'active' ? 'Block user' : 'Unblock user'}</Button>}
                <Button variant="secondary" icon={Mail} onClick={() => setConfirm({ title: 'Send password reset email?', fn: () => adminApi.post(`/users/${u.id}/reset-password`), msg: 'Reset email sent' })}>Reset password (email)</Button>
                <Button variant="secondary" icon={LogOut} onClick={() => setConfirm({ title: 'Sign this user out everywhere?', fn: () => adminApi.post(`/users/${u.id}/revoke-sessions`), msg: 'Sessions revoked' })}>Revoke sessions</Button>
                {isSuper && u.id !== me.id && <>
                  <Select label="Change role" value={u.role} onChange={(e) => setConfirm({ title: `Change role to ${e.target.value}?`, fn: () => adminApi.patch(`/users/${u.id}`, { role: e.target.value }), msg: 'Role updated' })} options={['user', 'admin', 'super_admin'].map((r) => ({ value: r, label: r }))} />
                  <Button variant="danger" icon={Trash2} onClick={() => setConfirm({ title: 'Delete this user?', danger: true, word: 'delete', fn: () => adminApi.del(`/users/${u.id}`, { confirm: true }), msg: 'User deleted', close: true })}>Delete user</Button></>}
              </div>
            ) : <p className="text-ink-500">Only a super admin can modify admins.</p>}
          </div>)}
      </Drawer>
      <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title} danger={confirm?.danger} requireWord={confirm?.word} loading={busy} message="This action is written to the audit log."
        onConfirm={async () => { const r = await run(confirm.fn, confirm.msg); if (r.ok && confirm.close) setSel(null); }} />
    </div>
  );
}
