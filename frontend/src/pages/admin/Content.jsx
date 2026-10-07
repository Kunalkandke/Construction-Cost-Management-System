import { useState } from 'react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Select, Textarea } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Feedback';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Overlay';
import { Tabs } from '../../components/ui/Tabs';
import { adminApi } from '../../api/admin';
import { formatDate, formatDateTime } from '../../lib/format';
import { PageHeader, ResourceEditor, useAct, useAdminList, useListState } from './adminKit';

const local = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

const FAQ_FIELDS = [{ name: 'question', label: 'Question', type: 'text' }, { name: 'answer', label: 'Answer', type: 'textarea' }, { name: 'sortOrder', label: 'Order (lower shows first)', type: 'number', default: 0 }, { name: 'isActive', label: 'Visible', type: 'bool', default: true }];
const ANN_FIELDS = [{ name: 'title', label: 'Title', type: 'text' }, { name: 'body', label: 'Message', type: 'textarea', optional: true }, { name: 'kind', label: 'Kind', type: 'select', default: 'info', options: ['info', 'warning', 'success'].map((k) => ({ value: k, label: k })) },
  { name: 'startsAt', label: 'Starts (UTC ISO, e.g. 2026-11-01T00:00:00Z, empty = now)', type: 'text', optional: true }, { name: 'endsAt', label: 'Ends (UTC ISO, empty = never)', type: 'text', optional: true }, { name: 'isActive', label: 'Active', type: 'bool', default: true }];

function Messages() {
  const ls = useListState({ status: '' });
  const { data, isLoading, error, refetch } = useAdminList('/contact-messages', { ...ls.params, ...(ls.s.status ? { status: ls.s.status } : {}) });
  const { act, busy } = useAct();
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState('');
  const tone = { new: 'danger', read: 'warning', resolved: 'success' };
  const cols = [{ key: 'name', header: 'From' }, { key: 'email', header: 'Email' }, { key: 'subject', header: 'Subject' }, { key: 'status', header: 'Status', render: (r) => <Badge tone={tone[r.status]}>{r.status}</Badge> }, { key: 'createdAt', header: 'Received', render: (r) => formatDateTime(r.createdAt) }];
  const openMsg = (r) => { setOpen(r); setReply(''); if (r.status === 'new') adminApi.patch(`/contact-messages/${r.id}`, { status: 'read' }).catch(() => {}); };
  return (
    <GlassCard strong padding="p-4">
      <div className="mb-3 max-w-xs"><Select label="Status" value={ls.s.status} onChange={(e) => ls.set({ status: e.target.value })} placeholder="All" options={['new', 'read', 'resolved'].map((s) => ({ value: s, label: s }))} /></div>
      <DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} meta={data?.meta} onPage={ls.setPage} onRowClick={openMsg} />
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.subject || 'Message'} size="lg"
        footer={<><Button variant="secondary" loading={busy} onClick={async () => { const r = await act(() => adminApi.patch(`/contact-messages/${open.id}`, { status: 'resolved' }), 'Marked resolved'); if (r.ok) setOpen(null); }}>Mark resolved</Button>
          <Button loading={busy} disabled={!reply.trim()} onClick={async () => { const r = await act(() => adminApi.patch(`/contact-messages/${open.id}`, { reply }), 'Reply sent'); if (r.ok) setOpen(null); }}>Send reply by email</Button></>}>
        {open && <div className="space-y-3 text-sm"><p><b>{open.name}</b> &lt;{open.email}&gt; &middot; {formatDate(open.createdAt)}</p><p className="whitespace-pre-wrap rounded-xl bg-white/70 p-3">{open.message}</p><Textarea label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} hint="Sent to the sender's email (when SMTP is configured)." /></div>}
      </Modal>
    </GlassCard>
  );
}

export default function Content() {
  const [tab, setTab] = useState('faqs');
  return (
    <div><Seo title="Content" noindex /><PageHeader title="Content" subtitle="FAQs, site announcements and contact messages" />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ id: 'faqs', label: 'FAQs' }, { id: 'ann', label: 'Announcements' }, { id: 'msg', label: 'Contact messages' }]} />
      {tab === 'faqs' && <ResourceEditor path="/faqs" noun="FAQ" canCreate canDelete fields={FAQ_FIELDS} columns={[{ key: 'sortOrder', header: 'Order', align: 'right' }, { key: 'question', header: 'Question' }, { key: 'isActive', header: 'Visible', render: (r) => (r.isActive ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>) }]} />}
      {tab === 'ann' && <ResourceEditor path="/announcements" noun="announcement" canCreate canDelete fields={ANN_FIELDS} columns={[{ key: 'title', header: 'Title' }, { key: 'kind', header: 'Kind', render: (r) => <Badge tone={r.kind === 'warning' ? 'warning' : r.kind === 'success' ? 'success' : 'info'}>{r.kind}</Badge> }, { key: 'startsAt', header: 'Starts', render: (r) => (r.startsAt ? formatDateTime(r.startsAt) : 'Now') }, { key: 'endsAt', header: 'Ends', render: (r) => (r.endsAt ? formatDateTime(r.endsAt) : 'Never') }, { key: 'isActive', header: 'Active', render: (r) => (r.isActive ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>) }]} />}
      {tab === 'msg' && <Messages />}
    </div>
  );
}
