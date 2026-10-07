import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ENGINE_VERSION } from '../../../config/constants.js';
import { env } from '../../../config/env.js';
import { aiConfigured } from '../../ai/ai.service.js';
import * as s from './dashboard.service.js';

export const stats = asyncHandler(async (req, res) => ok(res, await s.stats(req.query.range)));
export const health = asyncHandler(async (req, res) => {
  const h = await s.health();
  ok(res, { status: h.db ? 'ok' : 'degraded', version: ENGINE_VERSION, env: env.NODE_ENV, db: h.db, ai: { configured: aiConfigured(), model: env.GEMINI_MODEL }, mail: { configured: env.smtpConfigured }, activeRateSet: h.activeRateSet });
});
