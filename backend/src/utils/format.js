// Response envelope, camelCase serialiser, paging and Indian-number helpers.
const JSONB_KEYS = new Set([
  'inputs', 'derived', 'results', 'content', 'template', 'multipliers', 'norm_overrides',
  'before', 'after', 'value', 'normOverrides',
]);

const camelKey = (k) => k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const snakeKey = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function toCamel(value, inJsonb = false) {
  if (Array.isArray(value)) return value.map((v) => toCamel(v, inJsonb));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (inJsonb) out[k] = v;
      else out[camelKey(k)] = toCamel(v, JSONB_KEYS.has(k));
    }
    return out;
  }
  return value;
}

// shallow: top-level request keys only (JSON columns keep their inner keys untouched)
export function toSnake(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[snakeKey(k)] = v;
  return out;
}

export function ok(res, data, meta, status = 200) {
  const body = { success: true, data: toCamel(data) };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function parsePaging(query = {}, allowedSort = []) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const from = (page - 1) * pageSize;
  let sortField = 'created_at';
  let ascending = false;
  if (query.sort) {
    const desc = String(query.sort).startsWith('-');
    const raw = String(query.sort).replace(/^[-+]/, '');
    const field = snakeKey(raw);
    if (allowedSort.includes(field)) { sortField = field; ascending = !desc; }
  }
  return { page, pageSize, from, to: from + pageSize - 1, sortField, ascending, q: query.q ? String(query.q).trim() : '' };
}
export const pageMeta = (p, total) => ({ page: p.page, pageSize: p.pageSize, total: total ?? 0 });

// Indian grouping, e.g. 1949420 -> "19,49,420". Formatting only, never used for calculation.
export function inr(n, prefix = 'Rs. ') {
  const neg = Number(n) < 0;
  const s = String(Math.round(Math.abs(Number(n)) || 0));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${prefix}${rest ? `${rest},${last3}` : last3}`;
}

export const cleanText = (s, max = 2000) =>
  String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

export const clientIp = (req) => req.ip || req.socket?.remoteAddress || null;
