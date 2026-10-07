import { supabase, unwrap } from '../../config/supabase.js';
import { MATERIALS } from '../../config/constants.js';

export const REGION = 'Marathwada, Maharashtra (monsoon June-September, hard black-cotton soil common)';

export async function getActivePrompts() {
  const rows = unwrap(await supabase.from('ai_prompts').select('*').eq('is_active', true), 'ai.prompts');
  const sys = rows.find((r) => r.key === 'insights_system');
  const usr = rows.find((r) => r.key === 'insights_user');
  if (!sys || !usr) return null;
  return { system: sys, user: usr };
}

// Section 8.3: compact, no personal data.
export function buildContextJson(result, district) {
  const i = result.inputs;
  const subtotal = result.subtotal || 1;
  const top = [...result.lineItems].sort((a, b) => b.amount - a.amount).slice(0, 10)
    .map((l) => ({ itemCode: l.itemCode, description: l.description, amount: l.amount, sharePct: Math.round((l.amount / subtotal) * 1000) / 10 }));
  return {
    inputs: { houseType: i.houseType, floors: i.floors, bhk: i.bhk, totalAreaSqm: result.derived.totalAreaSqm, qualityTier: i.qualityTier, structureType: i.structureType, district, soilType: i.soilType, addons: (i.addons || []).map((a) => a.code) },
    totals: { grandTotal: result.grandTotal, costPerSqft: result.costPerSqft, rangeMin: result.range.min, rangeMax: result.range.max, contingencyPercent: result.contingencyPercent },
    categories: result.categories.map((c) => ({ key: c.key, amount: c.amount, sharePct: c.sharePct })),
    topLineItems: top,
    materials: (result.materials || []).map((m) => ({ key: m.key, quantity: m.quantity, unit: m.unit })),
    schedule: { durationMonths: result.schedule.durationMonths, startMonth: i.startMonth, completionMonth: result.prediction.completionMonth },
    prediction: { escalationPct: result.prediction.escalationPct, basis: result.prediction.basis },
    sensitivity: result.sensitivity.slice(0, 4),
    tierComparison: result.tierComparison.map((t) => ({ tier: t.tier, grandTotal: t.grandTotal })),
    benchmarkStatus: result.benchmark.status,
    region: REGION,
  };
}

export const renderUserPrompt = (template, ctx) => template.replace('{{CONTEXT_JSON}}', JSON.stringify(ctx));

// Advisory ranges for the rule-based fallback (not used by any calculation).
const RANGES = { flooring: [10, 20], premium: [8, 15], steel: [3, 8], generic: [3, 8] };

export function fallbackInsight(result, settings) {
  const rules = settings.fallback_rules || { flooringSharePct: 18, steelSharePct: 28 };
  const cats = result.categories;
  const keys = cats.map((c) => c.key);
  const pick = (...pref) => pref.find((k) => keys.includes(k)) || [...cats].sort((a, b) => b.amount - a.amount)[0].key;
  const subtotal = result.subtotal || 1;
  const share = (k) => ((cats.find((c) => c.key === k)?.amount || 0) / subtotal) * 100;
  const steelAmt = result.lineItems.filter((l) => l.itemCode === 'R02').reduce((a, l) => a + l.amount, 0);
  const tips = [];
  const risks = [];
  const tip = (title, description, category, [a, b], tradeOff, effort) => tips.push({ title, description, category, savingPctMin: a, savingPctMax: b, tradeOff, effort });

  if (share('FLOORING') > rules.flooringSharePct) tip('Choose a mid-range vitrified tile', 'Flooring is a large share of your cost. A good mid-range vitrified tile looks similar to premium options at a lower price.', pick('FLOORING'), RANGES.flooring, 'Slightly fewer design choices and finishes.', 'LOW');
  if (result.inputs.qualityTier === 'PREMIUM') tip('Use premium finishes only in visible areas', 'Keep premium fittings for living areas and use standard grade in utility spaces.', pick('FLOORING', 'FINISHING'), RANGES.premium, 'Finish quality will not be uniform across the house.', 'MEDIUM');
  if ((steelAmt / subtotal) * 100 > rules.steelSharePct) tip('Ask for a value-engineering review of steel', 'Steel is a high share of the cost. Your structural engineer can check bar sizes and spacing for savings.', pick('SUPERSTRUCTURE', 'STRUCTURE'), RANGES.steel, 'Needs engineer time; never reduce steel without a design check.', 'HIGH');
  tip('Get three written quotations', 'Compare at least three contractor or supplier quotations for the largest categories before finalising.', pick('SUPERSTRUCTURE', 'STRUCTURE'), RANGES.generic, 'Takes a few days of extra coordination.', 'LOW');
  tip('Buy bulk materials in planned lots', 'Order cement, steel and tiles in planned lots, from reliable dealers, to avoid price spikes and wastage.', pick('MASONRY', 'STRUCTURE'), RANGES.generic, 'Needs safe on-site storage.', 'MEDIUM');
  tip('Standardise door and window sizes', 'Repeating a few standard sizes reduces carpentry cost and wastage.', pick('OPENINGS', 'FINISHING'), RANGES.generic, 'Less design variety.', 'LOW');

  const start = Number((result.inputs.startMonth || '').slice(5, 7));
  const monsoon = (settings.monsoon_months || [6, 7, 8, 9]).includes(start);
  if (monsoon) risks.push({ risk: 'Construction starts during the monsoon, which can slow excavation, concrete work and curing.', severity: 'HIGH', mitigation: 'Sequence foundation work around heavy rain, protect fresh concrete and plan dewatering.' });
  if (result.ratesUsed.fallbackItemCount > 0) risks.push({ risk: 'Some rates come from CPWD DSR instead of the state schedule.', severity: 'MEDIUM', mitigation: 'Ask for local quotations for those items.' });
  if (!result.ratesUsed.verified) risks.push({ risk: 'Rates used are illustrative and not yet verified against the current SSR.', severity: 'MEDIUM', mitigation: 'Treat the total as a planning figure and verify with current rates.' });
  risks.push({ risk: 'Market prices of cement and steel can move during construction.', severity: 'MEDIUM', mitigation: 'Keep a 5-10% contingency and buy key materials in advance.' });
  risks.push({ risk: 'Soil and site conditions may differ from assumptions.', severity: 'MEDIUM', mitigation: 'Get a soil test and a structural design from a registered engineer before starting.' });
  risks.push({ risk: 'Changes in design after work starts increase cost.', severity: 'LOW', mitigation: 'Freeze drawings and finishes before foundation work.' });

  const thr = settings.outlook_rising_threshold_percent ?? 3;
  const rising = result.prediction.escalationPct > thr;
  return {
    summary: `Your ${result.inputs.qualityTier.toLowerCase()} ${result.derived.totalAreaSqm} sqm estimate is rule-based guidance on the engine figures; the largest cost group is ${[...cats].sort((a, b) => b.amount - a.amount)[0].label}.`,
    costSavingTips: tips.slice(0, 6),
    materialAlternatives: [
      { current: 'Red clay bricks', alternative: 'AAC or fly-ash blocks', benefit: 'Faster laying and lighter walls', caution: 'Needs the right mortar and plaster mix.' },
      { current: 'Premium imported tiles', alternative: 'Good-quality Indian vitrified tiles', benefit: 'Lower cost with easy maintenance', caution: 'Check batch and shade consistency.' },
    ],
    risks: risks.slice(0, 5),
    timelineAdvice: `Plan for about ${result.schedule.durationMonths} months.${monsoon ? ' Your start falls in the monsoon, so allow extra time.' : ''}`,
    budgetOutlook: { trend: rising ? 'RISING' : 'STABLE', rationale: `Projected escalation by completion is ${result.prediction.escalationPct}% (basis: ${result.prediction.basis === 'rate_history' ? 'rate history' : 'default assumption'}).`, confidence: result.prediction.basis === 'rate_history' ? 'MEDIUM' : 'LOW' },
    nextSteps: ['Get three quotations from local contractors.', 'Keep 5-10% contingency on top of the estimate.', 'Use IS-marked materials for cement, steel and wiring.', 'Consult a registered structural engineer for design and a soil test.'],
  };
}

export const MATERIAL_KEYS = MATERIALS.map((m) => m.key);
