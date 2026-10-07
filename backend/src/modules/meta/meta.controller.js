import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/format.js';
import { supabase, unwrap } from '../../config/supabase.js';
import { getSettings, loadMaster } from '../estimates/estimates.data.js';

export const addons = asyncHandler(async (req, res) => ok(res, (await getSettings()).addon_catalogue || []));

export const config = asyncHandler(async (req, res) => {
  const [m, s] = await Promise.all([loadMaster(), getSettings()]);
  const set = unwrap(await supabase.from('rate_sets').select('name, fiscal_year, is_verified, effective_from').eq('status', 'published').maybeSingle(), 'meta.rateset');
  const now = new Date().toISOString();
  const anns = unwrap(await supabase.from('announcements').select('id,title,body,kind,starts_at,ends_at').eq('is_active', true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`), 'meta.ann');
  const lim = s.area_limits_sqm;
  ok(res, {
    houseTypes: m.houseTypes.filter((h) => h.is_active).sort((a, b) => a.sort_order - b.sort_order),
    floorOptions: m.floorOptions.filter((f) => f.is_active).sort((a, b) => a.floor_count - b.floor_count),
    bhkConfigs: [...m.bhkConfigs].sort((a, b) => a.bhk - b.bhk),
    qualityTiers: m.tiers.map(({ id, code, name, description, benchmark_min_per_sqft, benchmark_max_per_sqft }) => ({ id, code, name, description, benchmark_min_per_sqft, benchmark_max_per_sqft })),
    structureTypes: m.structureTypes.map(({ id, code, name, max_floor_count }) => ({ id, code, name, max_floor_count })),
    locations: m.locations.filter((l) => l.is_active).map(({ id, state, district, taluka, display_name }) => ({ id, state, district, taluka, display_name })),
    addons: s.addon_catalogue || [],
    limits: { minAreaSqm: lim.min, maxAreaSqm: lim.max },
    settings: {
      accuracyBandPercent: s.accuracy_band_percent, disclaimerText: s.disclaimer_text, ratesVerified: Boolean(set?.is_verified) && s.rates_verified === true,
      gstEnabled: s.gst_enabled === true, gstPercent: s.gst_percent, softCostPercent: s.soft_cost_percent, footerCreditText: s.footer_credit_text,
      activeRateSet: set ? { name: set.name, fiscalYear: set.fiscal_year } : null,
    },
    announcements: anns,
  });
});
