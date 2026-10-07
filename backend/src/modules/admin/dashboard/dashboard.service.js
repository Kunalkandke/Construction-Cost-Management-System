import { supabase, unwrap, fetchAll } from '../../../config/supabase.js';
import { dbPing } from '../../../config/supabase.js';

const count = async (q) => (await q).count || 0;
const tally = (arr, fn) => { const m = {}; arr.forEach((x) => { const k = fn(x); if (k !== undefined && k !== null) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count); };

// Section 9.1. Aggregated in the service (capped scan) to keep the SQL layer simple.
export async function stats(range) {
  const days = Number(range.replace('d', ''));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const head = (t) => supabase.from(t).select('id', { count: 'exact', head: true });

  const [totalUsers, newUsers, activeUsers, blockedUsers, totalEst, estInRange] = await Promise.all([
    count(head('users').is('deleted_at', null)), count(head('users').is('deleted_at', null).gte('created_at', since)),
    count(head('users').is('deleted_at', null).gte('last_login_at', since)), count(head('users').is('deleted_at', null).eq('status', 'blocked')),
    count(head('estimates').is('deleted_at', null)), count(head('estimates').is('deleted_at', null).gte('created_at', since)),
  ]);

  const ests = await fetchAll(() => supabase.from('estimates').select('created_at,inputs,grand_total,cost_per_sqft,location_id').is('deleted_at', null).gte('created_at', since).order('created_at'));
  const byDayMap = {};
  ests.forEach((e) => { const d = e.created_at.slice(0, 10); byDayMap[d] = (byDayMap[d] || 0) + 1; });
  const byDay = Array.from({ length: days }, (_, i) => { const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10); return { date: d, count: byDayMap[d] || 0 }; });

  const locs = unwrap(await supabase.from('locations').select('id,display_name'), 'dash.locs');
  const topLocations = tally(ests, (e) => e.location_id).slice(0, 10).map((l) => ({ locationId: l.key, name: locs.find((x) => x.id === l.key)?.display_name || 'Unknown', count: l.count }));
  const tiers = {};
  ests.forEach((e) => { const t = e.inputs?.qualityTier; if (!t) return; (tiers[t] ||= { n: 0, total: 0, sqft: 0 }); tiers[t].n += 1; tiers[t].total += Number(e.grand_total); tiers[t].sqft += Number(e.cost_per_sqft); });

  const ai = await fetchAll(() => supabase.from('ai_insights').select('status,latency_ms').gte('created_at', since));
  const aiOk = ai.filter((a) => a.status === 'ok'); const aiFb = ai.filter((a) => a.status === 'fallback');
  const lat = ai.filter((a) => a.latency_ms);

  const { data: active } = await supabase.from('rate_sets').select('*').eq('status', 'published').maybeSingle();
  let rates = null; const alerts = [];
  if (active) {
    const itemCount = await count(head('rate_items').eq('rate_set_id', active.id));
    const stale = await count(head('rate_items').eq('rate_set_id', active.id).lt('updated_at', new Date(Date.now() - 365 * 86400000).toISOString()));
    rates = { id: active.id, name: active.name, fiscalYear: active.fiscal_year, verified: active.is_verified, ageDays: Math.floor((Date.now() - new Date(active.published_at || active.created_at)) / 86400000), itemCount, staleItemCount: stale };
    if (!active.is_verified) alerts.push({ code: 'RATES_UNVERIFIED', severity: 'warning', message: 'The active rate set is not verified against the official SSR.' });
  } else alerts.push({ code: 'NO_PUBLISHED_RATE_SET', severity: 'danger', message: 'No rate set is published. Estimates cannot be calculated.' });
  const calibrated = await count(head('project_actuals').eq('verified', true));
  if (!calibrated) alerts.push({ code: 'NORMS_NEVER_CALIBRATED', severity: 'info', message: 'No verified project actuals yet; consumption norms have never been calibrated.' });
  const oldMsgs = await count(head('contact_messages').neq('status', 'resolved').lt('created_at', new Date(Date.now() - 3 * 86400000).toISOString()));
  if (oldMsgs) alerts.push({ code: 'OLD_CONTACT_MESSAGES', severity: 'warning', message: `${oldMsgs} contact message(s) unresolved for more than 3 days.` });

  const activity = unwrap(await supabase.from('audit_logs').select('id,action,entity,entity_id,actor_id,created_at').order('created_at', { ascending: false }).limit(10), 'dash.activity');

  return {
    range,
    users: { total: totalUsers, new: newUsers, active: activeUsers, blocked: blockedUsers },
    estimates: {
      total: totalEst, inRange: estInRange, byDay,
      byHouseType: tally(ests, (e) => e.inputs?.houseType), byTier: tally(ests, (e) => e.inputs?.qualityTier),
      byFloors: tally(ests, (e) => e.inputs?.floors), byBhk: tally(ests, (e) => e.inputs?.bhk), topLocations,
      avgByTier: Object.entries(tiers).map(([tier, t]) => ({ tier, count: t.n, avgGrandTotal: Math.round(t.total / t.n), avgCostPerSqft: Math.round(t.sqft / t.n) })),
    },
    ai: { calls: ai.length, successRate: ai.length ? Math.round((aiOk.length / ai.length) * 1000) / 10 : 0, fallbackRate: ai.length ? Math.round((aiFb.length / ai.length) * 1000) / 10 : 0, avgLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b.latency_ms, 0) / lat.length) : 0 },
    rates, alerts, recentActivity: activity, scanCapped: ests.length >= 20000,
  };
}

export async function health() {
  const [db, set] = await Promise.all([dbPing(), supabase.from('rate_sets').select('name,fiscal_year,is_verified').eq('status', 'published').maybeSingle()]);
  return { db, activeRateSet: set.data || null };
}
