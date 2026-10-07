import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { supabase, unwrap } from '../../config/supabase.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { signAccessToken, newRefreshToken, hashRefresh, randomToken, sha256 } from '../../utils/tokens.js';
import { sendPasswordReset } from '../../utils/mailer.js';
import { writeAudit } from '../../middleware/audit.js';
import { invalidateUserCache } from '../../middleware/auth.js';
import { LOCK_AFTER_FAILURES, LOCK_MINUTES, RESET_TOKEN_MINUTES } from '../../config/constants.js';

const GENERIC_LOGIN = 'Invalid email or password';
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 4);
const iso = (ms) => new Date(ms).toISOString();

export const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status, lastLoginAt: u.last_login_at, createdAt: u.created_at });

async function issueSession(user, { ip, userAgent, familyId }) {
  const raw = newRefreshToken();
  const fam = familyId || crypto.randomUUID();
  const row = unwrap(await supabase.from('refresh_tokens').insert({
    user_id: user.id, token_hash: hashRefresh(raw), family_id: fam,
    expires_at: iso(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000), user_agent: (userAgent || '').slice(0, 300), ip,
  }).select('id').single(), 'refresh.insert');
  return { accessToken: signAccessToken(user), refreshToken: raw, refreshId: row.id, user: safeUser(user) };
}

export async function register({ name, email, password, phone }, meta) {
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) throw ApiError.conflict('Unable to create an account with these details');
  const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const { data, error } = await supabase.from('users').insert({ name, email, phone: phone || null, password_hash }).select('*').single();
  if (error) {
    if (error.code === '23505') throw ApiError.conflict('Unable to create an account with these details');
    console.error('[register]', error.message); throw ApiError.internal();
  }
  return issueSession(data, meta);
}

export async function login({ email, password }, meta) {
  const { data: user } = await supabase.from('users').select('*').eq('email', email).is('deleted_at', null).maybeSingle();
  if (!user) { await bcrypt.compare(password, DUMMY_HASH); throw ApiError.unauthenticated(GENERIC_LOGIN); }
  if (user.locked_until && new Date(user.locked_until) > new Date()) throw ApiError.rateLimited('Too many attempts. Try again in a few minutes.');

  const okPw = await bcrypt.compare(password, user.password_hash);
  if (!okPw) {
    const count = user.failed_login_count + 1;
    const patch = count >= LOCK_AFTER_FAILURES ? { failed_login_count: 0, locked_until: iso(Date.now() + LOCK_MINUTES * 60000) } : { failed_login_count: count };
    await supabase.from('users').update(patch).eq('id', user.id);
    if (patch.locked_until) await writeAudit({ actorId: user.id, action: 'auth.account_locked', entity: 'user', entityId: user.id, ip: meta.ip });
    throw ApiError.unauthenticated(GENERIC_LOGIN);
  }
  if (user.status === 'blocked') throw ApiError.forbidden('Account disabled');
  await supabase.from('users').update({ failed_login_count: 0, locked_until: null, last_login_at: iso(Date.now()) }).eq('id', user.id);
  return issueSession(user, meta);
}

// Section 5.3 rotation with reuse detection
export async function refresh(rawToken, meta) {
  if (!rawToken) throw ApiError.unauthenticated();
  const { data: row } = await supabase.from('refresh_tokens').select('*').eq('token_hash', hashRefresh(rawToken)).maybeSingle();
  if (!row) throw ApiError.unauthenticated();
  if (row.revoked_at) {
    if (row.replaced_by) {
      await supabase.from('refresh_tokens').update({ revoked_at: iso(Date.now()) }).eq('family_id', row.family_id).is('revoked_at', null);
      await writeAudit({ actorId: row.user_id, action: 'auth.refresh_reuse_detected', entity: 'user', entityId: row.user_id, ip: meta.ip });
    }
    throw ApiError.unauthenticated();
  }
  if (new Date(row.expires_at) <= new Date()) throw ApiError.unauthenticated();
  const { data: user } = await supabase.from('users').select('*').eq('id', row.user_id).maybeSingle();
  if (!user || user.deleted_at || user.status === 'blocked') {
    await supabase.from('refresh_tokens').update({ revoked_at: iso(Date.now()) }).eq('family_id', row.family_id).is('revoked_at', null);
    throw ApiError.unauthenticated();
  }
  const next = await issueSession(user, { ...meta, familyId: row.family_id });
  await supabase.from('refresh_tokens').update({ revoked_at: iso(Date.now()), replaced_by: next.refreshId }).eq('id', row.id);
  return next;
}

export async function logout(rawToken, all) {
  if (!rawToken) return;
  const { data: row } = await supabase.from('refresh_tokens').select('id, user_id').eq('token_hash', hashRefresh(rawToken)).maybeSingle();
  if (!row) return;
  const q = supabase.from('refresh_tokens').update({ revoked_at: iso(Date.now()) }).is('revoked_at', null);
  await (all ? q.eq('user_id', row.user_id) : q.eq('id', row.id));
}

export async function forgotPassword(email) {
  const { data: user } = await supabase.from('users').select('id, email, status').eq('email', email).is('deleted_at', null).maybeSingle();
  if (!user || user.status === 'blocked') return; // always succeed outwardly: no user enumeration
  await createResetAndMail(user, false);
}

export async function createResetAndMail(user, adminInitiated) {
  const raw = randomToken(32);
  unwrap(await supabase.from('password_resets').insert({ user_id: user.id, token_hash: sha256(raw), expires_at: iso(Date.now() + RESET_TOKEN_MINUTES * 60000) }), 'reset.insert');
  await sendPasswordReset(user.email, `${env.APP_BASE_URL}/reset-password/${raw}`, adminInitiated);
}

export async function resetPassword({ token, newPassword }, meta) {
  const { data: pr } = await supabase.from('password_resets').select('*').eq('token_hash', sha256(token)).is('used_at', null).maybeSingle();
  if (!pr || new Date(pr.expires_at) <= new Date()) throw ApiError.validation('This reset link is invalid or has expired', [{ path: 'token', message: 'Invalid or expired token' }]);
  const password_hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  unwrap(await supabase.from('users').update({ password_hash, failed_login_count: 0, locked_until: null }).eq('id', pr.user_id), 'reset.user');
  await supabase.from('password_resets').update({ used_at: iso(Date.now()) }).eq('id', pr.id);
  await supabase.from('refresh_tokens').update({ revoked_at: iso(Date.now()) }).eq('user_id', pr.user_id).is('revoked_at', null);
  await writeAudit({ actorId: pr.user_id, action: 'auth.password_reset', entity: 'user', entityId: pr.user_id, ip: meta.ip });
}

export async function getMe(id) {
  const u = unwrap(await supabase.from('users').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), 'me');
  if (!u) throw ApiError.notFound('User not found');
  return safeUser(u);
}

export async function updateMe(id, patch) {
  const upd = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.phone !== undefined) upd.phone = patch.phone;
  if (Object.keys(upd).length) unwrap(await supabase.from('users').update(upd).eq('id', id), 'me.update');
  return getMe(id);
}

export async function changePassword(userId, { currentPassword, newPassword }, rawToken, meta) {
  const u = unwrap(await supabase.from('users').select('*').eq('id', userId).maybeSingle(), 'chpw');
  if (!u || !(await bcrypt.compare(currentPassword, u.password_hash))) throw ApiError.validation('Current password is incorrect', [{ path: 'currentPassword', message: 'Incorrect password' }]);
  const password_hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  unwrap(await supabase.from('users').update({ password_hash }).eq('id', userId), 'chpw.update');
  // revoke all other sessions, keep the current one
  let q = supabase.from('refresh_tokens').update({ revoked_at: iso(Date.now()) }).eq('user_id', userId).is('revoked_at', null);
  if (rawToken) q = q.neq('token_hash', hashRefresh(rawToken));
  await q;
  invalidateUserCache(userId);
  await writeAudit({ actorId: userId, action: 'auth.password_changed', entity: 'user', entityId: userId, ip: meta.ip });
}
