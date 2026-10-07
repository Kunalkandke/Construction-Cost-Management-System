import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './rateSets.service.js';

export const list = asyncHandler(async (req, res) => { const r = await s.list(req.query); ok(res, r.rows, r.meta); });
export const get = asyncHandler(async (req, res) => ok(res, await s.get(req.params.id)));
export const create = asyncHandler(async (req, res) => ok(res, await s.create(ctxOf(req), req.body), undefined, 201));
export const patch = asyncHandler(async (req, res) => ok(res, await s.update(ctxOf(req), req.params.id, req.body)));
export const clone = asyncHandler(async (req, res) => ok(res, await s.clone(ctxOf(req), req.params.id), undefined, 201));
export const publish = asyncHandler(async (req, res) => ok(res, await s.publish(ctxOf(req), req.params.id, req.body)));
export const archive = asyncHandler(async (req, res) => ok(res, await s.archive(ctxOf(req), req.params.id)));
export const diff = asyncHandler(async (req, res) => ok(res, await s.diff(req.params.id, req.params.otherId)));
export const preview = asyncHandler(async (req, res) => ok(res, await s.preview(req.params.id, req.body.input, req.body.mode)));
