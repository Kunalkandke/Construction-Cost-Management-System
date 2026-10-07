import { GoogleGenAI } from '@google/genai';
import { supabase, unwrap } from '../../config/supabase.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { sha256 } from '../../utils/tokens.js';
import { D, round } from '../../utils/money.js';
import { getSettings, loadMaster } from '../estimates/estimates.data.js';
import { insightResponseSchema, validateInsight } from './ai.schema.js';
import { getActivePrompts, buildContextJson, renderUserPrompt, fallbackInsight } from './ai.prompts.js';

let client = null;
const gemini = () => (client ||= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }));
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('AI_TIMEOUT')), ms))]);

async function callGemini({ system, user, settings }) {
  const model = settings.ai_model_override || env.GEMINI_MODEL;
  const t0 = Date.now();
  const res = await withTimeout(gemini().models.generateContent({
    model, contents: user,
    config: { systemInstruction: system, temperature: Number(settings.ai_temperature ?? 0.4), maxOutputTokens: Number(settings.ai_max_output_tokens ?? 2048), responseMimeType: 'application/json', responseSchema: insightResponseSchema },
  }), Number(settings.ai_timeout_ms ?? 20000));
  const usage = res.usageMetadata || {};
  return { text: res.text, model, tokensIn: usage.promptTokenCount ?? null, tokensOut: usage.candidatesTokenCount ?? null, latencyMs: Date.now() - t0 };
}

// Backend owns every rupee: AI gives a % range, we convert it with the category amount (indicative).
function finalise(content, result, settings) {
  const thr = settings.outlook_rising_threshold_percent ?? 3;
  const rising = result.prediction.escalationPct > thr;
  const trend = rising ? 'RISING' : content.budgetOutlook.trend === 'RISING' ? 'STABLE' : content.budgetOutlook.trend; // engine-derived trend wins
  return {
    ...content,
    costSavingTips: content.costSavingTips.map((t) => {
      const amt = D(result.categories.find((c) => c.key === t.category)?.amount ?? 0);
      return { ...t, savingAmountMin: round(amt.times(t.savingPctMin).div(100), 0).toNumber(), savingAmountMax: round(amt.times(t.savingPctMax).div(100), 0).toNumber(), indicative: true };
    }).sort((a, b) => b.savingAmountMax - a.savingAmountMax),
    budgetOutlook: { ...content.budgetOutlook, trend },
  };
}

const hashOf = (result, version) => sha256(JSON.stringify({ g: result.grandTotal, c: result.categories, i: result.inputs, r: result.ratesUsed?.rateSetId, v: version }));

async function runModel(result, district, settings, promptOverride) {
  const prompts = promptOverride || await getActivePrompts();
  if (!prompts) throw new Error('No active AI prompt');
  const ctx = buildContextJson(result, district);
  const user = renderUserPrompt(prompts.user.template, ctx);
  const keys = result.categories.map((c) => c.key);
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) { // one retry on invalid JSON
    const r = await callGemini({ system: prompts.system.template, user, settings });
    try {
      const content = validateInsight(JSON.parse(r.text), keys);
      return { content: finalise(content, result, settings), meta: r, version: prompts.system.version, raw: r.text };
    } catch (e) { lastErr = e; if (e.message === 'AI_TIMEOUT') throw e; }
  }
  throw new Error(`Invalid AI output: ${String(lastErr?.message).slice(0, 200)}`);
}

async function dailyCount(userId) {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase.from('ai_insights').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['ok', 'failed']).gte('created_at', since.toISOString());
  return count || 0;
}

async function district(master, locationId) {
  return master.locations.find((l) => l.id === locationId)?.district || 'Maharashtra';
}

// Generates (or returns cached) insights. Never throws for AI problems: falls back to rule-based content.
export async function generate({ result, estimateId = null, userId = null, force = false }) {
  const settings = await getSettings();
  const master = await loadMaster();
  const prompts = await getActivePrompts();
  const version = prompts?.system.version ?? 0;
  const hash = hashOf(result, version);

  if (estimateId) {
    const { data: cached } = await supabase.from('ai_insights').select('*').eq('estimate_id', estimateId).eq('status', 'ok').eq('results_hash', hash).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (cached) {
      const cooldownMs = Number(settings.ai_force_cooldown_minutes ?? 60) * 60000;
      const availableAt = new Date(new Date(cached.created_at).getTime() + cooldownMs);
      if (!force || availableAt > new Date()) {
        return { status: 'ok', content: cached.content, model: cached.model, generatedAt: cached.created_at, cached: true, regenerateAvailableAt: availableAt.toISOString() };
      }
    }
  }

  const log = async (row) => {
    const { data } = await supabase.from('ai_insights').insert({ estimate_id: estimateId, user_id: userId, type: 'SUGGESTIONS', prompt_key: 'insights_system', prompt_version: version, results_hash: hash, ...row }).select('created_at').single();
    return data?.created_at || new Date().toISOString();
  };
  const cooldown = () => new Date(Date.now() + Number(settings.ai_force_cooldown_minutes ?? 60) * 60000).toISOString();
  const fallback = async (reason) => {
    const content = fallbackInsight(result, settings);
    const at = await log({ model: null, content: estimateId ? content : null, status: 'fallback', error: reason });
    return { status: 'fallback', content, model: null, generatedAt: at, cached: false, regenerateAvailableAt: cooldown() };
  };

  if (!settings.ai_enabled) return fallback('AI disabled in settings');
  if (!env.GEMINI_API_KEY) return fallback('GEMINI_API_KEY not configured');
  if (userId) {
    const limit = Number(settings.ai_daily_limit_user ?? 20);
    if ((await dailyCount(userId)) >= limit) throw ApiError.rateLimited('Daily AI insight limit reached. Please try again tomorrow.');
  }
  try {
    const out = await runModel(result, await district(master, result.inputs.locationId), settings);
    const at = await log({ model: out.meta.model, content: estimateId ? out.content : null, tokens_in: out.meta.tokensIn, tokens_out: out.meta.tokensOut, latency_ms: out.meta.latencyMs, status: 'ok' });
    return { status: 'ok', content: out.content, model: out.meta.model, generatedAt: at, cached: false, regenerateAvailableAt: cooldown() };
  } catch (e) {
    console.error('[ai] falling back:', e.message);
    await log({ model: settings.ai_model_override || env.GEMINI_MODEL, status: 'failed', error: String(e.message).slice(0, 300) });
    return fallback(String(e.message).slice(0, 300));
  }
}

export async function latestFor(estimateId) {
  const row = unwrap(await supabase.from('ai_insights').select('*').eq('estimate_id', estimateId).in('status', ['ok', 'fallback']).not('content', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(), 'ai.latest');
  if (!row) throw ApiError.notFound('No AI insights generated yet');
  return { status: row.status, content: row.content, model: row.model, generatedAt: row.created_at, cached: true };
}

// Super-admin "test prompt": runs a stored prompt version against a saved estimate, returns raw output + validation.
export async function testPrompt(promptId, estimateId) {
  const prompt = unwrap(await supabase.from('ai_prompts').select('*').eq('id', promptId).maybeSingle(), 'ai.test');
  if (!prompt) throw ApiError.notFound('Prompt not found');
  const est = unwrap(await supabase.from('estimates').select('results').eq('id', estimateId).maybeSingle(), 'ai.test.est');
  if (!est) throw ApiError.notFound('Estimate not found');
  if (!env.GEMINI_API_KEY) throw ApiError.aiUnavailable('GEMINI_API_KEY is not configured');
  const settings = await getSettings();
  const active = await getActivePrompts();
  const pair = prompt.key === 'insights_user' ? { system: active.system, user: prompt } : { system: prompt, user: active.user };
  const master = await loadMaster();
  const ctx = buildContextJson(est.results, await district(master, est.results.inputs.locationId));
  const r = await callGemini({ system: pair.system.template, user: renderUserPrompt(pair.user.template, ctx), settings });
  let validation = { valid: true };
  try { validateInsight(JSON.parse(r.text), est.results.categories.map((c) => c.key)); } catch (e) { validation = { valid: false, error: e.message }; }
  return { raw: r.text, validation, model: r.model, latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut };
}

export const aiConfigured = () => Boolean(env.GEMINI_API_KEY);
