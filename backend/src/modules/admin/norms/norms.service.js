import { supabase, unwrap } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { toSnake, parsePaging, pageMeta } from '../../../utils/format.js';
import { writeAudit } from '../../../middleware/audit.js';
import { invalidateCaches } from '../../estimates/estimates.data.js';
import { safeLike } from '../crud.js';

const find = async (id) => {
  const r = unwrap(await supabase.from('consumption_norms').select('*').eq('id', id).maybeSingle(), 'norm.get');
  if (!r) throw ApiError.notFound('Norm not found');
  return r;
};
export async function list(q) {
  const p = parsePaging(q, ['key', 'category', 'created_at']);
  let query = supabase.from('consumption_norms').select('*', { count: 'exact' });
  if (q.category) query = query.eq('category', q.category);
  if (q.q) query = query.or(`key.ilike.%${safeLike(q.q)}%,description.ilike.%${safeLike(q.q)}%`);
  const { data, error, count } = await query.order(q.sort ? p.sortField : 'key', { ascending: q.sort ? p.ascending : true }).range(p.from, p.to);
  if (error) throw ApiError.internal();
  return { rows: data, meta: pageMeta(p, count) };
}
export const get = find;
export async function create(ctx, body) {
  const row = unwrap(await supabase.from('consumption_norms').insert(toSnake(body)).select('*').single(), 'norm.create');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'norm.create', entity: 'consumption_norm', entityId: row.id, after: row, ip: ctx.ip });
  return row;
}
// every edit bumps the version so calibrated norms are traceable
export async function update(ctx, id, patch) {
  const before = await find(id);
  const row = unwrap(await supabase.from('consumption_norms').update({ ...toSnake(patch), version: before.version + 1 }).eq('id', id).select('*').single(), 'norm.update');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'norm.update', entity: 'consumption_norm', entityId: id, before, after: row, ip: ctx.ip });
  return row;
}
export async function remove(ctx, id) {
  const before = await find(id);
  unwrap(await supabase.from('consumption_norms').delete().eq('id', id), 'norm.delete');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'norm.delete', entity: 'consumption_norm', entityId: id, before, ip: ctx.ip });
}
