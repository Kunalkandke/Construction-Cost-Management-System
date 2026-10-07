import { z } from 'zod';
import { pagingQuery } from '../crud.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const listQuery = pagingQuery.extend({
  userId: z.string().uuid().optional(), houseType: z.string().max(40).optional(), tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']).optional(),
  locationId: z.string().uuid().optional(), from: date.optional(), to: date.optional(),
  minAmount: z.coerce.number().min(0).optional(), maxAmount: z.coerce.number().min(0).optional(),
});
export const recalcQuery = z.object({ rateSetId: z.string().uuid().optional() });
