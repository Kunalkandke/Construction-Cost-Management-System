import { parse } from 'csv-parse/sync';

export function parseCsv(buffer) {
  return parse(buffer, { columns: (h) => h.map((x) => String(x).trim()), skip_empty_lines: true, trim: true, bom: true });
}

const esc = (v) => {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows, columns) {
  const head = columns.join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(','));
  return [head, ...body].join('\n');
}
