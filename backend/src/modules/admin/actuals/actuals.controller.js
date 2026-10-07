import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './actuals.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.query); ok(res, r.rows, r.meta); });
export const verify = asyncHandler(async (req, res) => ok(res, await s.verify(ctxOf(req), req.params.id, req.body.verified)));
export const calibration = asyncHandler(async (req, res) => ok(res, await s.calibration()));
export const apply = asyncHandler(async (req, res) => ok(res, await s.applyNormFactor(ctxOf(req), req.body)));
