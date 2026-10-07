import { supabase } from '../config/supabase.js';

// Writes an audit_logs row. Never throws: auditing must not break the primary action.
export async function writeAudit({ actorId = null, action, entity, entityId = null, before = null, after = null, ip = null }) {
  const scrub = (o) => {
    if (!o || typeof o !== 'object') return o;
    const { password_hash, token_hash, ...rest } = o;
    return rest;
  };
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: actorId, action, entity, entity_id: entityId ? String(entityId) : null, before: scrub(before), after: scrub(after), ip,
  });
  if (error) console.error('[audit]', error.message);
}
