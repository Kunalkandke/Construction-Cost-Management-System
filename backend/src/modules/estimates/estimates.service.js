import { supabase, unwrap } from '../../config/supabase.js';
import { ApiError } from '../../utils/ApiError.js';
import { newShareToken } from '../../utils/tokens.js';
import { cleanText, parsePaging, pageMeta } from '../../utils/format.js';
import { calculate, budgetPlan, ENGINE_VERSION } from './engine/index.js';
import { getSettings, loadMaster, loadRates, loadHistory, countVerifiedProjects } from './estimates.data.js';

// Loads data and runs the pure engine. rateSetId lets admins preview a draft set.
export async function runEngine(rawInput, { mode = 'DETAILED', rateSetId } = {}) {
  const [settings, master, rates] = await Promise.all([getSettings(), loadMaster(), loadRates(rateSetId)]);
  const history = await loadHistory(settings);
  let m = master;
  if (settings.dynamic_band?.enabled && rawInput?.locationId && rawInput?.qualityTier) {
    m = { ...master, verifiedActualsCount: await countVerifiedProjects(rawInput.qualityTier, rawInput.locationId) };
  }
  return { result: calculate(rawInput, m, rates, settings, history, new Date(), { mode }), rates, master: m, settings };
}

export async function calculateOnly(input, mode) {
  return (await runEngine(input, { mode })).result;
}

const SUMMARY = 'id,title,mode,status,grand_total,cost_per_sqft,range_min,range_max,total_area_sqm,is_shared,location_id,rate_set_id,created_at,updated_at,inputs';

function itemRows(estimateId, result) {
  return result.lineItems.map((l, i) => ({
    estimate_id: estimateId, category: l.category, item_code: l.itemCode, description: l.description, unit: l.unit,
    quantity: l.quantity, rate: l.rate, amount: l.amount, labour_amount: l.labourAmount, source: l.source, floor_label: l.floorLabel, sort_order: i,
  }));
}
async function insertItems(estimateId, result) {
  const rows = itemRows(estimateId, result);
  for (let i = 0; i < rows.length; i += 500) unwrap(await supabase.from('estimate_items').insert(rows.slice(i, i + 500)), 'items.insert');
}
const columnsFrom = (result, rates) => ({
  mode: result.mode, inputs: result.inputs, derived: result.derived, results: result,
  grand_total: result.grandTotal, cost_per_sqft: result.costPerSqft, range_min: result.range.min, range_max: result.range.max,
  total_area_sqm: result.derived.totalAreaSqm, location_id: result.inputs.locationId, rate_set_id: rates.rateSet.id, engine_version: result.engineVersion,
});

export async function create(userId, body) {
  const { title, ...input } = body;
  const mode = body.mode === 'QUICK' ? 'QUICK' : 'DETAILED';
  const { result, rates } = await runEngine(input, { mode });
  const row = unwrap(await supabase.from('estimates').insert({ user_id: userId, title: cleanText(title || 'Untitled estimate', 120), status: 'final', ...columnsFrom(result, rates) }).select('*').single(), 'estimate.insert');
  await insertItems(row.id, result);
  return row;
}

export async function list(userId, q) {
  const p = parsePaging(q, ['created_at', 'updated_at', 'grand_total', 'title', 'cost_per_sqft']);
  let query = supabase.from('estimates').select(`${SUMMARY},categories:results->categories`, { count: 'exact' }).eq('user_id', userId).is('deleted_at', null);
  if (q.q) query = query.ilike('title', `%${q.q.replace(/[%_]/g, '')}%`);
  if (q.houseType) query = query.eq('inputs->>houseType', q.houseType);
  if (q.tier) query = query.eq('inputs->>qualityTier', q.tier);
  if (q.from) query = query.gte('created_at', q.from);
  if (q.to) query = query.lte('created_at', q.to.length === 10 ? `${q.to}T23:59:59Z` : q.to);
  const { data, error, count } = await query.order(p.sortField, { ascending: p.ascending }).range(p.from, p.to);
  if (error) { console.error('[estimates.list]', error.message); throw ApiError.internal(); }
  return { rows: data, meta: pageMeta(p, count) };
}

// Non-admin reads always include user_id; another user's record is NOT_FOUND, never FORBIDDEN.
export async function getOwned(userId, id) {
  const row = unwrap(await supabase.from('estimates').select('*').eq('id', id).eq('user_id', userId).is('deleted_at', null).maybeSingle(), 'estimate.get');
  if (!row) throw ApiError.notFound('Estimate not found');
  return row;
}

export async function update(userId, id, body) {
  const row = await getOwned(userId, id);
  const patch = {};
  if (body.title !== undefined) patch.title = cleanText(body.title, 120);
  if (body.inputs) {
    const mode = body.mode || row.mode;
    const { result, rates } = await runEngine(body.inputs, { mode });
    const prev = row.results || {};
    result.history = [{ grandTotal: prev.grandTotal, costPerSqft: prev.costPerSqft, rateSetName: prev.ratesUsed?.rateSetName, calculatedAt: row.updated_at, engineVersion: prev.engineVersion }, ...(prev.history || [])].slice(0, 10);
    Object.assign(patch, columnsFrom(result, rates));
    unwrap(await supabase.from('estimate_items').delete().eq('estimate_id', id), 'items.delete');
    unwrap(await supabase.from('estimates').update(patch).eq('id', id), 'estimate.update');
    await insertItems(id, result);
  } else {
    unwrap(await supabase.from('estimates').update(patch).eq('id', id), 'estimate.update');
  }
  return getOwned(userId, id);
}

export async function softDelete(userId, id) {
  await getOwned(userId, id);
  unwrap(await supabase.from('estimates').update({ deleted_at: new Date().toISOString(), is_shared: false, share_token: null }).eq('id', id), 'estimate.delete');
}

export async function duplicate(userId, id) {
  const row = await getOwned(userId, id);
  const copy = unwrap(await supabase.from('estimates').insert({
    user_id: userId, title: cleanText(`Copy of ${row.title}`, 120), mode: row.mode, inputs: row.inputs, derived: row.derived, results: row.results,
    grand_total: row.grand_total, cost_per_sqft: row.cost_per_sqft, range_min: row.range_min, range_max: row.range_max,
    total_area_sqm: row.total_area_sqm, location_id: row.location_id, rate_set_id: row.rate_set_id, engine_version: row.engine_version, status: row.status,
  }).select('*').single(), 'estimate.dup');
  if (row.results?.lineItems) await insertItems(copy.id, row.results);
  return copy;
}

export async function share(userId, id) {
  const row = await getOwned(userId, id);
  const token = row.share_token || newShareToken();
  unwrap(await supabase.from('estimates').update({ share_token: token, is_shared: true }).eq('id', id), 'estimate.share');
  return { shareToken: token, urlPath: `/shared/${token}` };
}
export async function unshare(userId, id) {
  await getOwned(userId, id);
  unwrap(await supabase.from('estimates').update({ share_token: null, is_shared: false }).eq('id', id), 'estimate.unshare');
}

// Sanitised read-only subset: no user id/email, no AI raw prompt.
export async function getShared(token) {
  const row = unwrap(await supabase.from('estimates').select('id,title,mode,inputs,results,grand_total,cost_per_sqft,created_at').eq('share_token', token).eq('is_shared', true).is('deleted_at', null).maybeSingle(), 'estimate.shared');
  if (!row) throw ApiError.notFound('This shared link is not available');
  const { history, ...results } = row.results || {};
  return { title: row.title, mode: row.mode, inputs: row.inputs, results, grandTotal: row.grand_total, costPerSqft: row.cost_per_sqft, createdAt: row.created_at, readOnly: true };
}

export async function compare(userId, ids) {
  const uniq = [...new Set(ids)];
  if (uniq.length < 2) throw ApiError.validation('Select at least 2 different estimates');
  const rows = unwrap(await supabase.from('estimates').select('id,title,inputs,results,grand_total,cost_per_sqft,total_area_sqm').in('id', uniq).eq('user_id', userId).is('deleted_at', null), 'compare');
  if (rows.length !== uniq.length) throw ApiError.notFound('Estimate not found');
  const ordered = uniq.map((id) => rows.find((r) => r.id === id));
  const keys = [...new Set(ordered.flatMap((r) => (r.results.categories || []).map((c) => c.key)))];
  const label = (k) => ordered.flatMap((r) => r.results.categories || []).find((c) => c.key === k)?.label || k;
  const base = Number(ordered[0].grand_total);
  const categories = keys.map((key) => {
    const values = ordered.map((r) => (r.results.categories || []).find((c) => c.key === key)?.amount ?? 0);
    return { key, label: label(key), values, lowestIndex: values.indexOf(Math.min(...values)), highestIndex: values.indexOf(Math.max(...values)) };
  });
  return {
    estimates: ordered.map((r) => ({
      id: r.id, title: r.title, inputs: r.inputs, grandTotal: Number(r.grand_total), costPerSqft: Number(r.cost_per_sqft), totalAreaSqm: Number(r.total_area_sqm),
      differenceAmount: Number(r.grand_total) - base, differencePct: base ? Math.round(((Number(r.grand_total) - base) / base) * 10000) / 100 : 0,
    })),
    categories,
  };
}

export async function budgetPlanner(body) {
  const [settings, master, rates] = await Promise.all([getSettings(), loadMaster(), loadRates()]);
  const tiers = budgetPlan(body, master, rates, settings, new Date());
  return { budget: body.budget, tiers, ratesUsed: { rateSetName: rates.rateSet.name, fiscalYear: rates.rateSet.fiscal_year, verified: rates.rateSet.is_verified }, disclaimer: settings.disclaimer_text };
}

export async function addActual(userId, estimateId, body) {
  const est = await getOwned(userId, estimateId);
  const known = (est.results?.categories || []).map((c) => c.key);
  if (!known.includes(body.category)) throw ApiError.validation('Unknown category for this estimate', [{ path: 'category', message: `Use one of: ${known.join(', ')}` }]);
  return unwrap(await supabase.from('project_actuals').insert({
    estimate_id: estimateId, user_id: userId, category: body.category, actual_amount: body.actualAmount,
    completed_on: body.completedOn || null, notes: body.notes ? cleanText(body.notes, 1000) : null,
  }).select('*').single(), 'actuals.insert');
}

export { ENGINE_VERSION };
