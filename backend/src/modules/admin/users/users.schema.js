import { z } from 'zod';
import { pagingQuery } from '../crud.js';

export const listQuery = pagingQuery.extend({ role: z.enum(['user', 'admin', 'super_admin']).optional(), status: z.enum(['active', 'blocked']).optional() });
export const patchBody = z.object({
  name: z.string().trim().min(1).max(100).optional(), status: z.enum(['active', 'blocked']).optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
}).refine((b) => Object.keys(b).length > 0, 'Nothing to update');
export const confirmBody = z.object({ confirm: z.literal(true, { errorMap: () => ({ message: 'confirm must be true' }) }) });
