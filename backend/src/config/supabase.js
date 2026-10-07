import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { ApiError } from '../utils/ApiError.js';

// Service-role client: backend only. RLS is enabled with no policies, so nothing else can read data.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Convert a supabase-js { data, error } into data, or a safe INTERNAL_ERROR (details are logged, not leaked).
export function unwrap({ data, error }, label = 'db') {
  if (error) {
    console.error(`[${label}]`, error.code, error.message);
    if (error.code === '23505') throw ApiError.conflict('A record with these details already exists');
    if (error.code === '23503') throw ApiError.conflict('This record is referenced by other data');
    throw ApiError.internal();
  }
  return data;
}

// Page through large result sets (PostgREST caps a response at 1000 rows).
export async function fetchAll(buildQuery, cap = 20000) {
  const rows = [];
  const step = 1000;
  for (let from = 0; from < cap; from += step) {
    const { data, error } = await buildQuery().range(from, from + step - 1);
    if (error) { console.error('[fetchAll]', error.message); throw ApiError.internal(); }
    rows.push(...data);
    if (data.length < step) break;
  }
  return rows;
}

export async function dbPing() {
  const { error } = await supabase.from('system_settings').select('key').limit(1);
  return !error;
}
