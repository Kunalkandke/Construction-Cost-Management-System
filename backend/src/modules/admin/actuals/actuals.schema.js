import { z } from 'zod';
import { pagingQuery } from '../crud.js';

export const listQuery = pagingQuery.extend({ verified: z.enum(['true', 'false']).optional(), estimateId: z.string().uuid().optional() });
export const verifyBody = z.object({ verified: z.boolean() });
export const applyBody = z.object({
  normKey: z.string().regex(/^[A-Z][A-Z0-9_]{1,60}$/), tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'ALL']).default('ALL'),
  factor: z.number().min(0.5).max(2), confirm: z.literal(true),
});
