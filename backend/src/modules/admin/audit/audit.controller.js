import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './audit.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.query); ok(res, r.rows, r.meta); });
export const exportCsv = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ccms-audit-logs.csv"');
  res.send(await s.exportCsv(ctxOf(req), req.query));
});
