import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';
import { getSettings } from '../modules/estimates/estimates.data.js';

const base = { standardHeaders: true, legacyHeaders: false, validate: false };
const handler = (message) => (req, res, next) => next(ApiError.rateLimited(message));
const min = 60 * 1000;

export const globalLimiter = rateLimit({ ...base, windowMs: 15 * min, limit: 300, handler: handler() });
export const authLimiter = rateLimit({
  ...base, windowMs: 15 * min, limit: 10,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  handler: handler('Too many attempts. Try again in a few minutes.'),
});
export const calculateGuestLimiter = rateLimit({ ...base, windowMs: 60 * min, limit: 30, skip: (req) => Boolean(req.user), handler: handler('Guest estimate limit reached. Create a free account to continue.') });
export const contactLimiter = rateLimit({ ...base, windowMs: 60 * min, limit: 5, handler: handler('Too many messages. Please try again later.') });
export const aiGuestLimiter = rateLimit({
  ...base, windowMs: 24 * 60 * min, skip: (req) => Boolean(req.user),
  limit: async () => Number((await getSettings()).ai_daily_limit_guest ?? 3),
  handler: handler('Daily AI insight limit reached for guests. Log in for more.'),
});
