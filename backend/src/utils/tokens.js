import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Refresh tokens are stored as HMAC-SHA256 (keyed with JWT_REFRESH_SECRET), never in clear.
export const hashRefresh = (s) => crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(s).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const newRefreshToken = () => randomToken(48);
export const newShareToken = () => crypto.randomBytes(18).toString('base64url'); // 24 url-safe chars

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL,
    jwtid: crypto.randomUUID(),
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  } catch (e) {
    if (e.name === 'TokenExpiredError') throw ApiError.tokenExpired();
    throw ApiError.unauthenticated('Invalid token');
  }
}
