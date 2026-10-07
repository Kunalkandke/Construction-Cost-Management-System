import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(5000),
  CLIENT_ORIGIN: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  JWT_ACCESS_SECRET: z.string().min(64, 'JWT_ACCESS_SECRET must be 64+ chars'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be 64+ chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('CCMS <no-reply@example.com>'),
  SUPERADMIN_EMAIL: z.string().email().optional(),
  SUPERADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Refuse to boot with missing or weak configuration (Section 5.5 "Secrets").
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${lines}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  smtpConfigured: Boolean(parsed.data.SMTP_HOST),
};
