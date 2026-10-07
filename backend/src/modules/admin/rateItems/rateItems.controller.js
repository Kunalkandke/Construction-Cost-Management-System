import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ctxOf } from '../crud.js';
import * as s from './rateItems.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.params.id, req.query); ok(res, r.rows, r.meta); });
export const create = asyncHandler(async (req, res) => ok(res, await s.create(ctxOf(req), req.params.id, req.body), undefined, 201));
export const patch = asyncHandler(async (req, res) => ok(res, await s.update(ctxOf(req), req.params.itemId, req.body)));
export const remove = asyncHandler(async (req, res) => { await s.remove(ctxOf(req), req.params.itemId); res.status(204).end(); });
export const importCsv = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.validation('Upload a CSV file in the "file" field');
  ok(res, await s.importCsv(ctxOf(req), req.params.id, req.file.buffer, { dryRun: req.query.dryRun }));
});
export const exportCsv = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="rate-items.csv"');
  res.send(await s.exportCsv(req.params.id));
});
