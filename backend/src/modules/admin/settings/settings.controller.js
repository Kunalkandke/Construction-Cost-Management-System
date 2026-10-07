import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './settings.service.js';

export const list = asyncHandler(async (req, res) => ok(res, await s.list()));
export const patch = asyncHandler(async (req, res) => ok(res, await s.update(ctxOf(req), req.body.values)));
