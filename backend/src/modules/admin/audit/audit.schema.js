import { z } from 'zod';
import { pagingQuery } from '../crud.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const listQuery = pagingQuery.extend({ actorId: z.string().uuid().optional(), entity: z.string().max(60).optional(), action: z.string().max(80).optional(), from: date.optional(), to: date.optional() });
