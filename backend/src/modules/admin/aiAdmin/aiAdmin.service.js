import { supabase, unwrap, fetchAll } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { writeAudit } from '../../../middleware/audit.js';
import { getSettings } from '../../estimates/estimates.data.js';
import { testPrompt, aiConfigured } from '../../ai/ai.service.js';
import { update as updateSettings } from '../settings/settings.service.js';
import { AI_SETTING_KEYS } from './aiAdmin.schema.js';

export async function listPrompts(key) {
  let q = supabase.from('ai_prompts').select('*').order('key').order('version', { ascending: false });
  if (key) q = q.eq('key', key);
  return unwrap(await q, 'prompts.list');
}
export async function createPrompt(ctx, { key, template }) {
  const last = unwrap(await supabase.from('ai_prompts').select('version').eq('key', key).order('version', { ascending: false }).limit(1).maybeSingle(), 'prompts.last');
  const row = unwrap(await supabase.from('ai_prompts').insert({ key, version: (last?.version || 0) + 1, template, is_active: false, updated_by: ctx.actorId }).select('*').single(), 'prompts.create');
  await writeAudit({ actorId: ctx.actorId, action: 'ai_prompt.create', entity: 'ai_prompt', entityId: row.id, after: { key, version: row.version }, ip: ctx.ip });
  return row;
}
export async function activatePrompt(ctx, id) {
  const p = unwrap(await supabase.from('ai_prompts').select('*').eq('id', id).maybeSingle(), 'prompts.get');
  if (!p) throw ApiError.notFound('Prompt not found');
  unwrap(await supabase.from('ai_prompts').update({ is_active: false }).eq('key', p.key).eq('is_active', true), 'prompts.deactivate');
  const row = unwrap(await supabase.from('ai_prompts').update({ is_active: true, updated_by: ctx.actorId }).eq('id', id).select('*').single(), 'prompts.activate');
  await writeAudit({ actorId: ctx.actorId, action: 'ai_prompt.activate', entity: 'ai_prompt', entityId: id, after: { key: p.key, version: p.version }, ip: ctx.ip });
  return row;
}
export const runTest = (promptId, estimateId) => testPrompt(promptId, estimateId);

export async function usage(range) {
  const days = Number(range.replace('d', ''));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await fetchAll(() => supabase.from('ai_insights').select('created_at,status,latency_ms,tokens_in,tokens_out,error,model').gte('created_at', since).order('created_at'));
  const s = await getSettings();
  const price = s.ai_cost_per_million_tokens || { input: 0, output: 0 };
  const byDay = {};
  const errors = {};
  let tin = 0; let tout = 0; let lat = 0; let latN = 0;
  const count = { ok: 0, fallback: 0, failed: 0 };
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    byDay[d] ||= { date: d, ok: 0, fallback: 0, failed: 0 };
    byDay[d][r.status] += 1; count[r.status] += 1;
    tin += r.tokens_in || 0; tout += r.tokens_out || 0;
    if (r.latency_ms) { lat += r.latency_ms; latN += 1; }
    if (r.error) { const k = r.error.slice(0, 120); errors[k] = (errors[k] || 0) + 1; }
  }
  return {
    range, totalCalls: rows.length, counts: count, calls_by_day: Object.values(byDay),
    avgLatencyMs: latN ? Math.round(lat / latN) : 0, tokensIn: tin, tokensOut: tout,
    approxCost: Math.round(((tin * price.input + tout * price.output) / 1_000_000) * 100) / 100,
    costNote: price.input || price.output ? 'Uses ai_cost_per_million_tokens setting' : 'Set ai_cost_per_million_tokens to see an approximate cost',
    topErrors: Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([message, n]) => ({ message, count: n })),
    configured: aiConfigured(),
  };
}

export async function getAiSettings() {
  const s = await getSettings();
  return { ...Object.fromEntries(AI_SETTING_KEYS.map((k) => [k, s[k] ?? null])), configured: aiConfigured() };
}
export async function patchAiSettings(ctx, values) {
  await updateSettings(ctx, values);
  return getAiSettings();
}
