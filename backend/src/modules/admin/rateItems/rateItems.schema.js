import { z } from 'zod';
import { pagingQuery } from '../crud.js';
import { SOURCES, GROUPS } from '../../../config/constants.js';

const rate = z.number().min(0).max(100000000);
const itemFields = {
  itemCode: z.string().trim().min(1).max(40), category: z.string().trim().min(1).max(40), description: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(20), baseRate: rate.nullable().optional(), dsrRate: rate.nullable().optional(),
  source: z.enum(SOURCES).default('CUSTOM'), sourceRef: z.string().trim().max(120).nullable().optional(),
  labourPct: z.number().min(0).max(100).default(0), leadLiftApplied: z.boolean().default(false),
  group: z.enum(GROUPS), isActive: z.boolean().default(true),
};
export const createBody = z.object(itemFields).refine((b) => b.baseRate != null || b.dsrRate != null, 'Provide baseRate or dsrRate');
export const patchBody = z.object(itemFields).partial().refine((b) => Object.keys(b).length > 0, 'Nothing to update');
export const listQuery = pagingQuery.extend({ category: z.string().max(40).optional(), source: z.enum(SOURCES).optional() });
export const setParams = z.object({ id: z.string().uuid() });
export const itemParams = z.object({ itemId: z.string().uuid() });
export const importQuery = z.object({ dryRun: z.enum(['true', 'false']).default('true').transform((v) => v === 'true') });

// one CSV row (all strings) -> typed row
const num = (label) => z.string().optional().transform((s, ctx) => {
  if (s === undefined || s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100000000) { ctx.addIssue({ code: 'custom', message: `${label} must be a number between 0 and 100000000` }); return z.NEVER; }
  return n;
});
export const csvRow = z.object({
  item_code: z.string().trim().min(1).max(40), category: z.string().trim().min(1).max(40), description: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(20), base_rate: num('base_rate'), dsr_rate: num('dsr_rate'),
  source: z.enum(SOURCES), source_ref: z.string().max(120).optional().transform((s) => s || null),
  labour_pct: z.string().transform((s, ctx) => { const n = Number(s === '' ? 0 : s); if (!Number.isFinite(n) || n < 0 || n > 100) { ctx.addIssue({ code: 'custom', message: 'labour_pct must be between 0 and 100' }); return z.NEVER; } return n; }),
  group: z.enum(GROUPS),
}).refine((r) => r.base_rate !== null || r.dsr_rate !== null, { message: 'Provide base_rate or dsr_rate', path: ['base_rate'] });
export const CSV_HEADERS = ['item_code', 'category', 'description', 'unit', 'base_rate', 'dsr_rate', 'source', 'source_ref', 'labour_pct', 'group'];
export const MAX_CSV_ROWS = 5000;
