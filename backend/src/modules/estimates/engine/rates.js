import { D, round } from '../../../utils/money.js';
import { ApiError } from '../../../utils/ApiError.js';

// Section 7.3 rate resolution. ov = sensitivity overrides: { codeMult, categoryMult, labourDelta }.
export function makeResolver(ctx, rates, ov = {}) {
  const mult = ctx.tierRow.multipliers;
  const idx = D(ctx.location.cost_index);
  const leadLift = D(ctx.location.lead_lift_factor);
  const structMult = D(ctx.structRow.cost_multiplier);

  return function resolve(code, { group, labourPct, category } = {}) {
    const item = rates.items[code];
    if (!item || item.is_active === false) {
      throw new ApiError(500, 'MISSING_RATE', `No active rate for item ${code}`, [{ path: code, message: 'MISSING_RATE' }]);
    }
    let baseline;
    let source;
    let fallback = false;
    if (item.base_rate !== null && item.base_rate !== undefined) {
      baseline = D(item.base_rate); // state SSR wins, even if a DSR figure is lower
      source = item.source;
    } else if (item.dsr_rate !== null && item.dsr_rate !== undefined) {
      baseline = D(item.dsr_rate);
      if (!item.lead_lift_applied) baseline = baseline.times(leadLift);
      source = 'CPWD_DSR_CORRECTED';
      fallback = true;
    } else {
      throw new ApiError(500, 'MISSING_RATE', `No rate value for item ${code}`, [{ path: code, message: 'MISSING_RATE' }]);
    }
    const g = group || item.group;
    if (mult[g] === undefined) throw ApiError.internal(`Tier multiplier missing for group ${g}`);
    const lp = labourPct !== undefined ? labourPct : item.labour_pct;
    let eff = baseline.times(mult[g]).times(idx);
    if (g === 'structure') eff = eff.times(structMult);
    if (ov.codeMult && ov.codeMult[code]) eff = eff.times(ov.codeMult[code]);
    if (ov.categoryMult && category && ov.categoryMult[category]) eff = eff.times(ov.categoryMult[category]);
    if (ov.labourDelta) eff = eff.times(D(1).plus(D(lp).div(100).times(ov.labourDelta)));
    return { rate: round(eff, 2), source, fallback, item, group: g, labourPct: lp };
  };
}
