import { supabase, unwrap, fetchAll } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { parsePaging, pageMeta } from '../../../utils/format.js';
import { toCsv } from '../../../utils/csv.js';
import { writeAudit } from '../../../middleware/audit.js';

function filtered(query, q) {
  if (q.actorId) query = query.eq('actor_id', q.actorId);
  if (q.entity) query = query.eq('entity', q.entity);
  if (q.action) query = query.ilike('action', `%${q.action.replace(/[%_,]/g, '')}%`);
  if (q.from) query = query.gte('created_at', `${q.from}T00:00:00Z`);
  if (q.to) query = query.lte('created_at', `${q.to}T23:59:59Z`);
  return query;
}
export async function list(q) {
  const p = parsePaging(q, ['created_at', 'action', 'entity']);
  const { data, error, count } = await filtered(supabase.from('audit_logs').select('*', { count: 'exact' }), q).order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) throw ApiError.internal();
  const ids = [...new Set(data.map((r) => r.actor_id).filter(Boolean))];
  const users = ids.length ? unwrap(await supabase.from('users').select('id,name,email').in('id', ids), 'audit.users') : [];
  return { rows: data.map((r) => ({ ...r, actor: users.find((u) => u.id === r.actor_id) || null })), meta: pageMeta(p, count) };
}
export async function exportCsv(ctx, q) {
  const rows = await fetchAll(() => filtered(supabase.from('audit_logs').select('*').order('created_at', { ascending: false }), q), 20000);
  await writeAudit({ actorId: ctx.actorId, action: 'audit.export', entity: 'audit_logs', after: { rows: rows.length }, ip: ctx.ip });
  return toCsv(rows, ['created_at', 'actor_id', 'action', 'entity', 'entity_id', 'before', 'after', 'ip']);
}
