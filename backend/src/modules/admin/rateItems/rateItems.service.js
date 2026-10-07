import { supabase, unwrap } from '../../../config/supabase.js';
import { ApiError } from '../../../utils/ApiError.js';
import { toSnake, parsePaging, pageMeta } from '../../../utils/format.js';
import { parseCsv, toCsv } from '../../../utils/csv.js';
import { writeAudit } from '../../../middleware/audit.js';
import { invalidateCaches } from '../../estimates/estimates.data.js';
import { getSet, diff } from '../rateSets/rateSets.service.js';
import { safeLike } from '../crud.js';
import { csvRow, CSV_HEADERS, MAX_CSV_ROWS } from './rateItems.schema.js';

async function draftSet(id) {
  const s = await getSet(id);
  if (s.status !== 'draft') throw ApiError.conflict('Rate items can only be changed while the set is a draft');
  return s;
}
async function itemSet(itemId) {
  const it = unwrap(await supabase.from('rate_items').select('*').eq('id', itemId).maybeSingle(), 'item.get');
  if (!it) throw ApiError.notFound('Rate item not found');
  await draftSet(it.rate_set_id);
  return it;
}

export async function list(setId, q) {
  await getSet(setId);
  const p = parsePaging(q, ['item_code', 'category', 'base_rate', 'created_at']);
  let query = supabase.from('rate_items').select('*', { count: 'exact' }).eq('rate_set_id', setId);
  if (q.category) query = query.eq('category', q.category);
  if (q.source) query = query.eq('source', q.source);
  if (q.q) query = query.or(`item_code.ilike.%${safeLike(q.q)}%,description.ilike.%${safeLike(q.q)}%`);
  const sortField = q.sort ? p.sortField : 'item_code';
  const { data, error, count } = await query.order(sortField, { ascending: q.sort ? p.ascending : true }).range(p.from, p.to);
  if (error) throw ApiError.internal();
  return { rows: data, meta: pageMeta(p, count) };
}

export async function create(ctx, setId, body) {
  await draftSet(setId);
  const row = unwrap(await supabase.from('rate_items').insert({ ...toSnake(body), rate_set_id: setId }).select('*').single(), 'item.create');
  await writeAudit({ actorId: ctx.actorId, action: 'rate_item.create', entity: 'rate_item', entityId: row.id, after: row, ip: ctx.ip });
  return row;
}
export async function update(ctx, itemId, patch) {
  const before = await itemSet(itemId);
  const row = unwrap(await supabase.from('rate_items').update(toSnake(patch)).eq('id', itemId).select('*').single(), 'item.update');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'rate_item.update', entity: 'rate_item', entityId: itemId, before, after: row, ip: ctx.ip });
  return row;
}
export async function remove(ctx, itemId) {
  const before = await itemSet(itemId);
  unwrap(await supabase.from('rate_items').delete().eq('id', itemId), 'item.delete');
  await writeAudit({ actorId: ctx.actorId, action: 'rate_item.delete', entity: 'rate_item', entityId: itemId, before, ip: ctx.ip });
}

export async function exportCsv(setId) {
  await getSet(setId);
  const rows = unwrap(await supabase.from('rate_items').select('*').eq('rate_set_id', setId).order('item_code'), 'item.export');
  return toCsv(rows, CSV_HEADERS.map((h) => h)); // header names equal DB column names (group is quoted by pg, plain here)
}

// CSV import (Section 9.2 step 2): staged dry run, then commit. Also used by scripts/import-rates.js.
export async function importCsv(ctx, setId, buffer, { dryRun = true } = {}) {
  await draftSet(setId);
  let records;
  try { records = parseCsv(buffer); } catch (e) { throw ApiError.validation(`CSV could not be read: ${e.message}`); }
  if (!records.length) throw ApiError.validation('CSV has no data rows');
  if (records.length > MAX_CSV_ROWS) throw ApiError.validation(`CSV has ${records.length} rows; the maximum is ${MAX_CSV_ROWS}`);
  const headers = Object.keys(records[0]);
  const missingHeaders = CSV_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length) throw ApiError.validation(`Missing CSV column(s): ${missingHeaders.join(', ')}`);

  const errors = []; const good = []; const seen = new Set();
  records.forEach((rec, idx) => {
    const line = idx + 2; // header is line 1
    const r = csvRow.safeParse(rec);
    if (!r.success) { r.error.issues.forEach((i) => errors.push({ row: line, itemCode: rec.item_code, field: i.path.join('.'), message: i.message })); return; }
    if (seen.has(r.data.item_code)) { errors.push({ row: line, itemCode: r.data.item_code, field: 'item_code', message: 'Duplicate item_code in file' }); return; }
    seen.add(r.data.item_code);
    good.push(r.data);
  });

  // diff vs the active set (added / changed with % / missing)
  const { data: active } = await supabase.from('rate_sets').select('id').eq('status', 'published').maybeSingle();
  let rateDiff = null;
  if (active) {
    const { data: old } = await supabase.from('rate_items').select('item_code,base_rate,dsr_rate').eq('rate_set_id', active.id);
    const O = Object.fromEntries((old || []).map((i) => [i.item_code, Number(i.base_rate ?? i.dsr_rate)]));
    const added = []; const changed = [];
    for (const g of good) {
      const n = g.base_rate ?? g.dsr_rate;
      if (!(g.item_code in O)) added.push({ itemCode: g.item_code, rate: n });
      else if (O[g.item_code] !== n) changed.push({ itemCode: g.item_code, oldRate: O[g.item_code], newRate: n, changePct: O[g.item_code] ? Math.round(((n - O[g.item_code]) / O[g.item_code]) * 1000) / 10 : null });
    }
    rateDiff = { added, changed, missing: Object.keys(O).filter((c) => !seen.has(c)).map((c) => ({ itemCode: c, rate: O[c] })) };
  }
  const summary = { totalRows: records.length, validRows: good.length, errorCount: errors.length };
  if (dryRun) return { dryRun: true, summary, errors: errors.slice(0, 500), diff: rateDiff };
  if (errors.length) throw ApiError.validation(`CSV has ${errors.length} error(s); nothing was imported`, errors.slice(0, 100).map((e) => ({ path: `row ${e.row} ${e.field}`, message: e.message })));

  const rows = good.map((g) => ({ rate_set_id: setId, ...g }));
  for (let i = 0; i < rows.length; i += 500) unwrap(await supabase.from('rate_items').upsert(rows.slice(i, i + 500), { onConflict: 'rate_set_id,item_code' }), 'item.import');
  invalidateCaches();
  await writeAudit({ actorId: ctx.actorId, action: 'rate_item.import', entity: 'rate_set', entityId: setId, after: summary, ip: ctx.ip });
  return { dryRun: false, summary, errors: [], diff: rateDiff };
}
export { diff };
