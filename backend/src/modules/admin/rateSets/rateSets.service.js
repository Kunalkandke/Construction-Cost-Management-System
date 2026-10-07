import { supabase, unwrap, fetchAll } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { toSnake, parsePaging, pageMeta } from '../../../utils/format.js';
import { writeAudit } from '../../../middleware/audit.js';
import { REQUIRED_RATE_UNITS, ZERO_RATE_ALLOWED } from '../../../config/constants.js';
import { getSettings, invalidateCaches } from '../../estimates/estimates.data.js';
import { runEngine } from '../../estimates/estimates.service.js';
import { safeLike } from '../crud.js';

export async function getSet(id) {
  const s = unwrap(await supabase.from('rate_sets').select('*').eq('id', id).maybeSingle(), 'rateset.get');
  if (!s) throw ApiError.notFound('Rate set not found');
  return s;
}
const itemsOf = (setId) => fetchAll(() => supabase.from('rate_items').select('*').eq('rate_set_id', setId).order('item_code'));
const countItems = async (setId) => (await supabase.from('rate_items').select('id', { count: 'exact', head: true }).eq('rate_set_id', setId)).count || 0;
const effective = (i) => (i.base_rate ?? i.dsr_rate);

export async function list(q) {
  const p = parsePaging(q, ['created_at', 'name', 'fiscal_year', 'status']);
  let query = supabase.from('rate_sets').select('*', { count: 'exact' });
  if (q.status) query = query.eq('status', q.status);
  if (q.q) query = query.ilike('name', `%${safeLike(q.q)}%`);
  const { data, error, count } = await query.order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) throw ApiError.internal();
  const rows = await Promise.all(data.map(async (s) => ({ ...s, item_count: await countItems(s.id) })));
  return { rows, meta: pageMeta(p, count) };
}

// Publish validation (Section 9.2 step 3)
export async function validateForPublish(setId) {
  const items = await itemsOf(setId);
  const byCode = Object.fromEntries(items.map((i) => [i.item_code, i]));
  const errors = [];
  for (const [code, unit] of Object.entries(REQUIRED_RATE_UNITS)) {
    const it = byCode[code];
    if (!it || it.is_active === false) { errors.push({ path: code, message: 'Required item is missing' }); continue; }
    const v = effective(it);
    if (v === null || v === undefined) errors.push({ path: code, message: 'Needs base_rate or dsr_rate' });
    else if (Number(v) <= 0 && !ZERO_RATE_ALLOWED.includes(code)) errors.push({ path: code, message: 'Rate must be above 0' });
    if (it.unit !== unit) errors.push({ path: code, message: `Unit must be "${unit}" (found "${it.unit}")` });
    if (Number(it.labour_pct) < 0 || Number(it.labour_pct) > 100) errors.push({ path: code, message: 'labour_pct must be between 0 and 100' });
  }
  const { data: active } = await supabase.from('rate_sets').select('id').eq('status', 'published').maybeSingle();
  const maxChange = Number((await getSettings()).publish_max_change_percent ?? 40);
  const bigChanges = [];
  if (active && active.id !== setId) {
    const old = Object.fromEntries((await itemsOf(active.id)).map((i) => [i.item_code, i]));
    for (const it of items) {
      const o = old[it.item_code];
      if (!o || !Number(effective(o))) continue;
      const pct = ((Number(effective(it)) - Number(effective(o))) / Number(effective(o))) * 100;
      if (Math.abs(pct) > maxChange) bigChanges.push({ itemCode: it.item_code, oldRate: Number(effective(o)), newRate: Number(effective(it)), changePct: Math.round(pct * 10) / 10 });
    }
  }
  return { errors, bigChanges, maxChangePercent: maxChange, itemCount: items.length };
}

export async function get(id) {
  const s = await getSet(id);
  const v = await validateForPublish(id);
  return { ...s, item_count: v.itemCount, missing_items: v.errors, large_changes: v.bigChanges };
}

async function copyItems(fromId, toId) {
  const rows = (await itemsOf(fromId)).map(({ id, created_at, updated_at, rate_set_id, ...rest }) => ({ ...rest, rate_set_id: toId }));
  for (let i = 0; i < rows.length; i += 500) unwrap(await supabase.from('rate_items').insert(rows.slice(i, i + 500)), 'rateset.copy');
}

export async function create(ctx, body) {
  const { cloneFromId, cloneFromActive, ...fields } = body;
  const row = unwrap(await supabase.from('rate_sets').insert({ ...toSnake(fields), status: 'draft', is_verified: fields.isVerified ?? false }).select('*').single(), 'rateset.create');
  let src = cloneFromId;
  if (!src && cloneFromActive) src = (await supabase.from('rate_sets').select('id').eq('status', 'published').maybeSingle()).data?.id;
  if (src) await copyItems(src, row.id);
  await writeAudit({ actorId: ctx.actorId, action: 'rate_set.create', entity: 'rate_set', entityId: row.id, after: row, ip: ctx.ip });
  return row;
}

export async function clone(ctx, id) {
  const s = await getSet(id);
  const row = unwrap(await supabase.from('rate_sets').insert({ name: `${s.name} (copy)`, fiscal_year: s.fiscal_year, source_label: s.source_label, effective_from: s.effective_from, is_verified: false, status: 'draft' }).select('*').single(), 'rateset.clone');
  await copyItems(id, row.id);
  await writeAudit({ actorId: ctx.actorId, action: 'rate_set.clone', entity: 'rate_set', entityId: row.id, before: { clonedFrom: id }, after: row, ip: ctx.ip });
  return row;
}

export async function update(ctx, id, patch) {
  const before = await getSet(id);
  if (before.status !== 'draft') throw ApiError.conflict('Only draft rate sets can be edited. Clone it to make changes.');
  const row = unwrap(await supabase.from('rate_sets').update(toSnake(patch)).eq('id', id).select('*').single(), 'rateset.update');
  await writeAudit({ actorId: ctx.actorId, action: 'rate_set.update', entity: 'rate_set', entityId: id, before, after: row, ip: ctx.ip });
  return row;
}

export async function publish(ctx, id, { acknowledgeChanges = false }) {
  const set = await getSet(id);
  if (set.status === 'published') throw ApiError.conflict('This rate set is already published');
  const v = await validateForPublish(id);
  if (v.errors.length) throw ApiError.validation(`Rate set is incomplete (${v.errors.length} problem(s))`, v.errors.slice(0, 100));
  if (v.bigChanges.length && !acknowledgeChanges) {
    throw ApiError.validation(`${v.bigChanges.length} rate(s) changed by more than ${v.maxChangePercent}%. Set acknowledgeChanges to publish anyway.`,
      v.bigChanges.map((c) => ({ path: c.itemCode, message: `${c.oldRate} -> ${c.newRate} (${c.changePct}%)` })));
  }
  const { error } = await supabase.rpc('publish_rate_set', { p_set_id: id, p_actor: ctx.actorId });
  if (error) { console.error('[publish]', error.message); throw ApiError.internal('Publishing failed'); }
  // keep the public "illustrative rates" banner coherent with the published set
  await supabase.from('system_settings').upsert({ key: 'rates_verified', value: Boolean(set.is_verified), updated_by: ctx.actorId });
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'rate_set.publish', entity: 'rate_set', entityId: id, before: { status: set.status }, after: { status: 'published', acknowledgedChanges: v.bigChanges.length }, ip: ctx.ip });
  return getSet(id);
}

export async function archive(ctx, id) {
  const set = await getSet(id);
  if (set.status === 'published') throw ApiError.conflict('Publish another rate set first; the active set cannot be archived');
  const row = unwrap(await supabase.from('rate_sets').update({ status: 'archived' }).eq('id', id).select('*').single(), 'rateset.archive');
  await writeAudit({ actorId: ctx.actorId, action: 'rate_set.archive', entity: 'rate_set', entityId: id, before: set, after: row, ip: ctx.ip });
  return row;
}

export async function diff(id, otherId) {
  const [a, b] = await Promise.all([itemsOf(id), itemsOf(otherId)]);
  const A = Object.fromEntries(a.map((i) => [i.item_code, i]));
  const B = Object.fromEntries(b.map((i) => [i.item_code, i]));
  const added = []; const changed = []; const missing = [];
  for (const [c, it] of Object.entries(A)) {
    if (!B[c]) { added.push({ itemCode: c, rate: Number(effective(it)) }); continue; }
    const o = Number(effective(B[c])); const n = Number(effective(it));
    if (o !== n) changed.push({ itemCode: c, oldRate: o, newRate: n, changePct: o ? Math.round(((n - o) / o) * 1000) / 10 : null });
  }
  for (const c of Object.keys(B)) if (!A[c]) missing.push({ itemCode: c, rate: Number(effective(B[c])) });
  return { added, changed, missing };
}

// Admin preview calculator: run any rate set (including drafts) against an input, nothing is saved.
export async function preview(id, input, mode) {
  const { result } = await runEngine(input, { mode, rateSetId: id });
  return result;
}
