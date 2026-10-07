import { D, round, num } from '../../../utils/money.js';
import { SQM_TO_SQFT } from '../../../config/constants.js';
import { requireSetting } from './ctx.js';

// Section 7.2. Returns Decimal working values (d) plus non-blocking warnings.
export function deriveValues(ctx) {
  const { inp, N, floorRow, bhkRow, tpl, settings } = ctx;
  const floorCount = floorRow.floor_count;
  const total = D(inp.builtUpAreaSqm);
  const Af = inp.areaBasis === 'TOTAL' ? total.div(floorCount) : total;
  const At = Af.times(floorCount);
  const AtStruct = At.times(tpl.commonAreaLoad);
  const FF = D(floorRow.floor_factor_foundation);
  const P = D(4).times(Af.sqrt()).times(N('N_EXT_PERIM_FACTOR'));
  const mult = inp.bhkMode === 'PER_FLOOR' ? floorCount : 1;
  const rooms = {
    bedrooms: bhkRow.bedrooms * mult, halls: bhkRow.halls * mult, kitchens: bhkRow.kitchens * mult,
    bathrooms: bhkRow.bathrooms * mult, balconies: bhkRow.balconies * mult,
  };
  const d = {
    floorCount, Af, At, AtStruct, FF, P, rooms,
    points: bhkRow.electrical_points * mult, doors: bhkRow.doors * mult,
    windows: bhkRow.windows * mult, persons: bhkRow.persons * mult,
  };

  const warnings = [];
  const lo = D(bhkRow.typical_min_sqm).div(inp.bhkMode === 'WHOLE_HOUSE' ? floorCount : 1);
  const hi = D(bhkRow.typical_max_sqm);
  if (Af.lt(lo) || Af.gt(hi)) {
    warnings.push({ code: 'AREA_UNUSUAL_FOR_BHK', message: `Area per floor is outside the typical ${num(round(lo, 0))}-${num(hi)} sqm for a ${inp.bhk}BHK. Please re-check your inputs.` });
  }
  const dens = At.div(Math.max(rooms.bedrooms, 1));
  if (dens.gt(requireSetting(settings, 'low_density_sqm_per_bedroom'))) {
    warnings.push({ code: 'LOW_DENSITY', message: 'Very generous area per bedroom. Consider adding extra spaces (study, utility, parking) as add-ons.' });
  }
  return { d, warnings };
}

export function publicDerived(d, warnings) {
  return {
    floorCount: d.floorCount,
    areaPerFloorSqm: num(round(d.Af, 2)),
    totalAreaSqm: num(round(d.At, 2)),
    totalAreaSqft: num(round(d.At.times(SQM_TO_SQFT), 2)),
    rooms: d.rooms, points: d.points, doors: d.doors, windows: d.windows, persons: d.persons, warnings,
  };
}
