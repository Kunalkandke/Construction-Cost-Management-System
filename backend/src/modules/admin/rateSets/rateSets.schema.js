import { z } from 'zod';
import { pagingQuery } from '../crud.js';

const base = {
  name: z.string().trim().min(1).max(120), fiscalYear: z.string().trim().regex(/^\d{4}-\d{2}$/, 'Use format 2026-27'),
  sourceLabel: z.string().trim().max(200).optional(), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), isVerified: z.boolean().optional(),
};
export const listQuery = pagingQuery.extend({ status: z.enum(['draft', 'published', 'archived']).optional() });
export const createBody = z.object({ ...base, cloneFromId: z.string().uuid().optional(), cloneFromActive: z.boolean().optional() });
export const patchBody = z.object(base).partial().refine((b) => Object.keys(b).length > 0, 'Nothing to update');
export const publishBody = z.object({ confirm: z.literal(true), acknowledgeChanges: z.boolean().optional() });
export const archiveBody = z.object({ confirm: z.literal(true) });
export const diffParams = z.object({ id: z.string().uuid(), otherId: z.string().uuid() });
export const previewBody = z.object({ input: z.record(z.any()), mode: z.enum(['QUICK', 'DETAILED']).default('DETAILED') });
