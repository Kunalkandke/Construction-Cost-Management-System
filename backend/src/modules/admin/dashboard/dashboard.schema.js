import { z } from 'zod';
export const statsQuery = z.object({ range: z.enum(['7d', '30d', '90d']).default('30d') });
