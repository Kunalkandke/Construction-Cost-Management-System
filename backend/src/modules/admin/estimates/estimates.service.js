import { supabase, unwrap, fetchAll } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { parsePaging, pageMeta } from '../../../utils/format.js';
import { toCsv } from '../../../utils/csv.js';
import { writeAudit } from '../../../middleware/audit.js';
import { runEngine } from '../../estimates/estimates.service.js';

const SUMMARY = 'id,user_id,title,mode,grand_total,cost_per_sqft,total_area_sqm,location_id,rate_set_id,engine_version,created_at,inputs';
function filtered(query, q) {
  query = query.is('deleted_at', null);
  if (q.q) query = query.ilike('title', `%${q.q.replace(/[%_,]/g, '')}%`);
  if (q.userId) query = query.eq('user_id', q.userId);
  if (q.houseType) query = query.eq('inputs->>houseType', q.houseType);
  if (q.tier) query = query.eq('inputs->>qualityTier', q.tier);
  if (q.locationId) query = query.eq('location_id', q.locationId);
  if (q.from) query = query.gte('created_at', `${q.from}T00:00:00Z`);
  if (q.to) query = query.lte('created_at', `${q.to}T23:59:59Z`);
  if (q.minAmount !== undefined) query = query.gte('grand_total', q.minAmount);
  if (q.maxAmount !== undefined) query = query.lte('grand_total', q.maxAmount);
  return query;
}

export async function list(q) {
  const p = parsePaging(q, ['created_at', 'grand_total', 'cost_per_sqft', 'title']);
  const { data, error, count } = await filtered(supabase.from('estimates').select(SUMMARY, { count: 'exact' }), q).order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) { console.error('[admin.estimates]', error.message); throw ApiError.internal(); }
  const uids = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
  const users = uids.length ? unwrap(await supabase.from('users').select('id,name,email').in('id', uids), 'admin.est.users') : [];
  return { rows: data.map((r) => ({ ...r, user: users.find((u) => u.id === r.user_id) || null })), meta: pageMeta(p, count) };
}

export async function get(id) {
  const row = unwrap(await supabase.from('estimates').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), 'admin.est.get');
  if (!row) throw ApiError.notFound('Estimate not found');
  const user = row.user_id ? unwrap(await supabase.from('users').select('id,name,email').eq('id', row.user_id).maybeSingle(), 'admin.est.user') : null;
  return { ...row, user };
}

export async function remove(ctx, id) {
  const before = await get(id);
  unwrap(await supabase.from('estimates').update({ deleted_at: new Date().toISOString(), is_shared: false, share_token: null }).eq('id', id), 'admin.est.delete');
  await writeAudit({ actorId: ctx.actorId, action: 'estimate.delete', entity: 'estimate', entityId: id, before: { title: before.title, grand_total: before.grand_total }, ip: ctx.ip });
}

export async function exportCsv(q) {
  const rows = await fetchAll(() => filtered(supabase.from('estimates').select(SUMMARY).order('created_at', { ascending: false }), q), 20000);
  return toCsv(rows.map((r) => ({ ...r, houseType: r.inputs?.houseType, floors: r.inputs?.floors, bhk: r.inputs?.bhk, tier: r.inputs?.qualityTier })),
    ['id', 'created_at', 'title', 'user_id', 'mode', 'houseType', 'floors', 'bhk', 'tier', 'total_area_sqm', 'grand_total', 'cost_per_sqft', 'location_id', 'rate_set_id', 'engine_version']);
}

// Preview: recompute a stored estimate's inputs with any rate set (including drafts). Nothing is saved.
export async function recalcPreview(id, rateSetId) {
  const row = await get(id);
  const { result } = await runEngine({ ...row.inputs, startMonth: undefined }, { mode: row.mode, rateSetId });
  return { previous: { grandTotal: Number(row.grand_total), costPerSqft: Number(row.cost_per_sqft) }, preview: result, difference: result.grandTotal - Number(row.grand_total) };
}
