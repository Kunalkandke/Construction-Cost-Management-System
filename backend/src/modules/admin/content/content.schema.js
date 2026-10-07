import { z } from 'zod';
import { pagingQuery } from '../crud.js';

const dt = z.string().datetime({ offset: true });
export const faq = {
  create: z.object({ question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(4000), sortOrder: z.number().int().min(0).max(1000).optional(), isActive: z.boolean().optional() }),
  update: z.object({ question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(4000), sortOrder: z.number().int().min(0).max(1000), isActive: z.boolean() }).partial(),
};
const annFields = { title: z.string().trim().min(1).max(150), body: z.string().trim().max(1000), kind: z.enum(['info', 'warning', 'success']), startsAt: dt.nullable(), endsAt: dt.nullable(), isActive: z.boolean() };
export const announcement = {
  create: z.object({ ...annFields, body: annFields.body.optional(), kind: annFields.kind.optional(), startsAt: dt.nullable().optional(), endsAt: dt.nullable().optional(), isActive: z.boolean().optional() }),
  update: z.object(annFields).partial(),
};
export const messagesQuery = pagingQuery.extend({ status: z.enum(['new', 'read', 'resolved']).optional() });
export const messagePatch = z.object({ status: z.enum(['new', 'read', 'resolved']).optional(), reply: z.string().trim().min(1).max(3000).optional() })
  .refine((b) => b.status !== undefined || b.reply !== undefined, 'Provide status and/or reply');
