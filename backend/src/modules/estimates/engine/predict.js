import { D, round, roundTo100, Decimal, sumD } from '../../../utils/money.js';
import { GROUPS } from '../../../config/constants.js';
import { requireSetting } from './ctx.js';
import { addMonths, monthDiff } from './dates.js';

const monthsBetweenDates = (a, b) => (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24 * 30.4375);

// Least squares ln(rate) = a + b*t(years); returns annual growth or null if data is too thin.
function fitGrowth(points, cfg) {
  if (points.length < cfg.minPoints) return null;
  const sorted = [...points].sort((x, y) => new Date(x.date) - new Date(y.date));
  if (monthsBetweenDates(sorted[0].date, sorted[sorted.length - 1].date) < cfg.minSpanMonths) return null;
  const t0 = new Date(sorted[0].date).getTime();
  const xs = sorted.map((p) => (new Date(p.date).getTime() - t0) / (365.25 * 86400000));
  const ys = sorted.map((p) => Math.log(p.rate));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (den === 0) return null;
  const b = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den;
  return Math.exp(b) - 1;
}

export function buildPrediction({ lines, subtotal, grandTotal, schedule, history, settings, rateSet, startMonth }) {
  const cfg = requireSetting(settings, 'escalation_config');
  const items = requireSetting(settings, 'escalation_items');
  const defG = D(requireSetting(settings, 'default_escalation_percent')).div(100);
  const lo = D(cfg.clampMinPct).div(100);
  const hi = D(cfg.clampMaxPct).div(100);
  let usedHistory = false;

  const gByGroup = {};
  for (const g of GROUPS) {
    const rates = [];
    for (const code of items[g] || []) {
      const pts = history.filter((h) => h.item_code === code && Number(h.rate) > 0).map((h) => ({ date: h.effective_date, rate: Number(h.rate) }));
      const growth = fitGrowth(pts, cfg);
      if (growth !== null) rates.push(growth);
    }
    if (rates.length) {
      usedHistory = true;
      const avg = D(rates.reduce((a, b) => a + b, 0) / rates.length);
      gByGroup[g] = Decimal.min(Decimal.max(avg, lo), hi);
    } else gByGroup[g] = defG;
  }

  let blended = D(0);
  if (subtotal.gt(0)) {
    for (const g of GROUPS) {
      const amt = sumD(lines.filter((l) => l.group === g).map((l) => l.amount));
      blended = blended.plus(amt.div(subtotal).times(gByGroup[g]));
    }
  }

  const effYm = rateSet.effective_from ? String(rateSet.effective_from).slice(0, 7) : startMonth;
  const t0 = Math.max(0, monthDiff(effYm, startMonth));
  let baseCum = D(0);
  let projCum = D(0);
  const series = schedule.cashFlow.map((cf) => {
    const factor = D(1).plus(blended).pow(D(t0).plus(cf.month).minus(0.5).div(12));
    baseCum = baseCum.plus(cf.amount);
    projCum = projCum.plus(cf.amount.times(factor));
    return { month: cf.month, label: cf.label, baseCumulative: baseCum.toNumber(), projectedCumulative: round(projCum, 0).toNumber() };
  });
  const projectedTotal = round(projCum, 0);
  return {
    completionMonth: schedule.completionMonth,
    escalationPct: grandTotal.gt(0) ? round(projectedTotal.div(grandTotal).minus(1).times(100), 2).toNumber() : 0,
    projectedTotal: projectedTotal.toNumber(),
    blendedAnnualPct: round(blended.times(100), 2).toNumber(),
    series,
    basis: usedHistory ? 'rate_history' : 'default',
  };
}

// Section 7.8 accuracy band
export function accuracyBand({ grandTotal, subtotal, fallbackAmount, rateSetVerified, settings, verifiedCount = 0 }) {
  let band = D(requireSetting(settings, 'accuracy_band_percent'));
  const dyn = requireSetting(settings, 'dynamic_band');
  if (dyn.enabled) {
    const step = D(dyn.step);
    const thr = D(requireSetting(settings, 'fallback_share_threshold_percent')).div(100);
    if (subtotal.gt(0) && fallbackAmount.div(subtotal).gt(thr)) band = band.plus(step);
    if (!rateSetVerified) band = band.plus(step);
    if (verifiedCount >= requireSetting(settings, 'calibration_min_projects')) band = band.minus(step);
    band = Decimal.min(Decimal.max(band, dyn.min), dyn.max);
  }
  return {
    bandPercent: band.toNumber(),
    min: roundTo100(grandTotal.times(D(1).minus(band.div(100)))).toNumber(),
    max: roundTo100(grandTotal.times(D(1).plus(band.div(100)))).toNumber(),
  };
}

export function benchmark(costPerSqft, tierRow) {
  const min = D(tierRow.benchmark_min_per_sqft);
  const max = D(tierRow.benchmark_max_per_sqft);
  const status = costPerSqft.lt(min) ? 'BELOW' : costPerSqft.gt(max) ? 'ABOVE' : 'WITHIN';
  return { tierMinPerSqft: min.toNumber(), tierMaxPerSqft: max.toNumber(), status };
}

export { addMonths };
