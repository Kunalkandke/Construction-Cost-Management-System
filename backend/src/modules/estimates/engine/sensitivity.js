import { D, round } from '../../../utils/money.js';
import { TIERS, CEMENT_ITEM_CODES, STEEL_ITEM_CODE } from '../../../config/constants.js';
import { requireSetting } from './ctx.js';
import { runCore } from './core.js';

// Section 7.8 tornado data: re-run the engine with one change at a time.
export function buildSensitivity(inp, master, rates, settings, base, mode) {
  const cfg = requireSetting(settings, 'sensitivity_config');
  const up = (pct) => D(1).plus(D(pct).div(100));
  const cases = [
    { factor: `Steel +${cfg.steelPct}%`, ov: { codeMult: { [STEEL_ITEM_CODE]: up(cfg.steelPct) } } },
    { factor: `Cement-based items +${cfg.cementPct}%`, ov: { codeMult: Object.fromEntries(CEMENT_ITEM_CODES.map((c) => [c, up(cfg.cementPct)])) } },
    { factor: `Labour +${cfg.labourPct}%`, ov: { labourDelta: D(cfg.labourPct).div(100) } },
    { factor: `Flooring and tiles +${cfg.flooringPct}%`, ov: { categoryMult: { FLOORING: up(cfg.flooringPct) } } },
    { factor: `Built-up area +${cfg.areaPct}%`, inp: { ...inp, builtUpAreaSqm: round(D(inp.builtUpAreaSqm).times(up(cfg.areaPct)), 2).toNumber() } },
  ];
  const idx = TIERS.indexOf(inp.qualityTier);
  if (idx < TIERS.length - 1) {
    cases.push({ factor: `Quality tier: ${TIERS[idx]} to ${TIERS[idx + 1]}`, inp: { ...inp, qualityTier: TIERS[idx + 1] } });
  }
  const out = [];
  for (const c of cases) {
    const r = runCore(c.inp || inp, master, rates, settings, { mode, ov: c.ov || {} });
    const delta = r.grandTotal.minus(base.grandTotal);
    if (delta.isZero()) continue;
    out.push({
      factor: c.factor, impactAmount: delta.toNumber(),
      impactPct: base.grandTotal.gt(0) ? round(delta.div(base.grandTotal).times(100), 2).toNumber() : 0,
    });
  }
  return out.sort((a, b) => Math.abs(b.impactAmount) - Math.abs(a.impactAmount));
}
