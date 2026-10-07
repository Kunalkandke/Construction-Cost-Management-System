import { supabase, unwrap } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { parsePaging, pageMeta } from '../../../utils/format.js';
import { writeAudit } from '../../../middleware/audit.js';
import { invalidateUserCache } from '../../../middleware/auth.js';
import { createResetAndMail } from '../../auth/auth.service.js';
import { safeLike } from '../crud.js';

const COLS = 'id,name,email,phone,role,status,last_login_at,created_at,deleted_at';
const isSuper = (ctx) => ctx.role === 'super_admin';

async function target(id) {
  const u = unwrap(await supabase.from('users').select(COLS).eq('id', id).is('deleted_at', null).maybeSingle(), 'user.get');
  if (!u) throw ApiError.notFound('User not found');
  return u;
}
// An admin cannot touch a super_admin or another admin; only super_admin can.
function guardTarget(ctx, u) {
  if (u.id !== ctx.actorId && u.role !== 'user' && !isSuper(ctx)) throw ApiError.forbidden('Only a super admin can modify admins');
}
async function activeSuperCount() {
  const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('status', 'active').is('deleted_at', null);
  return count || 0;
}

export async function list(q) {
  const p = parsePaging(q, ['created_at', 'name', 'email', 'last_login_at']);
  let query = supabase.from('users').select(COLS, { count: 'exact' }).is('deleted_at', null);
  if (q.q) query = query.or(`name.ilike.%${safeLike(q.q)}%,email.ilike.%${safeLike(q.q)}%`);
  if (q.role) query = query.eq('role', q.role);
  if (q.status) query = query.eq('status', q.status);
  const { data, error, count } = await query.order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) { console.error('[users.list]', error.message); throw ApiError.internal(); }
  const ids = data.map((u) => u.id);
  const counts = {};
  if (ids.length) {
    const rows = unwrap(await supabase.from('estimates').select('user_id').in('user_id', ids).is('deleted_at', null).limit(10000), 'users.counts');
    rows.forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
  }
  return { rows: data.map((u) => ({ ...u, estimate_count: counts[u.id] || 0 })), meta: pageMeta(p, count) };
}

export async function get(id) {
  const u = await target(id);
  const recent = unwrap(await supabase.from('estimates').select('id,title,grand_total,created_at').eq('user_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(5), 'user.recent');
  const { count } = await supabase.from('refresh_tokens').select('id', { count: 'exact', head: true }).eq('user_id', id).is('revoked_at', null).gt('expires_at', new Date().toISOString());
  return { ...u, recent_estimates: recent, active_sessions: count || 0 };
}

export async function update(ctx, id, patch) {
  const before = await target(id);
  guardTarget(ctx, before);
  if (patch.role !== undefined && !isSuper(ctx)) throw ApiError.forbidden('Only a super admin can change roles');
  if (id === ctx.actorId && (patch.status === 'blocked' || (patch.role && patch.role !== before.role))) throw ApiError.conflict('You cannot block or change the role of your own account');
  const demoting = before.role === 'super_admin' && ((patch.role && patch.role !== 'super_admin') || patch.status === 'blocked');
  if (demoting && (await activeSuperCount()) <= 1) throw ApiError.conflict('The last remaining super admin cannot be demoted or blocked');
  const row = unwrap(await supabase.from('users').update(patch).eq('id', id).select(COLS).single(), 'user.update');
  if (patch.status === 'blocked') await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', id).is('revoked_at', null);
  invalidateUserCache(id);
  await writeAudit({ actorId: ctx.actorId, action: 'user.update', entity: 'user', entityId: id, before, after: row, ip: ctx.ip });
  return row;
}

export async function revokeSessions(ctx, id) {
  const u = await target(id); guardTarget(ctx, u);
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', id).is('revoked_at', null);
  invalidateUserCache(id);
  await writeAudit({ actorId: ctx.actorId, action: 'user.revoke_sessions', entity: 'user', entityId: id, ip: ctx.ip });
  return { revoked: true };
}

export async function resetPassword(ctx, id) {
  const u = await target(id); guardTarget(ctx, u);
  await createResetAndMail({ id: u.id, email: u.email }, true);
  await writeAudit({ actorId: ctx.actorId, action: 'user.admin_reset_password', entity: 'user', entityId: id, ip: ctx.ip });
  return { sent: true };
}

// Soft delete (super admin only). Estimates are anonymised (kept, detached from the user).
export async function softDelete(ctx, id) {
  const u = await target(id);
  if (id === ctx.actorId) throw ApiError.conflict('You cannot delete your own account');
  if (u.role === 'super_admin' && (await activeSuperCount()) <= 1) throw ApiError.conflict('The last remaining super admin cannot be removed');
  unwrap(await supabase.from('users').update({ deleted_at: new Date().toISOString(), status: 'blocked', name: 'Deleted user', email: `deleted+${id}@invalid.local`, phone: null }).eq('id', id), 'user.delete');
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', id).is('revoked_at', null);
  await supabase.from('estimates').update({ user_id: null, is_shared: false, share_token: null }).eq('user_id', id);
  invalidateUserCache(id);
  await writeAudit({ actorId: ctx.actorId, action: 'user.delete', entity: 'user', entityId: id, before: u, ip: ctx.ip });
  return { deleted: true };
}
