import { D, round, sumD, Decimal } from '../../../utils/money.js';
import { CATEGORY_LABELS, CATEGORY_ORDER, QUICK_CATEGORIES, SQM_TO_SQFT, FLOOR_LABELS, FLOOR_NAMES, BOQ_CATALOGUE } from '../../../config/constants.js';
import { buildContext, requireSetting } from './ctx.js';
import { deriveValues } from './derive.js';
import { makeResolver } from './rates.js';
import { buildQuickLines } from './quick.js';
import { buildDetailedLines, buildAddonLines } from './detailed.js';

// One deterministic pricing pass. Used by calculate(), tier comparison, sensitivity and the budget planner.
// inp must already be normalised. ov = sensitivity overrides.
export function runCore(inp, master, rates, settings, { mode = 'DETAILED', ov = {} } = {}) {
  const ctx = buildContext(inp, master, settings);
  const { d, warnings } = deriveValues(ctx);
  ctx.d = d;
  const resolve = makeResolver(ctx, rates, ov);
  const labourByCat = mode === 'QUICK' ? requireSetting(settings, 'labour_pct_by_category') : null;

  const raw = [...(mode === 'QUICK' ? buildQuickLines(ctx) : buildDetailedLines(ctx)), ...buildAddonLines(ctx)];
  const lines = [];
  for (const ln of raw) {
    if (ln.qty.lte(0)) continue;
    const labourPct = labourByCat ? (labourByCat[ln.category] ?? 0) : undefined;
    const r = resolve(ln.code, { group: ln.group, labourPct, category: ln.category });
    const rate = r.rate;
    if (mode === 'QUICK' && rate.isZero() && !ln.code.startsWith('ADD_')) continue;
    const amount = round(ln.qty.times(rate), 0);
    const labourAmount = round(amount.times(r.labourPct).div(100), 0);
    lines.push({
      category: ln.category, itemCode: ln.code,
      description: ln.desc || r.item.description || BOQ_CATALOGUE[ln.code]?.category,
      unit: r.item.unit, qty: ln.qty, rate, amount, labourAmount, source: r.source, fallback: r.fallback,
      floorLabel: FLOOR_LABELS[ln.tag], group: r.group, labourPct: D(r.labourPct),
    });
  }

  const order = mode === 'QUICK' ? QUICK_CATEGORIES : CATEGORY_ORDER;
  const categories = order
    .map((key) => {
      const ls = lines.filter((l) => l.category === key);
      return { key, label: CATEGORY_LABELS[key], amount: sumD(ls.map((l) => l.amount)), labourAmount: sumD(ls.map((l) => l.labourAmount)), count: ls.length };
    })
    .filter((c) => c.count > 0 || mode === 'QUICK');

  const subtotal = sumD(categories.map((c) => c.amount));
  const contingency = round(subtotal.times(requireSetting(settings, 'contingency_percent')).div(100), 0);
  const softCosts = inp.includeSoftCosts ? round(subtotal.times(requireSetting(settings, 'soft_cost_percent')).div(100), 0) : D(0);
  const gstOn = inp.includeGst && requireSetting(settings, 'gst_enabled') === true;
  const gst = gstOn ? round(subtotal.plus(contingency).times(requireSetting(settings, 'gst_percent')).div(100), 0) : D(0);
  const grandTotal = subtotal.plus(contingency).plus(softCosts).plus(gst);
  const costPerSqft = round(grandTotal.div(d.At.times(SQM_TO_SQFT)), 0);
  const fallbackLines = lines.filter((l) => l.fallback);

  return {
    ctx, d, warnings, lines, categories, subtotal, contingency, softCosts, gst, grandTotal, costPerSqft,
    fallbackItemCount: new Set(fallbackLines.map((l) => l.itemCode)).size,
    fallbackAmount: sumD(fallbackLines.map((l) => l.amount)),
    labourTotal: sumD(lines.map((l) => l.labourAmount)),
    gstApplied: gstOn,
  };
}

// Section 7.11
export function floorSplit(lines, floorCount) {
  const sum = (label) => sumD(lines.filter((l) => l.floorLabel === label).map((l) => l.amount));
  const site = sum(FLOOR_LABELS.SITE);
  const each = sum(FLOOR_LABELS.EACH);
  const top = sum(FLOOR_LABELS.TOP);
  const ext = sum(FLOOR_LABELS.EXT);
  const per = round(each.div(floorCount), 0);
  const out = [];
  if (site.gt(0)) out.push({ label: FLOOR_LABELS.SITE, amount: site });
  for (let i = 0; i < floorCount; i += 1) {
    const isTop = i === floorCount - 1;
    const amt = isTop ? each.minus(per.times(floorCount - 1)).plus(top) : per; // residual + roof lines to top floor
    out.push({ label: FLOOR_NAMES[i], amount: amt });
  }
  if (ext.gt(0)) out.push({ label: FLOOR_LABELS.EXT, amount: ext });
  return out;
}

export { Decimal };
