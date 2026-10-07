import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authRequired, authOptional } from '../../middleware/auth.js';
import { calculateGuestLimiter } from '../../middleware/rateLimit.js';
import { estimateAiRouter } from '../ai/ai.routes.js';
import * as c from './estimates.controller.js';
import * as s from './estimates.schema.js';

const r = Router();
r.post('/calculate', authOptional, calculateGuestLimiter, validate({ query: s.modeQuery, body: s.createBody }), c.calculate);
r.post('/budget-plan', authOptional, calculateGuestLimiter, validate({ body: s.budgetBody }), c.budgetPlan);
r.post('/compare', authRequired, validate({ body: s.compareBody }), c.compare);
r.post('/', authRequired, validate({ body: s.createBody }), c.create);
r.get('/', authRequired, validate({ query: s.listQuery }), c.list);
r.use('/:id/ai-insights', estimateAiRouter);
r.get('/:id', authRequired, validate({ params: s.idParams }), c.get);
r.patch('/:id', authRequired, validate({ params: s.idParams, body: s.patchBody }), c.patch);
r.delete('/:id', authRequired, validate({ params: s.idParams }), c.remove);
r.post('/:id/duplicate', authRequired, validate({ params: s.idParams }), c.duplicate);
r.post('/:id/share', authRequired, validate({ params: s.idParams }), c.share);
r.delete('/:id/share', authRequired, validate({ params: s.idParams }), c.unshare);
r.post('/:id/actuals', authRequired, validate({ params: s.idParams, body: s.actualsBody }), c.addActual);
r.get('/:id/export/pdf', authRequired, validate({ params: s.idParams }), c.exportPdf);
r.get('/:id/export/xlsx', authRequired, validate({ params: s.idParams }), c.exportXlsx);
export default r;

export const sharedRoutes = Router();
sharedRoutes.get('/:token', validate({ params: s.tokenParams }), c.shared);
