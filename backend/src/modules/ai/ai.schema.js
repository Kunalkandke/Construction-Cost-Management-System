import { z } from 'zod';

const effort = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const level = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const insightSchema = z.object({
  summary: z.string().min(1),
  costSavingTips: z.array(z.object({
    title: z.string().min(1), description: z.string().min(1), category: z.string().min(1),
    savingPctMin: z.number().min(0).max(30), savingPctMax: z.number().min(0).max(30), tradeOff: z.string().min(1), effort,
  })).min(3).max(6),
  materialAlternatives: z.array(z.object({ current: z.string().min(1), alternative: z.string().min(1), benefit: z.string().min(1), caution: z.string().min(1) })).min(2).max(4),
  risks: z.array(z.object({ risk: z.string().min(1), severity: level, mitigation: z.string().min(1) })).min(3).max(5),
  timelineAdvice: z.string().min(1),
  budgetOutlook: z.object({ trend: z.enum(['RISING', 'STABLE', 'FALLING']), rationale: z.string().min(1), confidence: level }),
  nextSteps: z.array(z.string().min(1)).min(3).max(5),
});

// JSON schema handed to Gemini (responseSchema). Mirrors the zod schema above.
const S = { type: 'STRING' };
const N = { type: 'NUMBER' };
const arr = (items, min, max) => ({ type: 'ARRAY', items, minItems: min, maxItems: max });
const obj = (properties) => ({ type: 'OBJECT', properties, required: Object.keys(properties) });
const en = (values) => ({ type: 'STRING', enum: values });

export const insightResponseSchema = obj({
  summary: S,
  costSavingTips: arr(obj({ title: S, description: S, category: S, savingPctMin: N, savingPctMax: N, tradeOff: S, effort: en(['LOW', 'MEDIUM', 'HIGH']) }), 3, 6),
  materialAlternatives: arr(obj({ current: S, alternative: S, benefit: S, caution: S }), 2, 4),
  risks: arr(obj({ risk: S, severity: en(['LOW', 'MEDIUM', 'HIGH']), mitigation: S }), 3, 5),
  timelineAdvice: S,
  budgetOutlook: obj({ trend: en(['RISING', 'STABLE', 'FALLING']), rationale: S, confidence: en(['LOW', 'MEDIUM', 'HIGH']) }),
  nextSteps: arr(S, 3, 5),
});

const trimWords = (s, n) => { const w = String(s || '').trim().split(/\s+/); return w.length > n ? `${w.slice(0, n).join(' ')}...` : w.join(' '); };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));

// Lenient clean-up (word limits, 0-30% clamp) before strict validation.
export function sanitizeInsight(j) {
  if (!j || typeof j !== 'object') return j;
  const out = { ...j };
  if (typeof out.summary === 'string') out.summary = trimWords(out.summary, 60);
  if (typeof out.timelineAdvice === 'string') out.timelineAdvice = trimWords(out.timelineAdvice, 60);
  if (Array.isArray(out.costSavingTips)) {
    out.costSavingTips = out.costSavingTips.map((t) => {
      const a = clamp(t?.savingPctMin, 0, 30); const b = clamp(t?.savingPctMax, 0, 30);
      return { ...t, savingPctMin: Math.min(a, b), savingPctMax: Math.max(a, b) };
    });
  }
  return out;
}

export function validateInsight(json, categoryKeys) {
  const parsed = insightSchema.parse(sanitizeInsight(json));
  const bad = parsed.costSavingTips.find((t) => !categoryKeys.includes(t.category));
  if (bad) throw new Error(`Unknown category in tip: ${bad.category}`);
  return parsed;
}
