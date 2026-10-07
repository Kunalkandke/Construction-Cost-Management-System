import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input, NumberInput, Textarea, Toggle } from '../../components/ui/Form';
import { Banner, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { adminApi } from '../../api/admin';
import { formatDateTime } from '../../lib/format';
import { PageHeader, useAct } from './adminKit';

const SECTIONS = [
  ['Estimation', ['contingency_percent', 'accuracy_band_percent', 'default_escalation_percent', 'blended_wage_per_manday', 'soft_cost_percent', 'gst_percent', 'gst_enabled', 'dynamic_band', 'soil_depth_factors', 'calibration_min_projects']],
  ['Display', ['disclaimer_text', 'footer_credit_text', 'rates_verified']],
  ['Stage templates', ['stage_templates']],
  ['Advanced (JSON)', ['labour_pct_by_category', 'area_limits_sqm', 'low_density_sqm_per_bedroom', 'fallback_share_threshold_percent', 'publish_max_change_percent', 'escalation_config', 'escalation_items', 'sensitivity_config', 'budget_planner_config', 'outlook_rising_threshold_percent', 'fallback_rules', 'monsoon_months']],
];
const HINT = { contingency_percent: 'Allowed 5 to 15', accuracy_band_percent: 'Likely range, plus or minus %', rates_verified: 'Updated automatically when a rate set is published', dynamic_band: '{ enabled, min, max, step }', gst_enabled: 'GST option appears in the wizard when on' };
const label = (k) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function Settings() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/settings'], queryFn: () => adminApi.get('/settings') });
  const [draft, setDraft] = useState({});
  const [jsonErr, setJsonErr] = useState({});
  const [confirm, setConfirm] = useState(false);
  const { act, busy } = useAct();
  const byKey = useMemo(() => Object.fromEntries((data || []).map((s) => [s.key, s])), [data]);
  if (error) return <GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard>;
  if (isLoading) return <Skeleton className="h-96" />;
  const value = (k) => (k in draft ? draft[k] : byKey[k]?.value);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const changed = Object.keys(draft).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(byKey[k]?.value));

  const field = (k) => {
    const v = value(k); const common = { key: k, label: label(k), hint: HINT[k] };
    if (typeof byKey[k]?.value === 'boolean') return <Toggle key={k} checked={Boolean(v)} onChange={(x) => set(k, x)} label={label(k)} description={HINT[k]} />;
    if (typeof byKey[k]?.value === 'number') return <NumberInput {...common} value={v} onChange={(n) => set(k, n)} />;
    if (typeof byKey[k]?.value === 'string') return k.includes('text') ? <Textarea {...common} rows={4} value={v} onChange={(e) => set(k, e.target.value)} /> : <Input {...common} value={v} onChange={(e) => set(k, e.target.value)} />;
    const text = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    return <Textarea {...common} rows={Math.min(14, text.split('\n').length + 1)} className="font-mono text-xs" error={jsonErr[k]} value={text}
      onChange={(e) => { try { set(k, JSON.parse(e.target.value)); setJsonErr((x) => ({ ...x, [k]: undefined })); } catch { set(k, e.target.value); setJsonErr((x) => ({ ...x, [k]: 'Invalid JSON' })); } }} />;
  };
  const save = async () => {
    const values = Object.fromEntries(changed.map((k) => [k, draft[k]]));
    const r = await act(() => adminApi.patch('/settings', { values }), 'Settings saved');
    if (r.ok) { setDraft({}); setConfirm(false); }
  };
  const last = (data || []).reduce((a, s) => (!a || s.updatedAt > a.updatedAt ? s : a), null);
  return (
    <div className="space-y-5"><Seo title="Settings" noindex />
      <PageHeader title="System settings" subtitle={last ? `Last updated ${formatDateTime(last.updatedAt)}` : ''} actions={<Button disabled={!changed.length || Object.values(jsonErr).some(Boolean)} onClick={() => setConfirm(true)}>Save {changed.length ? `(${changed.length})` : ''}</Button>} />
      <Banner kind="info">Values are validated on the server (type and range). Unknown keys are rejected. Every change is audit-logged.</Banner>
      {SECTIONS.map(([title, keys]) => (
        <GlassCard strong key={title}><h2 className="mb-3 text-lg font-bold">{title}</h2><div className="grid gap-4 md:grid-cols-2">{keys.filter((k) => byKey[k]).map(field)}</div></GlassCard>
      ))}
      <GlassCard strong><h2 className="mb-1 text-lg font-bold">Security</h2><p className="text-sm text-ink-500">Read-only. Tokens: access 15 min (memory), refresh 7 days (httpOnly cookie, rotated, reuse detection). Login locks for 15 minutes after 5 failures. Secrets live in server environment variables.</p></GlassCard>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={save} loading={busy} title="Save settings?" confirmLabel="Save" message={<>Changing <b>{changed.map(label).join(', ')}</b> affects new estimates immediately.</>} />
    </div>
  );
}
