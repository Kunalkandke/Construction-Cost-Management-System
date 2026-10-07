import { supabase, unwrap, fetchAll } from '../../config/supabase.js';
import { ApiError } from '../../utils/ApiError.js';
import { MASTER_CACHE_MS } from '../../config/constants.js';

let settingsCache = null;
let masterCache = null;
export const invalidateCaches = () => { settingsCache = null; masterCache = null; };
const fresh = (c) => c && Date.now() - c.at < MASTER_CACHE_MS;

export async function getSettings() {
  if (fresh(settingsCache)) return settingsCache.v;
  const rows = unwrap(await supabase.from('system_settings').select('key, value'), 'settings');
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  settingsCache = { at: Date.now(), v };
  return v;
}

export async function loadMaster() {
  if (fresh(masterCache)) return masterCache.v;
  const get = async (t) => unwrap(await supabase.from(t).select('*'), t);
  const [houseTypes, floorOptions, bhkConfigs, tiers, structureTypes, locations, normRows, materialCoefficients] = await Promise.all([
    get('house_types'), get('floor_options'), get('bhk_configs'), get('quality_tiers'), get('structure_types'),
    get('locations'), get('consumption_norms'), get('material_coefficients'),
  ]);
  const norms = Object.fromEntries(normRows.map((n) => [n.key, { basic: Number(n.basic), standard: Number(n.standard), premium: Number(n.premium), version: n.version }]));
  const n = (o, keys) => ({ ...o, ...Object.fromEntries(keys.map((k) => [k, Number(o[k])])) });
  const v = {
    houseTypes, floorOptions: floorOptions.map((f) => n(f, ['floor_factor_foundation'])),
    bhkConfigs: bhkConfigs.map((b) => n(b, ['typical_min_sqm', 'typical_max_sqm'])),
    tiers: tiers.map((t) => n(t, ['steel_kg_per_sqm', 'benchmark_min_per_sqft', 'benchmark_max_per_sqft'])),
    structureTypes: structureTypes.map((s) => n(s, ['cost_multiplier'])),
    locations: locations.map((l) => n(l, ['cost_index', 'lead_lift_factor'])),
    norms, materialCoefficients: materialCoefficients.map((m) => n(m, ['per_unit'])), verifiedActualsCount: 0,
  };
  masterCache = { at: Date.now(), v };
  return v;
}

const toRates = (rateSet, items) => ({
  rateSet,
  items: Object.fromEntries(items.map((i) => [i.item_code, { ...i, base_rate: i.base_rate === null ? null : Number(i.base_rate), dsr_rate: i.dsr_rate === null ? null : Number(i.dsr_rate), labour_pct: Number(i.labour_pct) }])),
});

export async function loadRates(rateSetId) {
  let q = supabase.from('rate_sets').select('*');
  q = rateSetId ? q.eq('id', rateSetId) : q.eq('status', 'published');
  const rateSet = unwrap(await q.maybeSingle(), 'rate_set');
  if (!rateSet) throw rateSetId ? ApiError.notFound('Rate set not found') : new ApiError(503, 'INTERNAL_ERROR', 'No published rate set is available. Please try again later.');
  const items = await fetchAll(() => supabase.from('rate_items').select('*').eq('rate_set_id', rateSet.id).order('item_code'));
  return toRates(rateSet, items);
}

export async function loadHistory(settings) {
  const codes = [...new Set(Object.values(settings.escalation_items || {}).flat())];
  if (!codes.length) return [];
  return fetchAll(() => supabase.from('rate_history').select('item_code, rate, effective_date').in('item_code', codes).order('effective_date'));
}

// Verified projects for the same tier and location (feeds the dynamic accuracy band)
export async function countVerifiedProjects(tier, locationId) {
  const acts = unwrap(await supabase.from('project_actuals').select('estimate_id').eq('verified', true), 'verified');
  const ids = [...new Set(acts.map((a) => a.estimate_id))];
  if (!ids.length) return 0;
  const rows = unwrap(await supabase.from('estimates').select('id, inputs').in('id', ids.slice(0, 1000)).eq('location_id', locationId), 'verified.est');
  return rows.filter((r) => r.inputs?.qualityTier === tier).length;
}
