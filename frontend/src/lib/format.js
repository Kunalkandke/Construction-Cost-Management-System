// Display-only helpers. The frontend never calculates costs; it formats what the API returns.
export const SQM_TO_SQFT = 10.7639;

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const plain = (d) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 });

export const formatINR = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '-' : inr0.format(Math.round(Number(n))));
export const formatNumber = (n, d = 0) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '-' : plain(d).format(Number(n)));

// 19.5 L / 1.2 Cr
export function formatINRCompact(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  const v = Number(n);
  const abs = Math.abs(v);
  const trim = (x) => String(Math.round(x * 100) / 100);
  if (abs >= 1e7) return `${trim(v / 1e7)} Cr`;
  if (abs >= 1e5) return `${trim(v / 1e5)} L`;
  if (abs >= 1e3) return `${trim(v / 1e3)} K`;
  return formatINR(v);
}

export const round2 = (n) => Math.round(Number(n) * 100) / 100;
export const sqmToSqft = (sqm) => round2(Number(sqm) * SQM_TO_SQFT);
export const sqftToSqm = (sqft) => round2(Number(sqft) / SQM_TO_SQFT);
export const formatArea = (sqm, unit = 'sqm') => (unit === 'sqft' ? `${formatNumber(sqmToSqft(sqm), 0)} sqft` : `${formatNumber(sqm, 1)} sqm`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatMonth(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '-';
  return `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
}
export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const pct = (n, d = 1) => (n === null || n === undefined ? '-' : `${formatNumber(n, d)}%`);
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const titleCase = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const parseNumberInput = (s) => { const n = Number(String(s).replace(/,/g, '').trim()); return Number.isFinite(n) ? n : NaN; };
