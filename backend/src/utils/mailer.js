import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport = null;
const get = () => {
  if (!env.smtpConfigured) return null;
  transport ||= nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transport;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrap = (title, body) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0F172A">
<h2 style="color:#0B4F7C;margin:0 0 16px">${esc(title)}</h2>${body}
<p style="color:#64748B;font-size:12px;margin-top:24px">Construction Cost Management System. Planning-level estimates only.</p></div>`;
const button = (href, label) => `<p><a href="${esc(href)}" style="background:#0B5A8C;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;display:inline-block">${esc(label)}</a></p><p style="font-size:12px;color:#64748B">If the button does not work, open: ${esc(href)}</p>`;

export async function sendMail({ to, subject, html, devLog }) {
  const t = get();
  if (!t) {
    if (!env.isProd) console.log(`[mail:dev] To: ${to} | ${subject}${devLog ? ` | ${devLog}` : ''}`);
    return false;
  }
  try { await t.sendMail({ from: env.MAIL_FROM, to, subject, html }); return true; } catch (e) { console.error('[mail] failed:', e.message); return false; }
}

export const sendPasswordReset = (to, link, adminInitiated = false) => sendMail({
  to, subject: 'Reset your CCMS password', devLog: link,
  html: wrap('Reset your password', `<p>${adminInitiated ? 'An administrator requested a password reset for your account.' : 'We received a request to reset your password.'} This link works for 30 minutes and can be used once.</p>${button(link, 'Choose a new password')}<p style="font-size:13px">If you did not expect this email, you can ignore it.</p>`),
});
export const sendContactAck = (to, name) => sendMail({
  to, subject: 'We received your message', html: wrap('Thank you', `<p>Hi ${esc(name)}, we received your message and will reply soon.</p>`),
});
export const sendContactReply = (to, subject, text) => sendMail({
  to, subject: `Re: ${subject || 'Your message'}`, html: wrap('Reply from CCMS', `<p style="white-space:pre-wrap">${esc(text)}</p>`),
});
