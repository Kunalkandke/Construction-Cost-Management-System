// Month helpers on "YYYY-MM" strings (no Date maths, so results are timezone independent).
const parse = (ym) => { const [y, m] = ym.split('-').map(Number); return y * 12 + (m - 1); };
export const monthOfDate = (date) => date.toISOString().slice(0, 7);
export function addMonths(ym, n) {
  const idx = parse(ym) + n;
  return `${String(Math.floor(idx / 12)).padStart(4, '0')}-${String((idx % 12) + 1).padStart(2, '0')}`;
}
export const monthDiff = (fromYm, toYm) => parse(toYm) - parse(fromYm);
