import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './users.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.query); ok(res, r.rows, r.meta); });
export const get = asyncHandler(async (req, res) => ok(res, await s.get(req.params.id)));
export const patch = asyncHandler(async (req, res) => ok(res, await s.update(ctxOf(req), req.params.id, req.body)));
export const revoke = asyncHandler(async (req, res) => ok(res, await s.revokeSessions(ctxOf(req), req.params.id)));
export const reset = asyncHandler(async (req, res) => ok(res, await s.resetPassword(ctxOf(req), req.params.id)));
export const remove = asyncHandler(async (req, res) => ok(res, await s.softDelete(ctxOf(req), req.params.id)));
