import { round } from '../../../utils/money.js';
import { ENGINE_VERSION } from '../../../config/constants.js';
import { TIERS } from '../../../config/constants.js';
import { requireSetting } from './ctx.js';
import { parseInput, normaliseInput } from './inputs.js';
import { publicDerived } from './derive.js';
import { runCore, floorSplit } from './core.js';
import { materialTakeoff, labourSummary } from './materials.js';
import { buildSchedule } from './schedule.js';
import { buildPrediction, accuracyBand, benchmark } from './predict.js';
import { buildSensitivity } from './sensitivity.js';

export { budgetPlan } from './budget.js';
export { ENGINE_VERSION };

const n = (d) => d.toNumber();
const pct1 = (a, total) => (total.gt(0) ? round(a.div(total).times(100), 1).toNumber() : 0);

/**
 * Pure, deterministic engine (Section 7). No DB, no network.
 * calculate(input, master, rates, settings, history, today, { mode }) -> result
 */
export function calculate(rawInput, master, rates, settings, history = [], today = new Date(), options = {}) {
  const mode = options.mode || 'DETAILED';
  const inp = normaliseInput(parseInput(rawInput), master, settings, today);
  const base = runCore(inp, master, rates, settings, { mode });
  const { ctx, d } = base;

  const warnings = [...base.warnings];
  if (base.fallbackItemCount > 0) warnings.push({ code: 'FALLBACK_RATES_USED', message: 'Some rates come from CPWD DSR (corrected for lead/lift). Ask for local quotations.' });
  if (!rates.rateSet.is_verified) warnings.push({ code: 'RATES_UNVERIFIED', message: 'Rates are illustrative and not yet verified against the current SSR.' });

  const schedule = buildSchedule(ctx, base.grandTotal, inp.startMonth);
  const prediction = buildPrediction({ lines: base.lines, subtotal: base.subtotal, grandTotal: base.grandTotal, schedule, history, settings, rateSet: rates.rateSet, startMonth: inp.startMonth });
  const band = accuracyBand({
    grandTotal: base.grandTotal, subtotal: base.subtotal, fallbackAmount: base.fallbackAmount,
    rateSetVerified: Boolean(rates.rateSet.is_verified), settings, verifiedCount: master.verifiedActualsCount || 0,
  });

  const tierComparison = TIERS.filter((t) => master.tiers.some((x) => x.code === t)).map((t) => {
    const r = t === inp.qualityTier ? base : runCore({ ...inp, qualityTier: t }, master, rates, settings, { mode });
    return { tier: t, grandTotal: n(r.grandTotal), costPerSqft: n(r.costPerSqft) };
  });

  return {
    engineVersion: ENGINE_VERSION,
    mode,
    inputs: inp,
    derived: publicDerived(d, warnings),
    categories: base.categories.map((c) => ({ key: c.key, label: c.label, amount: n(c.amount), sharePct: pct1(c.amount, base.subtotal), labourAmount: n(c.labourAmount) })),
    lineItems: base.lines.map((l) => ({
      category: l.category, itemCode: l.itemCode, description: l.description, unit: l.unit,
      quantity: n(l.qty), rate: n(l.rate), amount: n(l.amount), labourAmount: n(l.labourAmount),
      source: l.source, floorLabel: l.floorLabel,
    })),
    subtotal: n(base.subtotal),
    contingencyPercent: requireSetting(settings, 'contingency_percent'),
    contingency: n(base.contingency),
    softCosts: n(base.softCosts),
    gst: n(base.gst),
    grandTotal: n(base.grandTotal),
    costPerSqft: n(base.costPerSqft),
    range: { min: band.min, max: band.max, bandPercent: band.bandPercent },
    floorSplit: floorSplit(base.lines, d.floorCount).map((f) => ({ label: f.label, amount: n(f.amount) })),
    materials: mode === 'QUICK' ? [] : materialTakeoff(base.lines, master.materialCoefficients),
    labour: labourSummary(base.lines, base.subtotal, settings),
    schedule: {
      durationMonths: schedule.durationMonths,
      stages: schedule.stages.map((s) => ({ name: s.name, startMonth: s.startMonth, endMonth: s.endMonth, pct: s.pct, amount: n(s.amount) })),
      cashFlow: schedule.cashFlow.map((c) => ({ month: c.month, label: c.label, amount: n(c.amount), cumulative: n(c.cumulative) })),
    },
    prediction,
    sensitivity: buildSensitivity(inp, master, rates, settings, base, mode),
    tierComparison,
    benchmark: benchmark(base.costPerSqft, ctx.tierRow),
    ratesUsed: {
      rateSetId: rates.rateSet.id, rateSetName: rates.rateSet.name, fiscalYear: rates.rateSet.fiscal_year,
      verified: Boolean(rates.rateSet.is_verified), fallbackItemCount: base.fallbackItemCount,
    },
    disclaimer: requireSetting(settings, 'disclaimer_text'),
  };
}
