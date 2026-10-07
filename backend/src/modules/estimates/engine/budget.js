import { D, round, Decimal } from '../../../utils/money.js';
import { SQM_TO_SQFT, TIERS } from '../../../config/constants.js';
import { requireSetting } from './ctx.js';
import { runCore } from './core.js';
import { parseInput, normaliseInput } from './inputs.js';

// Section 7.10: reverse estimate by binary search over per-floor area, always using the real engine.
export function budgetPlan(params, master, rates, settings, today = new Date(), options = {}) {
  const mode = options.mode || 'DETAILED';
  const budget = D(params.budget);
  const lim = requireSetting(settings, 'area_limits_sqm');
  const cfg = requireSetting(settings, 'budget_planner_config');
  const base = normaliseInput(
    parseInput({
      houseType: params.houseType, floors: params.floors, bhk: params.bhk, bhkMode: params.bhkMode || 'WHOLE_HOUSE',
      builtUpAreaSqm: lim.min, areaBasis: 'PER_FLOOR', qualityTier: 'STANDARD', locationId: params.locationId,
      structureType: params.structureType || 'RCC_FRAME', addons: params.addons || [],
    }),
    master, settings, today,
  );
  const tiers = params.tiers && params.tiers.length ? params.tiers : TIERS;
  const tol = D(cfg.tolerancePct).div(100);

  return tiers.map((tier) => {
    const run = (area) => runCore({ ...base, qualityTier: tier, builtUpAreaSqm: area }, master, rates, settings, { mode });
    const atMin = run(lim.min);
    if (atMin.grandTotal.gt(budget)) {
      return { tier, feasible: false, minimumCost: atMin.grandTotal.toNumber(), minimumAreaSqm: lim.min };
    }
    let best = { area: lim.min, r: atMin };
    const atMax = run(lim.max);
    if (atMax.grandTotal.lte(budget)) best = { area: lim.max, r: atMax };
    else {
      let lo = lim.min;
      let hi = lim.max;
      for (let i = 0; i < cfg.maxIterations; i += 1) {
        const mid = round(D(lo).plus(hi).div(2), 2).toNumber();
        const r = run(mid);
        if (r.grandTotal.lte(budget)) best = { area: mid, r };
        if (r.grandTotal.minus(budget).abs().lte(budget.times(tol))) { best = { area: mid, r }; break; }
        if (r.grandTotal.gt(budget)) hi = mid; else lo = mid;
        if (hi - lo < cfg.minIntervalSqm) break;
      }
    }
    const totalArea = D(best.area).times(best.r.d.floorCount);
    return {
      tier, feasible: true, maxAreaSqm: best.area, totalAreaSqm: totalArea.toNumber(),
      totalAreaSqft: round(totalArea.times(SQM_TO_SQFT), 2).toNumber(),
      grandTotal: best.r.grandTotal.toNumber(), costPerSqft: best.r.costPerSqft.toNumber(),
    };
  });
}
export { Decimal };
