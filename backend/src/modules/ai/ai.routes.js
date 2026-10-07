import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/format.js';
import { validate } from '../../middleware/validate.js';
import { authOptional, authRequired } from '../../middleware/auth.js';
import { aiGuestLimiter } from '../../middleware/rateLimit.js';
import { createBody, aiBody, idParams } from '../estimates/estimates.schema.js';
import * as est from '../estimates/estimates.service.js';
import * as ai from './ai.service.js';

// POST /ai/quick-insights
const router = Router();
router.post('/quick-insights', authOptional, aiGuestLimiter, validate({ body: createBody }), asyncHandler(async (req, res) => {
  const { title, mode, ...input } = req.body;
  const { result } = await est.runEngine(input, { mode: mode || 'DETAILED' });
  const out = await ai.generate({ result, userId: req.user?.id || null });
  ok(res, { ...out, grandTotal: result.grandTotal });
}));
export default router;

// Mounted by estimates.routes at /estimates/:id/ai-insights
export const estimateAiRouter = Router({ mergeParams: true });
estimateAiRouter.use(authRequired, validate({ params: idParams }));
estimateAiRouter.post('/', validate({ body: aiBody }), asyncHandler(async (req, res) => {
  const row = await est.getOwned(req.user.id, req.params.id);
  ok(res, await ai.generate({ result: row.results, estimateId: row.id, userId: req.user.id, force: Boolean(req.body.force) }));
}));
estimateAiRouter.get('/', asyncHandler(async (req, res) => {
  await est.getOwned(req.user.id, req.params.id);
  ok(res, await ai.latestFor(req.params.id));
}));
