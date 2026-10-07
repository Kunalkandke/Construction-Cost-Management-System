import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, clientIp } from '../../utils/format.js';
import { env } from '../../config/env.js';
import { COOKIE_NAME, COOKIE_PATH } from '../../config/constants.js';
import * as svc from './auth.service.js';

const cookieOpts = () => ({
  httpOnly: true, secure: env.isProd || env.COOKIE_SAMESITE === 'none', sameSite: env.COOKIE_SAMESITE, path: COOKIE_PATH,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});
const setCookie = (res, token) => res.cookie(COOKIE_NAME, token, { ...cookieOpts(), maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000 });
const clearCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOpts());
const meta = (req) => ({ ip: clientIp(req), userAgent: req.get('user-agent') });
const session = (res, s, status = 200) => { setCookie(res, s.refreshToken); return ok(res, { user: s.user, accessToken: s.accessToken }, undefined, status); };

export const register = asyncHandler(async (req, res) => session(res, await svc.register(req.body, meta(req)), 201));
export const login = asyncHandler(async (req, res) => session(res, await svc.login(req.body, meta(req))));
export const refresh = asyncHandler(async (req, res) => {
  try { return session(res, await svc.refresh(req.cookies?.[COOKIE_NAME], meta(req))); } catch (e) { clearCookie(res); throw e; }
});
export const logout = asyncHandler(async (req, res) => {
  await svc.logout(req.cookies?.[COOKIE_NAME], Boolean(req.body?.all));
  clearCookie(res);
  res.status(204).end();
});
export const forgot = asyncHandler(async (req, res) => {
  await svc.forgotPassword(req.body.email);
  ok(res, { message: 'If an account exists for this email, a reset link has been sent.' });
});
export const reset = asyncHandler(async (req, res) => { await svc.resetPassword(req.body, meta(req)); ok(res, { message: 'Password updated. Please log in.' }); });
export const me = asyncHandler(async (req, res) => ok(res, await svc.getMe(req.user.id)));
export const patchMe = asyncHandler(async (req, res) => ok(res, await svc.updateMe(req.user.id, req.body)));
export const changePassword = asyncHandler(async (req, res) => {
  await svc.changePassword(req.user.id, req.body, req.cookies?.[COOKIE_NAME], meta(req));
  ok(res, { message: 'Password changed. Other sessions were signed out.' });
});
