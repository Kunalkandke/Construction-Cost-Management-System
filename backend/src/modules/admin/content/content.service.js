import { supabase, unwrap } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { parsePaging, pageMeta } from '../../../utils/format.js';
import { writeAudit } from '../../../middleware/audit.js';
import { sendContactReply } from '../../../utils/mailer.js';
import { makeCrud, safeLike } from '../crud.js';

export const faqs = makeCrud({ table: 'faqs', entity: 'faq', searchCols: ['question'], sortable: ['sort_order', 'created_at'], defaultSort: 'sort_order', ascending: true });
export const announcements = makeCrud({ table: 'announcements', entity: 'announcement', searchCols: ['title'], sortable: ['created_at', 'starts_at'] });

export async function listMessages(q) {
  const p = parsePaging(q, ['created_at', 'status']);
  let query = supabase.from('contact_messages').select('*', { count: 'exact' });
  if (q.status) query = query.eq('status', q.status);
  if (q.q) query = query.or(`name.ilike.%${safeLike(q.q)}%,email.ilike.%${safeLike(q.q)}%,subject.ilike.%${safeLike(q.q)}%`);
  const { data, error, count } = await query.order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) throw ApiError.internal();
  return { rows: data, meta: pageMeta(p, count) };
}

export async function updateMessage(ctx, id, { status, reply }) {
  const before = unwrap(await supabase.from('contact_messages').select('*').eq('id', id).maybeSingle(), 'msg.get');
  if (!before) throw ApiError.notFound('Message not found');
  const patch = { handled_by: ctx.actorId };
  if (status) patch.status = status;
  let emailed = false;
  if (reply) { emailed = await sendContactReply(before.email, before.subject, reply); if (!status) patch.status = 'resolved'; }
  const row = unwrap(await supabase.from('contact_messages').update(patch).eq('id', id).select('*').single(), 'msg.update');
  await writeAudit({ actorId: ctx.actorId, action: reply ? 'contact.reply' : 'contact.update', entity: 'contact_message', entityId: id, before: { status: before.status }, after: { status: row.status, emailed }, ip: ctx.ip });
  return { ...row, emailed };
}
