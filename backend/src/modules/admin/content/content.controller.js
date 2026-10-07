import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/format.js';
import { ctxOf, makeCrudRouter } from '../crud.js';
import * as svc from './content.service.js';
import * as sch from './content.schema.js';

export const faqRouter = makeCrudRouter(svc.faqs, sch.faq);
export const announcementRouter = makeCrudRouter(svc.announcements, sch.announcement);
export const listMessages = asyncHandler(async (req, res) => { const r = await svc.listMessages(req.query); ok(res, r.rows, r.meta); });
export const updateMessage = asyncHandler(async (req, res) => ok(res, await svc.updateMessage(ctxOf(req), req.params.id, req.body)));
