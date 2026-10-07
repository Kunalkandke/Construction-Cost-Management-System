import { z } from 'zod';
import { COMMON_PASSWORDS } from '../../config/commonPasswords.js';

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password must be at most 72 bytes')
  .refine((p) => /[A-Za-z]/.test(p), 'Password must contain a letter')
  .refine((p) => /\d/.test(p), 'Password must contain a number')
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'This password is too common');

const email = z.string().trim().toLowerCase().email().max(254);
const text = (max) => z.string().trim().max(max);

export const registerBody = z.object({ name: text(100).min(1, 'Name is required'), email, password: passwordSchema, phone: text(20).optional() });
export const loginBody = z.object({ email, password: z.string().min(1).max(200) });
export const logoutBody = z.object({ all: z.boolean().optional() }).default({});
export const forgotBody = z.object({ email });
export const resetBody = z.object({ token: z.string().min(20).max(200), newPassword: passwordSchema });
export const patchMeBody = z.object({ name: text(100).min(1).optional(), phone: text(20).nullable().optional() });
export const changePasswordBody = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema });
