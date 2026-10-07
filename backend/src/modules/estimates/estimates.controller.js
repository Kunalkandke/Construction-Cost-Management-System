import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/format.js';
import { supabase } from '../../config/supabase.js';
import * as svc from './estimates.service.js';
import { buildEstimatePdf, exportFilename } from '../exports/pdf.service.js';
import { buildEstimateXlsx } from '../exports/xlsx.service.js';

export const calculate = asyncHandler(async (req, res) => {
  const { title, mode, ...input } = req.body;
  ok(res, await svc.calculateOnly(input, req.query.mode));
});
export const create = asyncHandler(async (req, res) => ok(res, await svc.create(req.user.id, req.body), undefined, 201));
export const list = asyncHandler(async (req, res) => { const r = await svc.list(req.user.id, req.query); ok(res, r.rows, r.meta); });
export const get = asyncHandler(async (req, res) => ok(res, await svc.getOwned(req.user.id, req.params.id)));
export const patch = asyncHandler(async (req, res) => ok(res, await svc.update(req.user.id, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await svc.softDelete(req.user.id, req.params.id); res.status(204).end(); });
export const duplicate = asyncHandler(async (req, res) => ok(res, await svc.duplicate(req.user.id, req.params.id), undefined, 201));
export const share = asyncHandler(async (req, res) => ok(res, await svc.share(req.user.id, req.params.id)));
export const unshare = asyncHandler(async (req, res) => { await svc.unshare(req.user.id, req.params.id); res.status(204).end(); });
export const shared = asyncHandler(async (req, res) => ok(res, await svc.getShared(req.params.token)));
export const compare = asyncHandler(async (req, res) => ok(res, await svc.compare(req.user.id, req.body.ids)));
export const budgetPlan = asyncHandler(async (req, res) => ok(res, await svc.budgetPlanner(req.body)));
export const addActual = asyncHandler(async (req, res) => ok(res, await svc.addActual(req.user.id, req.params.id, req.body), undefined, 201));

async function latestInsight(estimateId) {
  const { data } = await supabase.from('ai_insights').select('content,status').eq('estimate_id', estimateId).in('status', ['ok', 'fallback']).not('content', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}
export const exportPdf = asyncHandler(async (req, res) => {
  const est = await svc.getOwned(req.user.id, req.params.id);
  const buf = await buildEstimatePdf(est, await latestInsight(est.id));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(est, 'pdf')}"`);
  res.send(buf);
});
export const exportXlsx = asyncHandler(async (req, res) => {
  const est = await svc.getOwned(req.user.id, req.params.id);
  const buf = await buildEstimateXlsx(est);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(est, 'xlsx')}"`);
  res.send(buf);
});
