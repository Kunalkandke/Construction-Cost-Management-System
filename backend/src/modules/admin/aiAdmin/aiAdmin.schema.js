import { z } from 'zod';

export const promptBody = z.object({ key: z.enum(['insights_system', 'insights_user']), template: z.string().trim().min(20).max(12000) })
  .refine((b) => b.key !== 'insights_user' || b.template.includes('{{CONTEXT_JSON}}'), { message: 'insights_user must contain {{CONTEXT_JSON}}', path: ['template'] });
export const promptsQuery = z.object({ key: z.enum(['insights_system', 'insights_user']).optional() });
export const testBody = z.object({ estimateId: z.string().uuid() });
export const usageQuery = z.object({ range: z.enum(['7d', '30d', '90d']).default('30d') });
export const aiSettingsBody = z.object({
  ai_enabled: z.boolean(), ai_model_override: z.string().trim().min(3).max(80).nullable(), ai_temperature: z.number().min(0).max(2),
  ai_daily_limit_user: z.number().int().min(0).max(1000), ai_daily_limit_guest: z.number().int().min(0).max(100), ai_max_output_tokens: z.number().int().min(256).max(8192),
}).partial().refine((b) => Object.keys(b).length > 0, 'Nothing to update');
export const AI_SETTING_KEYS = ['ai_enabled', 'ai_model_override', 'ai_temperature', 'ai_daily_limit_user', 'ai_daily_limit_guest', 'ai_max_output_tokens', 'ai_timeout_ms'];
