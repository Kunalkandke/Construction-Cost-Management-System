import { supabase, unwrap, fetchAll } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { parsePaging, pageMeta } from '../../../utils/format.js';
import { D, round } from '../../../utils/money.js';
import { writeAudit } from '../../../middleware/audit.js';
import { invalidateCaches } from '../../estimates/estimates.data.js';

export async function list(q) {
  const p = parsePaging(q, ['created_at', 'actual_amount', 'completed_on']);
  let query = supabase.from('project_actuals').select('*', { count: 'exact' });
  if (q.verified) query = query.eq('verified', q.verified === 'true');
  if (q.estimateId) query = query.eq('estimate_id', q.estimateId);
  const { data, error, count } = await query.order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) throw ApiError.internal();
  const ids = [...new Set(data.map((r) => r.estimate_id))];
  const ests = ids.length ? unwrap(await supabase.from('estimates').select('id,title,inputs,results').in('id', ids), 'actuals.est') : [];
  return {
    rows: data.map((r) => {
      const e = ests.find((x) => x.id === r.estimate_id);
      const planned = e?.results?.categories?.find((c) => c.key === r.category)?.amount ?? null;
      return { ...r, estimate_title: e?.title || null, tier: e?.inputs?.qualityTier || null, planned_amount: planned, ratio: planned ? Math.round((Number(r.actual_amount) / planned) * 1000) / 1000 : null };
    }),
    meta: pageMeta(p, count),
  };
}

export async function verify(ctx, id, verified) {
  const before = unwrap(await supabase.from('project_actuals').select('*').eq('id', id).maybeSingle(), 'actuals.get');
  if (!before) throw ApiError.notFound('Actual not found');
  const row = unwrap(await supabase.from('project_actuals').update({ verified, verified_by: verified ? ctx.actorId : null }).eq('id', id).select('*').single(), 'actuals.verify');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'actual.verify', entity: 'project_actual', entityId: id, before: { verified: before.verified }, after: { verified }, ip: ctx.ip });
  return row;
}

// Section 9.6: planned vs actual per tier and category. Suggestions are never auto-applied.
export async function calibration() {
  const acts = await fetchAll(() => supabase.from('project_actuals').select('estimate_id,category,actual_amount').eq('verified', true));
  const ids = [...new Set(acts.map((a) => a.estimate_id))];
  const ests = ids.length ? unwrap(await supabase.from('estimates').select('id,inputs,results').in('id', ids.slice(0, 1000)), 'calib.est') : [];
  const groups = {};
  for (const a of acts) {
    const e = ests.find((x) => x.id === a.estimate_id);
    const planned = e?.results?.categories?.find((c) => c.key === a.category)?.amount;
    if (!planned) continue;
    const key = `${e.inputs.qualityTier}|${a.category}`;
    const g = (groups[key] ||= { tier: e.inputs.qualityTier, category: a.category, count: 0, planned: 0, actual: 0, ratios: [] });
    g.count += 1; g.planned += planned; g.actual += Number(a.actual_amount); g.ratios.push(Number(a.actual_amount) / planned);
  }
  const rows = Object.values(groups).map((g) => {
    const mean = g.ratios.reduce((a, b) => a + b, 0) / g.ratios.length;
    return { tier: g.tier, category: g.category, projects: g.count, plannedTotal: g.planned, actualTotal: g.actual, meanRatio: round(mean, 3).toNumber(), suggestedFactor: round(mean, 3).toNumber() };
  }).sort((a, b) => a.tier.localeCompare(b.tier) || a.category.localeCompare(b.category));
  return { rows, note: 'Suggested factor = mean(actual / planned). Apply it to the relevant consumption norm manually; it is never auto-applied.' };
}

// Explicit admin action: multiply one norm (one tier or all) by a factor. Bumps the norm version and writes an audit log.
export async function applyNormFactor(ctx, { normKey, tier, factor }) {
  const before = unwrap(await supabase.from('consumption_norms').select('*').eq('key', normKey).maybeSingle(), 'norm.get');
  if (!before) throw ApiError.notFound('Norm not found');
  const cols = tier === 'ALL' ? ['basic', 'standard', 'premium'] : [tier.toLowerCase()];
  const patch = { version: before.version + 1 };
  cols.forEach((c) => { patch[c] = round(D(before[c]).times(factor), 4).toNumber(); });
  const row = unwrap(await supabase.from('consumption_norms').update(patch).eq('key', normKey).select('*').single(), 'norm.apply');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'norm.apply_calibration', entity: 'consumption_norm', entityId: row.id, before, after: { ...patch, factor, tier }, ip: ctx.ip });
  return row;
}
