import { z } from 'zod';
import { ApiError } from '../../../utils/ApiError.js';
import { requireSetting } from './ctx.js';
import { addMonths, monthOfDate } from './dates.js';

const addonSchema = z.object({
  code: z.string().min(1).max(64),
  qty: z.number().positive().max(1_000_000).optional(),
  pct: z.number().min(0).max(100).optional(),
});

// Structural validation (types, enums, shapes). Business rules that depend on master data follow in normaliseInput.
export const estimateInputSchema = z.object({
  houseType: z.string().min(1).max(40),
  floors: z.string().min(1).max(10),
  bhk: z.number().int(),
  bhkMode: z.enum(['WHOLE_HOUSE', 'PER_FLOOR']).default('WHOLE_HOUSE'),
  builtUpAreaSqm: z.number().refine((n) => Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Area may have at most 2 decimals'),
  areaBasis: z.enum(['PER_FLOOR', 'TOTAL']).default('PER_FLOOR'),
  qualityTier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
  locationId: z.string().uuid(),
  structureType: z.enum(['RCC_FRAME', 'LOAD_BEARING']).default('RCC_FRAME'),
  soilType: z.enum(['HARD', 'MEDIUM', 'SOFT']).default('MEDIUM'),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'startMonth must be YYYY-MM').optional(),
  addons: z.array(addonSchema).max(30).default([]),
  plotAreaSqm: z.number().positive().max(100000).optional(),
  includeSoftCosts: z.boolean().default(false),
  includeGst: z.boolean().default(false),
});

export function parseInput(raw) {
  const r = estimateInputSchema.safeParse(raw);
  if (!r.success) throw ApiError.fromZod(r.error, 'Invalid estimate input');
  return r.data;
}

export function normaliseInput(p, master, settings, today = new Date()) {
  const errs = [];
  const bad = (path, message) => errs.push({ path, message });

  const house = master.houseTypes.find((h) => h.code === p.houseType && h.is_active);
  if (!house) bad('houseType', 'Unknown or disabled house type');

  const floors = p.houseType === 'FLAT' ? 'G' : p.floors; // FLAT is a single unit: client value ignored
  const floorRow = master.floorOptions.find((f) => f.code === floors && f.is_active);
  if (!floorRow) bad('floors', 'Unknown or disabled floor option');

  if (!master.bhkConfigs.find((b) => b.bhk === p.bhk)) bad('bhk', 'BHK must be between 1 and 5');

  const lim = requireSetting(settings, 'area_limits_sqm');
  if (p.builtUpAreaSqm < lim.min || p.builtUpAreaSqm > lim.max) {
    bad('builtUpAreaSqm', `Built-up area must be between ${lim.min} and ${lim.max} sqm`);
  }

  if (!master.tiers.find((t) => t.code === p.qualityTier)) bad('qualityTier', 'Unknown quality tier');
  const loc = master.locations.find((l) => l.id === p.locationId && l.is_active);
  if (!loc) bad('locationId', 'Unknown or inactive location');

  const st = master.structureTypes.find((s) => s.code === p.structureType);
  if (!st) bad('structureType', 'Unknown structure type');
  else if (floorRow) {
    if (floorRow.floor_count > st.max_floor_count) {
      bad('structureType', `${st.name} construction is allowed for at most ${st.max_floor_count} floor(s). Choose RCC frame for taller buildings.`);
    }
    if (p.houseType === 'FLAT' && p.structureType !== 'RCC_FRAME') bad('structureType', 'A flat must use RCC frame construction');
  }

  const current = monthOfDate(today);
  if (p.startMonth && p.startMonth < current) bad('startMonth', 'Start month cannot be earlier than the current month');
  const startMonth = p.startMonth || addMonths(current, 1);

  const catalogue = requireSetting(settings, 'addon_catalogue');
  const seen = new Set();
  const addons = [];
  (p.addons || []).forEach((a, i) => {
    const entry = catalogue.find((c) => c.code === a.code);
    if (!entry) return bad(`addons.${i}.code`, `Unknown add-on ${a.code}`);
    if (seen.has(a.code)) return bad(`addons.${i}.code`, `Duplicate add-on ${a.code}`);
    seen.add(a.code);
    if (a.qty !== undefined && !entry.allowsQty) return bad(`addons.${i}.qty`, `${a.code} does not accept a quantity`);
    if (a.pct !== undefined && !entry.allowsPct) return bad(`addons.${i}.pct`, `${a.code} does not accept a percentage`);
    addons.push(a);
  });

  if (errs.length) throw ApiError.validation(errs[0].message, errs);
  return { ...p, floors, startMonth, addons };
}
