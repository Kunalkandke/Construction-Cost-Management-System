import { supabase, unwrap } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { writeAudit } from '../../../middleware/audit.js';
import { invalidateCaches } from '../../estimates/estimates.data.js';
import { SETTING_SCHEMAS } from './settings.schema.js';

export async function list() {
  return unwrap(await supabase.from('system_settings').select('key,value,updated_by,updated_at').order('key'), 'settings.list');
}

export async function update(ctx, values) {
  const details = [];
  const clean = {};
  for (const [key, val] of Object.entries(values)) {
    const schema = SETTING_SCHEMAS[key];
    if (!schema) { details.push({ path: key, message: 'Unknown setting' }); continue; }
    const r = schema.safeParse(val);
    if (!r.success) r.error.issues.forEach((i) => details.push({ path: [key, ...i.path].join('.'), message: i.message }));
    else clean[key] = r.data;
  }
  if (clean.dynamic_band && clean.dynamic_band.min > clean.dynamic_band.max) details.push({ path: 'dynamic_band', message: 'min must not exceed max' });
  if (details.length) throw ApiError.validation('Invalid settings', details);

  const keys = Object.keys(clean);
  const beforeRows = unwrap(await supabase.from('system_settings').select('key,value').in('key', keys), 'settings.before');
  const before = Object.fromEntries(beforeRows.map((r) => [r.key, r.value]));
  const rows = keys.map((key) => ({ key, value: clean[key], updated_by: ctx.actorId }));
  unwrap(await supabase.from('system_settings').upsert(rows), 'settings.upsert');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'settings.update', entity: 'system_settings', entityId: keys.join(','), before, after: clean, ip: ctx.ip });
  return list();
}
