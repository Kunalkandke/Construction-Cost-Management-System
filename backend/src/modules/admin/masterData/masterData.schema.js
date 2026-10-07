import { z } from 'zod';
import { GROUPS } from '../../../config/constants.js';

const name = z.string().trim().min(1).max(100);
const mult = z.number().min(0.5).max(2);
const tpl = z.object({
  includeFoundationShare: z.number().min(0).max(1), includeCompoundWall: z.boolean(), includeSeptic: z.boolean(),
  includeOverheadTank: z.boolean(), includeStaircase: z.boolean(), commonAreaLoad: z.number().min(0.5).max(2),
  defaultAddons: z.array(z.string().max(40)).max(20),
}).strict();
const posInt = (max) => z.number().int().min(0).max(max);

export const houseTypes = {
  create: z.object({ code: z.string().regex(/^[A-Z_]{3,30}$/), name, description: z.string().max(300).optional(), icon: z.string().max(40).optional(), sortOrder: posInt(100).optional(), isActive: z.boolean().optional(), template: tpl }),
  update: z.object({ name, description: z.string().max(300), icon: z.string().max(40), sortOrder: posInt(100), isActive: z.boolean(), template: tpl }).partial(),
};
export const floorOptions = {
  create: z.object({ code: z.string().regex(/^G(\+[1-9])?$/), floorCount: z.number().int().min(1).max(3), floorFactorFoundation: z.number().min(0.5).max(3), isActive: z.boolean().optional() }),
  update: z.object({ floorCount: z.number().int().min(1).max(3), floorFactorFoundation: z.number().min(0.5).max(3), isActive: z.boolean() }).partial(),
};
const bhkFields = {
  bedrooms: posInt(50), halls: posInt(20), kitchens: posInt(20), bathrooms: posInt(50), balconies: posInt(20), electricalPoints: posInt(500),
  doors: posInt(100), windows: posInt(100), persons: posInt(100), typicalMinSqm: z.number().min(5).max(2000), typicalMaxSqm: z.number().min(5).max(2000),
};
export const bhkConfigs = {
  create: z.object({ bhk: z.number().int().min(1).max(5), ...bhkFields }),
  update: z.object(bhkFields).partial(),
};
const multipliers = z.object(Object.fromEntries(GROUPS.map((g) => [g, mult]))).strict();
export const qualityTiers = {
  update: z.object({
    name, description: z.string().max(300), multipliers, steelKgPerSqm: z.number().min(10).max(120),
    benchmarkMinPerSqft: z.number().min(0).max(100000), benchmarkMaxPerSqft: z.number().min(0).max(100000),
  }).partial(),
};
export const structureTypes = {
  update: z.object({ name, maxFloorCount: z.number().int().min(1).max(3), costMultiplier: z.number().min(0.5).max(2), normOverrides: z.record(z.number().min(0.1).max(3)) }).partial(),
};
export const locations = {
  create: z.object({ state: name, district: name, taluka: z.string().max(100).optional(), displayName: name, costIndex: z.number().min(0.7).max(1.5), leadLiftFactor: z.number().min(0.8).max(1.5), isActive: z.boolean().optional() }),
  update: z.object({ state: name, district: name, taluka: z.string().max(100).nullable(), displayName: name, costIndex: z.number().min(0.7).max(1.5), leadLiftFactor: z.number().min(0.8).max(1.5), isActive: z.boolean() }).partial(),
};
export const materialCoefficients = {
  create: z.object({ itemCode: z.string().trim().min(1).max(40), material: z.enum(['cement_bag', 'sand_cum', 'aggregate_cum', 'brick_no', 'steel_kg', 'tile_sqm', 'paint_litre']), perUnit: z.number().min(0).max(100000) }),
  update: z.object({ perUnit: z.number().min(0).max(100000) }),
};
