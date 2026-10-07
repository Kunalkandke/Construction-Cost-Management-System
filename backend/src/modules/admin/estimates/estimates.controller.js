import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './estimates.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.query); ok(res, r.rows, r.meta); });
export const get = asyncHandler(async (req, res) => ok(res, await s.get(req.params.id)));
export const remove = asyncHandler(async (req, res) => { await s.remove(ctxOf(req), req.params.id); res.status(204).end(); });
export const recalc = asyncHandler(async (req, res) => ok(res, await s.recalcPreview(req.params.id, req.query.rateSetId)));
export const exportCsv = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ccms-estimates.csv"');
  res.send(await s.exportCsv(req.query));
});
