import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, cleanText } from '../../utils/format.js';
import { supabase, unwrap } from '../../config/supabase.js';
import { validate } from '../../middleware/validate.js';
import { contactLimiter } from '../../middleware/rateLimit.js';
import { sendContactAck } from '../../utils/mailer.js';

const r = Router();
const contactBody = z.object({
  name: z.string().trim().min(1).max(100), email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(150).optional(), message: z.string().trim().min(5).max(3000), website: z.string().max(200).optional(),
});

r.get('/faqs', asyncHandler(async (req, res) => {
  ok(res, unwrap(await supabase.from('faqs').select('id,question,answer,sort_order').eq('is_active', true).order('sort_order'), 'faqs'));
}));

r.post('/contact', contactLimiter, validate({ body: contactBody }), asyncHandler(async (req, res) => {
  const { website, ...b } = req.body;
  if (!website) { // honeypot: bots fill "website"; pretend success without storing
    unwrap(await supabase.from('contact_messages').insert({ name: cleanText(b.name, 100), email: b.email, subject: cleanText(b.subject, 150), message: cleanText(b.message, 3000) }), 'contact');
    sendContactAck(b.email, b.name);
  }
  ok(res, { message: 'Thank you. We will get back to you soon.' }, undefined, 201);
}));
export default r;
