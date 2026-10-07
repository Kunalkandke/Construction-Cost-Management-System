import { D, round, Decimal } from '../../../utils/money.js';
import { requireSetting } from './ctx.js';
import { addMonths } from './dates.js';

// Section 7.8 timeline and stage-wise cash flow. cashFlow always ends exactly at grandTotal.
export function buildSchedule(ctx, grandTotal, startMonth) {
  const { N, d, inp, settings } = ctx;
  const dur = N('SCH_BASE').plus(N('SCH_PER_SQM').times(d.At)).times(N(`SCH_FLOOR_FACTOR_${d.floorCount}`)).times(N('SCH_TIER_FACTOR')).ceil();
  const months = dur.toNumber();
  const templates = requireSetting(settings, 'stage_templates');
  const tpl = inp.houseType === 'FLAT' ? templates.FLAT : d.floorCount === 1 ? templates.SINGLE_FLOOR : templates.DEFAULT;

  let allocated = D(0);
  const stages = tpl.map((s, i) => {
    const sm = D(s.start).times(months).floor().plus(1).toNumber();
    const em = Decimal.max(D(s.end).times(months).ceil(), sm).toNumber();
    const last = i === tpl.length - 1;
    const amount = last ? grandTotal.minus(allocated) : round(grandTotal.times(s.pct).div(100), 0);
    allocated = allocated.plus(amount);
    return { name: s.name, startMonth: Math.min(sm, months), endMonth: Math.min(em, months), pct: s.pct, amount };
  });

  const monthly = Array.from({ length: months }, () => D(0));
  for (const st of stages) {
    const n = st.endMonth - st.startMonth + 1;
    const each = round(st.amount.div(n), 0);
    for (let m = st.startMonth; m <= st.endMonth; m += 1) {
      monthly[m - 1] = monthly[m - 1].plus(m === st.endMonth ? st.amount.minus(each.times(n - 1)) : each);
    }
  }
  let cum = D(0);
  const cashFlow = monthly.map((amt, i) => {
    cum = cum.plus(amt);
    return { month: i + 1, label: addMonths(startMonth, i), amount: amt, cumulative: cum };
  });
  return { durationMonths: months, stages, cashFlow, completionMonth: addMonths(startMonth, months - 1) };
}
