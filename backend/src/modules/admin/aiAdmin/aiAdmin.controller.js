import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf } from '../crud.js';
import * as s from './aiAdmin.service.js';

export const prompts = asyncHandler(async (req, res) => ok(res, await s.listPrompts(req.query.key)));
export const createPrompt = asyncHandler(async (req, res) => ok(res, await s.createPrompt(ctxOf(req), req.body), undefined, 201));
export const activate = asyncHandler(async (req, res) => ok(res, await s.activatePrompt(ctxOf(req), req.params.id)));
export const test = asyncHandler(async (req, res) => ok(res, await s.runTest(req.params.id, req.body.estimateId)));
export const usage = asyncHandler(async (req, res) => ok(res, await s.usage(req.query.range)));
export const settings = asyncHandler(async (req, res) => ok(res, await s.getAiSettings()));
export const patchSettings = asyncHandler(async (req, res) => ok(res, await s.patchAiSettings(ctxOf(req), req.body)));
