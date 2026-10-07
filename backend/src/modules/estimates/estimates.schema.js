import { z } from 'zod';
import { estimateInputSchema } from './engine/inputs.js';

const uuid = z.string().uuid();
const title = z.string().trim().min(1).max(120);
export const idParams = z.object({ id: uuid });
export const tokenParams = z.object({ token: z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/) });
export const modeQuery = z.object({ mode: z.enum(['QUICK', 'DETAILED']).default('DETAILED') });

export const createBody = estimateInputSchema.extend({ title: title.optional(), mode: z.enum(['QUICK', 'DETAILED']).optional() });
export const patchBody = z.object({ title: title.optional(), inputs: estimateInputSchema.optional(), mode: z.enum(['QUICK', 'DETAILED']).optional() })
  .refine((b) => b.title !== undefined || b.inputs !== undefined, 'Provide title and/or inputs');
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(40).optional(), q: z.string().max(100).optional(),
  houseType: z.string().max(40).optional(), tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']).optional(),
  from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});
export const compareBody = z.object({ ids: z.array(uuid).min(2).max(4) });
export const budgetBody = z.object({
  budget: z.number().positive().max(10_000_000_000), houseType: z.string().max(40), floors: z.string().max(10),
  bhk: z.number().int(), bhkMode: z.enum(['WHOLE_HOUSE', 'PER_FLOOR']).optional(), locationId: uuid,
  structureType: z.enum(['RCC_FRAME', 'LOAD_BEARING']).default('RCC_FRAME'),
  tiers: z.array(z.enum(['BASIC', 'STANDARD', 'PREMIUM'])).max(3).optional(),
});
export const actualsBody = z.object({
  category: z.string().trim().min(1).max(40), actualAmount: z.number().min(0).max(10_000_000_000),
  completedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().trim().max(1000).optional(),
});
export const aiBody = z.object({ force: z.boolean().optional() }).default({});
