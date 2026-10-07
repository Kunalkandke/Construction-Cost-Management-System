import { supabase } from '../config/supabase.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { USER_CACHE_MS } from '../config/constants.js';

const cache = new Map(); // id -> { at, user }
export const invalidateUserCache = (id) => (id ? cache.delete(id) : cache.clear());

async function loadUser(id) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < USER_CACHE_MS) return hit.user;
  const { data, error } = await supabase.from('users').select('id, role, status, deleted_at').eq('id', id).maybeSingle();
  if (error) throw ApiError.internal();
  cache.set(id, { at: Date.now(), user: data });
  return data;
}

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
};

async function attach(req, token) {
  const payload = verifyAccessToken(token);
  const u = await loadUser(payload.sub);
  if (!u || u.deleted_at) throw ApiError.unauthenticated('Account not found');
  if (u.status === 'blocked') throw ApiError.forbidden('Account disabled');
  req.user = { id: u.id, role: u.role }; // role always comes from the DB, not the token
}

export const authRequired = asyncHandler(async (req, res, next) => {
  const token = bearer(req);
  if (!token) throw ApiError.unauthenticated();
  await attach(req, token);
  next();
});

// Guests allowed. An expired token still surfaces TOKEN_EXPIRED so the client can refresh; any other bad token = guest.
export const authOptional = asyncHandler(async (req, res, next) => {
  const token = bearer(req);
  if (token) {
    try { await attach(req, token); } catch (e) { if (e.code === 'TOKEN_EXPIRED') throw e; }
  }
  next();
});
