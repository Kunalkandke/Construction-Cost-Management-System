import { describe, it, expect } from 'vitest';
import { calculate, budgetPlan } from './index.js';
import { master, settings, makeDemoRates, makeSampleRates, BASE_LOC } from '../../../../tests/fixtures/master.js';
import { readFileSync } from 'node:fs';

const sample = JSON.parse(readFileSync(new URL('../../../../tests/fixtures/sample-2bhk-g1.json', import.meta.url), 'utf8'));

const TODAY = new Date('2026-10-04T00:00:00Z');
const input = (over = {}) => ({ ...sample, locationId: BASE_LOC, ...over });
const run = (over = {}, rates = makeDemoRates(), mode = 'DETAILED', hist = []) => calculate(input(over), master, rates, settings, hist, TODAY, { mode });
const quick = (over = {}) => run(over, makeSampleRates(), 'QUICK');
const cat = (r, k) => r.categories.find((c) => c.key === k)?.amount ?? 0;

describe('Appendix B.1 sample parity (QUICK, SAMPLE-FIXTURE rates)', () => {
  const r = quick();
  it('derived values', () => {
    expect(r.derived.floorCount).toBe(2);
    expect(r.derived.totalAreaSqm).toBe(240);
    expect(r.derived.totalAreaSqft).toBe(2583.34);
  });
  it('category amounts', () => {
    expect(cat(r, 'STRUCTURE')).toBe(1080000);
    expect(cat(r, 'ELECTRICAL')).toBe(56000);
    expect(cat(r, 'PLUMBING')).toBe(145000);
    expect(cat(r, 'FLOORING')).toBe(239400);
    expect(cat(r, 'PAINTING')).toBe(118800);
    expect(cat(r, 'OPENINGS')).toBe(133000);
    expect(cat(r, 'FINISHING')).toBe(0);
    expect(r.lineItems.find((l) => l.itemCode === 'Q_FLOOR').quantity).toBe(252);
    expect(r.lineItems.find((l) => l.itemCode === 'Q_PAINT').quantity).toBe(660);
  });
  it('totals, per sqft and range', () => {
    expect(r.subtotal).toBe(1772200);
    expect(r.contingency).toBe(177220);
    expect(r.grandTotal).toBe(1949420);
    expect(r.costPerSqft).toBe(755);
    expect(r.range).toMatchObject({ min: 1754500, max: 2144400, bandPercent: 10 });
  });
});

describe('Rounding and integrity (DETAILED)', () => {
  const r = run({ floors: 'G', bhk: 1, builtUpAreaSqm: 45 });
  it('amounts are whole rupees and sum to subtotal', () => {
    r.lineItems.forEach((l) => expect(Number.isInteger(l.amount)).toBe(true));
    expect(r.lineItems.reduce((a, l) => a + l.amount, 0)).toBe(r.subtotal);
    expect(r.categories.reduce((a, c) => a + c.amount, 0)).toBe(r.subtotal);
  });
  it('cash flow ends at grand total; floor split sums to subtotal', () => {
    expect(r.schedule.cashFlow.at(-1).cumulative).toBe(r.grandTotal);
    expect(r.schedule.cashFlow.length).toBe(r.schedule.durationMonths);
    expect(r.floorSplit.reduce((a, f) => a + f.amount, 0)).toBe(r.subtotal);
  });
  it('G+1 and G+2 splits also sum to subtotal', () => {
    for (const floors of ['G+1', 'G+2']) {
      const x = run({ floors, bhk: 3, builtUpAreaSqm: 90, addons: [{ code: 'ADD_WATERPROOF' }, { code: 'ADD_COMPOUND_WALL' }] });
      expect(x.floorSplit.reduce((a, f) => a + f.amount, 0)).toBe(x.subtotal);
      expect(x.schedule.cashFlow.at(-1).cumulative).toBe(x.grandTotal);
    }
  });
});

describe('Schedule', () => {
  it('240 sqm G+1 STANDARD takes 8 months (spec example)', () => {
    expect(run().schedule.durationMonths).toBe(8);
  });
});

describe('Monotonic behaviour', () => {
  it('bigger area never costs less', () => {
    let prev = 0;
    for (const a of [30, 60, 90, 120, 200, 400]) { const t = run({ builtUpAreaSqm: a }).grandTotal; expect(t).toBeGreaterThanOrEqual(prev); prev = t; }
  });
  it('PREMIUM >= STANDARD >= BASIC (detailed and quick)', () => {
    const d = ['BASIC', 'STANDARD', 'PREMIUM'].map((qualityTier) => run({ qualityTier }).grandTotal);
    expect(d[0]).toBeLessThan(d[1]); expect(d[1]).toBeLessThan(d[2]);
    const q = ['BASIC', 'STANDARD', 'PREMIUM'].map((qualityTier) => quick({ qualityTier }).grandTotal);
    expect(q[0]).toBeLessThan(q[1]); expect(q[1]).toBeLessThan(q[2]);
  });
  it('tierComparison is consistent with the chosen tier', () => {
    const r = run();
    expect(r.tierComparison.find((t) => t.tier === 'STANDARD').grandTotal).toBe(r.grandTotal);
  });
});

describe('Rates are data, not code', () => {
  it('changing a rate item changes the result without code change', () => {
    const a = run().grandTotal;
    const rates = makeDemoRates();
    rates.items.R01.base_rate = 12000;
    expect(run({}, rates).grandTotal).toBeGreaterThan(a);
  });
});

describe('Validation', () => {
  it('rejects LOAD_BEARING with G+2', () => {
    expect(() => run({ structureType: 'LOAD_BEARING', floors: 'G+2' })).toThrow(/at most 2/);
  });
  it('allows LOAD_BEARING with G+1 and lowers structure cost', () => {
    expect(run({ structureType: 'LOAD_BEARING' }).grandTotal).toBeLessThan(run().grandTotal);
  });
  it('FLAT forces floorCount 1', () => {
    const r = run({ houseType: 'FLAT', floors: 'G+2' });
    expect(r.derived.floorCount).toBe(1);
  });
  it('rejects area 19 and 601', () => {
    expect(() => run({ builtUpAreaSqm: 19 })).toThrow();
    expect(() => run({ builtUpAreaSqm: 601 })).toThrow();
  });
  it('rejects unknown add-on and qty on non-qty add-on', () => {
    expect(() => run({ addons: [{ code: 'ADD_NOPE' }] })).toThrow();
    expect(() => run({ addons: [{ code: 'ADD_GATE', qty: 3 }] })).toThrow();
  });
  it('rejects a past start month', () => {
    expect(() => run({ startMonth: '2026-01' })).toThrow();
  });
  it('warns, but does not block, for unusual area', () => {
    const r = run({ bhk: 1, builtUpAreaSqm: 300 });
    expect(r.derived.warnings.map((w) => w.code)).toContain('AREA_UNUSUAL_FOR_BHK');
  });
});

describe('Rate resolution fallback (7.3)', () => {
  const only = (extra) => { const rt = makeDemoRates(); Object.assign(rt.items.R01, extra); return rt; };
  it('uses dsr_rate x lead_lift_factor when only DSR exists and counts the fallback', () => {
    const rates = only({ base_rate: null, dsr_rate: 1000 });
    const r = calculate(input({ locationId: '00000000-0000-4000-8000-000000000002' }), master, rates, settings, [], TODAY, { mode: 'DETAILED' });
    const ln = r.lineItems.find((l) => l.itemCode === 'R01');
    expect(ln.source).toBe('CPWD_DSR_CORRECTED');
    expect(ln.rate).toBe(1000 * 1.02 * 1.12); // tier 1.00, Pune cost index 1.12
    expect(r.ratesUsed.fallbackItemCount).toBe(1);
  });
  it('state rate wins even when DSR is lower', () => {
    const r = run({}, only({ base_rate: 10500, dsr_rate: 100 }));
    expect(r.lineItems.find((l) => l.itemCode === 'R01').rate).toBe(10500);
    expect(r.ratesUsed.fallbackItemCount).toBe(0);
  });
  it('throws MISSING_RATE when a needed item has no rate', () => {
    const rates = makeDemoRates(); delete rates.items.R01;
    expect(() => run({}, rates)).toThrow(/R01/);
  });
});

describe('Add-ons and materials', () => {
  it('add-ons add a FINISHING category; waterproofing is split into terrace + wet lines', () => {
    const r = run({ addons: [{ code: 'ADD_WATERPROOF' }, { code: 'ADD_FALSE_CEILING', pct: 50 }] });
    expect(cat(r, 'FINISHING')).toBeGreaterThan(0);
    expect(r.lineItems.filter((l) => l.itemCode === 'ADD_WATERPROOF').length).toBe(2);
  });
  it('material take-off returns cement, steel and bricks > 0 in DETAILED, empty in QUICK', () => {
    const r = run();
    expect(r.materials.find((m) => m.key === 'cement').quantity).toBeGreaterThan(0);
    expect(r.materials.find((m) => m.key === 'steel').quantity).toBeGreaterThan(0);
    expect(quick().materials).toEqual([]);
  });
  it('labour is a view of the cost, not added on top', () => {
    const r = run();
    expect(r.labour.totalAmount).toBeLessThan(r.subtotal);
    expect(r.subtotal).toBe(r.lineItems.reduce((a, l) => a + l.amount, 0));
  });
});

describe('Prediction and sensitivity', () => {
  it('uses default escalation without enough history', () => {
    const r = run();
    expect(r.prediction.basis).toBe('default');
    expect(r.prediction.escalationPct).toBeGreaterThan(0);
    expect(r.prediction.completionMonth).toBe('2027-06');
  });
  it('uses rate history when there are 6+ points over 12+ months', () => {
    const hist = [];
    for (let i = 0; i < 7; i += 1) for (const c of ['R01', 'R02', 'M01', 'FL01', 'PT01', 'E01', 'PL01', 'D02', 'W01']) {
      hist.push({ item_code: c, rate: 100 * 1.08 ** (i / 2), effective_date: `${2023 + Math.floor(i / 2)}-${i % 2 ? '07' : '01'}-01` });
    }
    const r = run({}, makeDemoRates(), 'DETAILED', hist);
    expect(r.prediction.basis).toBe('rate_history');
  });
  it('sensitivity is sorted by absolute impact', () => {
    const s = run().sensitivity;
    expect(s.length).toBeGreaterThan(3);
    for (let i = 1; i < s.length; i += 1) expect(Math.abs(s[i - 1].impactAmount)).toBeGreaterThanOrEqual(Math.abs(s[i].impactAmount));
  });
});

describe('Dynamic accuracy band', () => {
  it('widens when rates are unverified and narrows within clamp', () => {
    const st = { ...settings, dynamic_band: { enabled: true, min: 6, max: 20, step: 2 } };
    const r = calculate(input(), master, makeDemoRates(), st, [], TODAY, {});
    expect(r.range.bandPercent).toBe(12);
  });
});

describe('Budget planner (7.10)', () => {
  const plan = (budget) => budgetPlan({ budget, houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, locationId: BASE_LOC }, master, makeDemoRates(), settings, TODAY);
  it('lands within 0.5% of a 25,00,000 budget for every tier', () => {
    for (const p of plan(2500000)) {
      expect(p.feasible).toBe(true);
      expect(Math.abs(p.grandTotal - 2500000) / 2500000).toBeLessThanOrEqual(0.005);
    }
  });
  it('flags an infeasible budget with the minimum cost', () => {
    const p = plan(100000);
    expect(p[0].feasible).toBe(false);
    expect(p[0].minimumCost).toBeGreaterThan(100000);
  });
});
