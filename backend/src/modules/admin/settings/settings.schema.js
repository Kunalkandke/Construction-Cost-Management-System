import { z } from 'zod';

const pct = (min, max) => z.number().min(min).max(max);
const stage = z.object({ name: z.string().min(1).max(80), pct: pct(0, 100), start: pct(0, 1), end: pct(0, 1) });
const stageList = z.array(stage).min(3).max(12).refine((a) => Math.abs(a.reduce((s, x) => s + x.pct, 0) - 100) < 0.001, 'Stage percentages must add up to 100');

// Every known key, with type and range. Unknown keys are rejected.
export const SETTING_SCHEMAS = {
  contingency_percent: pct(5, 15), accuracy_band_percent: pct(1, 30),
  dynamic_band: z.object({ enabled: z.boolean(), min: pct(1, 30), max: pct(1, 40), step: pct(0, 10) }),
  default_escalation_percent: pct(0, 25), blended_wage_per_manday: pct(100, 10000), soft_cost_percent: pct(0, 30),
  gst_percent: pct(0, 30), gst_enabled: z.boolean(),
  soil_depth_factors: z.object({ HARD: pct(0.5, 2), MEDIUM: pct(0.5, 2), SOFT: pct(0.5, 2) }),
  ai_enabled: z.boolean(), ai_daily_limit_user: z.number().int().min(0).max(1000), ai_daily_limit_guest: z.number().int().min(0).max(100),
  ai_model_override: z.string().trim().min(3).max(80).nullable(), ai_temperature: pct(0, 2), ai_max_output_tokens: z.number().int().min(256).max(8192),
  ai_timeout_ms: z.number().int().min(5000).max(60000), ai_force_cooldown_minutes: z.number().int().min(0).max(1440),
  ai_cost_per_million_tokens: z.object({ input: pct(0, 1000), output: pct(0, 1000) }),
  calibration_min_projects: z.number().int().min(1).max(1000), rates_verified: z.boolean(),
  labour_pct_by_category: z.record(pct(0, 100)), area_limits_sqm: z.object({ min: pct(5, 100), max: pct(100, 5000) }),
  low_density_sqm_per_bedroom: pct(10, 500), fallback_share_threshold_percent: pct(0, 100), publish_max_change_percent: pct(1, 500),
  escalation_config: z.object({ minPoints: z.number().int().min(3).max(100), minSpanMonths: z.number().int().min(1).max(120), clampMinPct: pct(0, 50), clampMaxPct: pct(0, 100) }),
  escalation_items: z.record(z.array(z.string().max(20)).max(10)),
  sensitivity_config: z.object({ steelPct: pct(1, 100), cementPct: pct(1, 100), labourPct: pct(1, 100), flooringPct: pct(1, 100), areaPct: pct(1, 100) }),
  budget_planner_config: z.object({ maxIterations: z.number().int().min(5).max(60), tolerancePct: pct(0.01, 5), minIntervalSqm: pct(0.01, 5) }),
  outlook_rising_threshold_percent: pct(0, 50), fallback_rules: z.object({ flooringSharePct: pct(0, 100), steelSharePct: pct(0, 100) }),
  monsoon_months: z.array(z.number().int().min(1).max(12)).max(12),
  disclaimer_text: z.string().trim().min(10).max(2000), footer_credit_text: z.string().trim().max(200),
  stage_templates: z.object({ DEFAULT: stageList, SINGLE_FLOOR: stageList, FLAT: stageList }),
  addon_catalogue: z.array(z.object({ code: z.string().max(40), label: z.string().max(100), unit: z.string().max(10), defaultOn: z.boolean(), allowsQty: z.boolean(), allowsPct: z.boolean(), recommended: z.boolean().optional(), hint: z.string().max(200).optional() })).max(40),
};
export const patchBody = z.object({ values: z.record(z.any()).refine((v) => Object.keys(v).length > 0, 'Provide at least one setting') });
