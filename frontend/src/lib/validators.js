import { z } from 'zod';

// Mirrors the backend rules (Section 7.1 / 5.1) so users see the same messages before the request.
const hasMax2Decimals = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export const areaSchema = (limits = { minAreaSqm: 20, maxAreaSqm: 600 }) =>
  z.number({ invalid_type_error: 'Enter the built-up area', required_error: 'Enter the built-up area' })
    .min(limits.minAreaSqm, `Built-up area must be between ${limits.minAreaSqm} and ${limits.maxAreaSqm} sqm`)
    .max(limits.maxAreaSqm, `Built-up area must be between ${limits.minAreaSqm} and ${limits.maxAreaSqm} sqm`)
    .refine(hasMax2Decimals, 'Area may have at most 2 decimals');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine((p) => /[A-Za-z]/.test(p), 'Password must contain a letter')
  .refine((p) => /\d/.test(p), 'Password must contain a number')
  .refine((p) => new TextEncoder().encode(p).length <= 72, 'Password must be at most 72 bytes');

export const loginSchema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  password: passwordSchema,
  confirm: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms' }) }),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export const forgotSchema = z.object({ email: z.string().trim().email('Enter a valid email') });
export const resetSchema = z.object({ newPassword: passwordSchema, confirm: z.string() }).refine((d) => d.newPassword === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordSchema, confirm: z.string() }).refine((d) => d.newPassword === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export const profileSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(100), phone: z.string().trim().max(20).optional() });
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100), email: z.string().trim().email('Enter a valid email'),
  subject: z.string().trim().max(150).optional(), message: z.string().trim().min(5, 'Message must be at least 5 characters').max(3000), website: z.string().max(0).optional(),
});
export const budgetSchema = z.object({ budget: z.number({ invalid_type_error: 'Enter your budget' }).min(100000, 'Budget must be at least 1,00,000').max(1e10) });

export function passwordStrength(p = '') {
  const checks = [p.length >= 8, /[A-Za-z]/.test(p), /\d/.test(p), p.length >= 12 && /[^A-Za-z0-9]/.test(p)];
  return { score: checks.filter(Boolean).length, checks };
}

// Wizard step validity (Next is disabled until valid)
export function stepValid(step, w, meta) {
  const limits = meta?.limits || { minAreaSqm: 20, maxAreaSqm: 600 };
  switch (step) {
    case 1: return Boolean(w.houseType);
    case 2: return w.houseType === 'FLAT' || Boolean(w.floors);
    case 3: return Boolean(w.bhk);
    case 4: return areaSchema(limits).safeParse(w.builtUpAreaSqm).success && Boolean(w.qualityTier) && Boolean(w.locationId) && Boolean(w.structureType);
    default: return true;
  }
}
