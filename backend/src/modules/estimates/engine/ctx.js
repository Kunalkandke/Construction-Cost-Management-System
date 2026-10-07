import { D } from '../../../utils/money.js';
import { ApiError } from '../../../utils/ApiError.js';

export function requireSetting(settings, key) {
  if (!settings || settings[key] === undefined || settings[key] === null) {
    throw ApiError.internal(`System setting missing: ${key}`);
  }
  return settings[key];
}

// Everything the formulas need, resolved once. N(key) returns a Decimal norm for the chosen tier,
// with structure-type overrides (multiplicative) applied.
export function buildContext(inp, master, settings) {
  const tierRow = master.tiers.find((t) => t.code === inp.qualityTier);
  const structRow = master.structureTypes.find((s) => s.code === inp.structureType);
  const houseRow = master.houseTypes.find((h) => h.code === inp.houseType);
  const floorRow = master.floorOptions.find((f) => f.code === inp.floors);
  const bhkRow = master.bhkConfigs.find((b) => b.bhk === inp.bhk);
  const location = master.locations.find((l) => l.id === inp.locationId);
  const tierKey = inp.qualityTier.toLowerCase();
  const overrides = structRow.norm_overrides || {};

  const N = (key) => {
    const row = master.norms[key];
    if (!row || row[tierKey] === undefined) throw ApiError.internal(`Consumption norm missing: ${key}`);
    let v = D(row[tierKey]);
    if (overrides[key] !== undefined) v = v.times(overrides[key]);
    return v;
  };
  const steelKg = D(tierRow.steel_kg_per_sqm).times(overrides.steelKg !== undefined ? overrides.steelKg : 1);
  const soilF = D(requireSetting(settings, 'soil_depth_factors')[inp.soilType]);

  return { inp, master, settings, tierRow, structRow, houseRow, floorRow, bhkRow, location, tpl: houseRow.template, tierKey, N, steelKg, soilF, d: null };
}
