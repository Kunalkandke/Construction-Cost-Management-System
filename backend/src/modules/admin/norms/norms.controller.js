import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './norms.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.query); ok(res, r.rows, r.meta); });
export const get = asyncHandler(async (req, res) => ok(res, await s.get(req.params.id)));
export const create = asyncHandler(async (req, res) => ok(res, await s.create(ctxOf(req), req.body), undefined, 201));
export const patch = asyncHandler(async (req, res) => ok(res, await s.update(ctxOf(req), req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await s.remove(ctxOf(req), req.params.id); res.status(204).end(); });
