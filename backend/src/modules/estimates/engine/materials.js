import { D, round, sumD } from '../../../utils/money.js';
import { MATERIALS } from '../../../config/constants.js';
import { requireSetting } from './ctx.js';

// Section 7.7: take-off from coefficients; labour is a VIEW of the composite cost, never added again.
export function materialTakeoff(lines, coefficients) {
  const byCode = {};
  for (const c of coefficients) (byCode[c.item_code] ||= []).push(c);
  const totals = Object.fromEntries(MATERIALS.map((m) => [m.material, D(0)]));
  for (const ln of lines) {
    for (const c of byCode[ln.itemCode] || []) totals[c.material] = totals[c.material].plus(ln.qty.times(c.per_unit));
  }
  return MATERIALS.map((m) => ({ key: m.key, label: m.label, unit: m.unit, quantity: round(totals[m.material], 2).toNumber() }));
}

export function labourSummary(lines, subtotal, settings) {
  const total = sumD(lines.map((l) => l.labourAmount));
  const wage = requireSetting(settings, 'blended_wage_per_manday');
  return {
    totalAmount: total.toNumber(),
    mandays: round(total.div(wage), 0).toNumber(),
    sharePct: subtotal.gt(0) ? round(total.div(subtotal).times(100), 1).toNumber() : 0,
  };
}
