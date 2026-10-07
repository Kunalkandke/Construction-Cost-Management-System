import { z } from 'zod';
import { pagingQuery } from '../crud.js';

const v = z.number().min(0).max(1_000_000);
export const listQuery = pagingQuery.extend({ category: z.string().max(40).optional() });
export const createBody = z.object({
  key: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,60}$/, 'Use UPPER_SNAKE_CASE'), category: z.string().trim().min(1).max(40),
  description: z.string().trim().max(200).optional(), unit: z.string().trim().max(40).optional(),
  basic: v, standard: v, premium: v, notes: z.string().trim().max(300).optional(),
});
export const patchBody = z.object({
  category: z.string().trim().min(1).max(40), description: z.string().trim().max(200), unit: z.string().trim().max(40),
  basic: v, standard: v, premium: v, notes: z.string().trim().max(300).nullable(),
}).partial().refine((b) => Object.keys(b).length > 0, 'Nothing to update');
