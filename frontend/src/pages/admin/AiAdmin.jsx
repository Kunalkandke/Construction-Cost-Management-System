import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Plus, Power } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input, NumberInput, Textarea, Toggle, Select } from '../../components/ui/Form';
import { Badge, Banner, ErrorState, KpiCard, Skeleton } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Overlay';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { GroupedBars } from '../../components/charts/TierBars';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime, formatNumber } from '../../lib/format';
import { PageHeader, useAct, useAdminList } from './adminKit';

function Prompts() {
  const { isSuper } = useAuth();
  const { act, busy } = useAct();
  const { data, isLoading, error, refetch } = useAdminList('/ai/prompts', {});
  const ests = useAdminList('/estimates', { pageSize: 20 });
  const [newP, setNewP] = useState(null);
  const [test, setTest] = useState(null);
  const [estId, setEstId] = useState('');
  const [out, setOut] = useState(null);
  const [view, setView] = useState(null);
  const cols = [{ key: 'key', header: 'Key' }, { key: 'version', header: 'Version', align: 'right' }, { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) }, { key: 'createdAt', header: 'Created', render: (r) => formatDateTime(r.createdAt) }];
  const runTest = async () => { setOut(null); const r = await act(() => adminApi.post(`/ai/prompts/${test.id}/test`, { estimateId: estId }), ''); if (r.ok) setOut(r.data); };
  return (
    <GlassCard strong padding="p-4">
      {isSuper && <div className="mb-3"><Button icon={Plus} onClick={() => setNewP({ key: 'insights_system', template: '' })}>New version</Button></div>}
      <DataTable columns={cols} rows={data?.rows} loading={isLoading} error={error} onRetry={refetch} rowKey="id"
        actions={(r) => <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => setView(r)}>View</Button>
          {isSuper && !r.isActive && <Button size="sm" variant="secondary" icon={Power} onClick={() => act(() => adminApi.post(`/ai/prompts/${r.id}/activate`), 'Prompt activated')}>Activate</Button>}
          {isSuper && <Button size="sm" variant="secondary" icon={Play} onClick={() => { setTest(r); setOut(null); }}>Test</Button>}</div>} />
      <Modal open={Boolean(view)} onClose={() => setView(null)} title={`${view?.key} v${view?.version}`} size="lg"><pre className="whitespace-pre-wrap text-xs">{view?.template}</pre></Modal>
      <Modal open={Boolean(newP)} onClose={() => setNewP(null)} title="New prompt version" size="lg" footer={<><Button variant="ghost" onClick={() => setNewP(null)}>Cancel</Button><Button loading={busy} onClick={async () => { const r = await act(() => adminApi.post('/ai/prompts', newP), 'Version created (inactive)'); if (r.ok) setNewP(null); }}>Create</Button></>}>
        {newP && <div className="space-y-3"><Select label="Prompt" value={newP.key} onChange={(e) => setNewP({ ...newP, key: e.target.value })} options={[{ value: 'insights_system', label: 'System prompt' }, { value: 'insights_user', label: 'User prompt (must contain {{CONTEXT_JSON}})' }]} />
          <Textarea label="Template" rows={14} value={newP.template} onChange={(e) => setNewP({ ...newP, template: e.target.value })} /></div>}
      </Modal>
      <Modal open={Boolean(test)} onClose={() => setTest(null)} title={`Test ${test?.key} v${test?.version}`} size="lg" footer={<Button loading={busy} disabled={!estId} onClick={runTest}>Run against estimate</Button>}>
        <div className="space-y-3"><Select label="Saved estimate" value={estId} onChange={(e) => setEstId(e.target.value)} placeholder="Select an estimate" options={(ests.data?.rows || []).map((e) => ({ value: e.id, label: e.title }))} />
          {out && <><Banner kind={out.validation.valid ? 'success' : 'danger'}>{out.validation.valid ? 'Output is valid for the schema' : `Invalid: ${out.validation.error}`} ({out.model}, {out.latencyMs} ms, {out.tokensIn}/{out.tokensOut} tokens)</Banner>
            <pre className="max-h-80 overflow-auto rounded-xl bg-ink-900 p-3 text-xs text-green-200">{out.raw}</pre></>}</div>
      </Modal>
    </GlassCard>
  );
}

function AiSettings() {
  const { isSuper } = useAuth();
  const { act, busy } = useAct();
  const { data, error, refetch } = useQuery({ queryKey: ['admin', '/ai/settings'], queryFn: () => adminApi.get('/ai/settings') });
  const [f, setF] = useState(null);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return <Skeleton className="h-64" />;
  const v = f || data;
  const set = (patch) => setF({ ...v, ...patch });
  const save = () => act(() => adminApi.patch('/ai/settings', { ai_enabled: v.aiEnabled, ai_model_override: v.aiModelOverride || null, ai_temperature: v.aiTemperature, ai_daily_limit_user: v.aiDailyLimitUser, ai_daily_limit_guest: v.aiDailyLimitGuest, ai_max_output_tokens: v.aiMaxOutputTokens }), 'AI settings saved');
  return (
    <GlassCard strong className="max-w-xl space-y-3">
      {!data.configured && <Banner kind="warning">GEMINI_API_KEY is not set on the server. Insights will use rule-based fallback.</Banner>}
      {!isSuper && <Banner kind="info">Only a super admin can change AI settings.</Banner>}
      <Toggle checked={Boolean(v.aiEnabled)} onChange={(x) => set({ aiEnabled: x })} label="AI insights enabled (kill switch)" description="When off, users get rule-based suggestions" disabled={!isSuper} />
      <Input label="Model id override" value={v.aiModelOverride || ''} onChange={(e) => set({ aiModelOverride: e.target.value })} hint="Leave empty to use GEMINI_MODEL from the server environment" disabled={!isSuper} />
      <NumberInput label="Temperature (0 to 2)" value={v.aiTemperature} onChange={(n) => set({ aiTemperature: n })} disabled={!isSuper} />
      <NumberInput label="Daily limit per user" decimal={false} value={v.aiDailyLimitUser} onChange={(n) => set({ aiDailyLimitUser: n })} disabled={!isSuper} />
      <NumberInput label="Daily limit per guest IP" decimal={false} value={v.aiDailyLimitGuest} onChange={(n) => set({ aiDailyLimitGuest: n })} disabled={!isSuper} />
      <NumberInput label="Max output tokens" decimal={false} value={v.aiMaxOutputTokens} onChange={(n) => set({ aiMaxOutputTokens: n })} disabled={!isSuper} />
      {isSuper && <Button loading={busy} onClick={save}>Save settings</Button>}
    </GlassCard>
  );
}

function Usage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/ai/usage', range], queryFn: () => adminApi.get('/ai/usage', { range }), placeholderData: (p) => p });
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <Select label="Range" value={range} onChange={(e) => setRange(e.target.value)} fieldClass="max-w-[200px]" options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><KpiCard label="Calls" value={formatNumber(data.totalCalls)} hint={`${data.counts.ok} ok, ${data.counts.fallback} fallback, ${data.counts.failed} failed`} /><KpiCard label="Avg latency" value={`${data.avgLatencyMs} ms`} /><KpiCard label="Tokens in / out" value={`${formatNumber(data.tokensIn)} / ${formatNumber(data.tokensOut)}`} /><KpiCard label="Approx. cost" value={data.approxCost} hint={data.costNote} /></div>
      <GroupedBars title="Calls per day" data={data.callsByDay.map((d) => ({ name: d.date.slice(5), ok: d.ok, fallback: d.fallback, failed: d.failed }))} series={[{ key: 'ok', name: 'OK', color: '#16A34A' }, { key: 'fallback', name: 'Fallback', color: '#E8941A' }, { key: 'failed', name: 'Failed', color: '#DC2626' }]} height={260} />
      <GlassCard strong><h3 className="mb-2 font-bold">Top errors</h3>{data.topErrors.length ? <ul className="space-y-1 text-sm">{data.topErrors.map((e) => <li key={e.message} className="flex justify-between gap-3"><span className="truncate">{e.message}</span><Badge tone="danger">{e.count}</Badge></li>)}</ul> : <p className="text-sm text-ink-500">No errors in this range.</p>}</GlassCard>
    </div>
  );
}

export default function AiAdmin() {
  const [tab, setTab] = useState('prompts');
  return (
    <div><Seo title="AI" noindex /><PageHeader title="AI" subtitle="Prompts, model settings and usage. AI never changes a total." />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ id: 'prompts', label: 'Prompts' }, { id: 'settings', label: 'Settings' }, { id: 'usage', label: 'Usage' }]} />
      {tab === 'prompts' && <Prompts />}{tab === 'settings' && <AiSettings />}{tab === 'usage' && <Usage />}
    </div>
  );
}
