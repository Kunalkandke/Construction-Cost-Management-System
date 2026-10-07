import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inr } from '../../utils/format.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(dir, '../../../assets/fonts');
const REG = path.join(FONT_DIR, 'NotoSans-Regular.ttf');
const BOLD = path.join(FONT_DIR, 'NotoSans-Bold.ttf');
const HAS_UNICODE = fs.existsSync(REG);
const RUPEE = HAS_UNICODE ? '\u20B9 ' : 'Rs. '; // default PDF fonts have no rupee glyph; drop Noto Sans into assets/fonts to enable it
const money = (n) => inr(n, RUPEE);

export const slug = (s) => String(s || 'estimate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'estimate';
export const exportFilename = (est, ext) => `CCMS-Estimate-${slug(est.title)}-${new Date(est.created_at || Date.now()).toISOString().slice(0, 10)}.${ext}`;

export function buildEstimatePdf(est, insight) {
  return new Promise((resolve, reject) => {
    const r = est.results;
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `CCMS Estimate - ${est.title}`, Author: 'CCMS' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const F = HAS_UNICODE ? 'body' : 'Helvetica';
    const FB = HAS_UNICODE ? (fs.existsSync(BOLD) ? 'bold' : 'body') : 'Helvetica-Bold';
    if (HAS_UNICODE) { doc.registerFont('body', REG); if (fs.existsSync(BOLD)) doc.registerFont('bold', BOLD); }
    const W = doc.page.width - 80;
    const BLUE = '#0B4F7C'; const INK = '#0F172A'; const MUTED = '#64748B';

    const ensure = (h) => { if (doc.y + h > doc.page.height - 70) doc.addPage(); };
    const h2 = (t) => { ensure(40); doc.moveDown(0.8).font(FB).fontSize(13).fillColor(BLUE).text(t); doc.moveDown(0.3).font(F).fontSize(9).fillColor(INK); };
    const para = (t) => { doc.font(F).fontSize(9).fillColor(INK).text(t, { width: W }); };
    const table = (cols, rows, opts = {}) => {
      const total = cols.reduce((a, c) => a + c.w, 0);
      const scale = W / total;
      const draw = (cells, bold, shade) => {
        const y = doc.y;
        if (shade) doc.rect(40, y - 2, W, 14).fill('#EAF2FB').fillColor(INK);
        let x = 40;
        cells.forEach((cell, i) => {
          doc.font(bold ? FB : F).fontSize(8).fillColor(INK).text(String(cell ?? ''), x + 2, y, { width: cols[i].w * scale - 4, align: cols[i].align || 'left', lineBreak: false, ellipsis: true });
          x += cols[i].w * scale;
        });
        doc.y = y + 14; doc.x = 40;
      };
      ensure(30); draw(cols.map((c) => c.label), true, true);
      rows.forEach((row) => { if (doc.y > doc.page.height - 75) { doc.addPage(); draw(cols.map((c) => c.label), true, true); } draw(row, opts.boldLast && row === rows[rows.length - 1], false); });
    };

    // Header
    doc.rect(0, 0, doc.page.width, 64).fill(BLUE);
    doc.font(FB).fontSize(18).fillColor('#FFFFFF').text('Construction Cost Management System', 40, 18);
    doc.font(F).fontSize(10).text('Planning-level cost estimate', 40, 42);
    doc.fillColor(INK).y = 80;
    doc.font(FB).fontSize(15).text(est.title, 40, 80, { width: W });
    doc.font(F).fontSize(9).fillColor(MUTED).text(`Generated ${new Date(est.created_at || Date.now()).toDateString()}  |  Engine ${r.engineVersion}  |  Mode ${r.mode}`);
    doc.moveDown(0.5);

    const i = r.inputs; const d = r.derived;
    h2('Input summary');
    para(`${i.houseType.replace('_', ' ')}, ${i.floors}, ${i.bhk}BHK (${i.bhkMode === 'PER_FLOOR' ? 'per floor' : 'whole house'}), ${d.totalAreaSqm} sqm total (${d.totalAreaSqft} sqft), ${i.qualityTier} tier, ${i.structureType.replace('_', ' ')}, soil ${i.soilType}, start ${i.startMonth}.`);

    h2('Key figures');
    table([{ w: 3, label: 'Grand total' }, { w: 2, label: 'Cost / sqft' }, { w: 4, label: 'Likely range (approx.)' }, { w: 2, label: 'Duration' }],
      [[money(r.grandTotal), money(r.costPerSqft), `${money(r.range.min)} - ${money(r.range.max)} (+/-${r.range.bandPercent}%)`, `${r.schedule.durationMonths} months`]]);

    h2('Cost by category');
    table([{ w: 4, label: 'Category' }, { w: 3, label: 'Amount', align: 'right' }, { w: 1.5, label: 'Share', align: 'right' }, { w: 3, label: 'Labour part', align: 'right' }],
      [...r.categories.map((c) => [c.label, money(c.amount), `${c.sharePct}%`, money(c.labourAmount)]),
        ['Subtotal', money(r.subtotal), '', ''], [`Contingency ${r.contingencyPercent}%`, money(r.contingency), '', ''],
        ...(r.softCosts ? [['Professional and statutory fees', money(r.softCosts), '', '']] : []), ...(r.gst ? [['GST', money(r.gst), '', '']] : []),
        ['Grand total', money(r.grandTotal), '', '']], { boldLast: true });

    h2('Floor-wise split');
    table([{ w: 5, label: 'Part' }, { w: 3, label: 'Amount', align: 'right' }], r.floorSplit.map((f) => [f.label, money(f.amount)]));

    const sorted = [...r.lineItems].sort((a, b) => b.amount - a.amount);
    const boqCols = [{ w: 1.2, label: 'Code' }, { w: 5, label: 'Item' }, { w: 1, label: 'Unit' }, { w: 1.6, label: 'Qty', align: 'right' }, { w: 1.6, label: 'Rate', align: 'right' }, { w: 2.2, label: 'Amount', align: 'right' }, { w: 1.6, label: 'Source' }];
    const boqRow = (l) => [l.itemCode, l.description, l.unit, l.quantity, inr(l.rate, ''), inr(l.amount, ''), l.source];
    h2('Top 15 BOQ lines by value');
    table(boqCols, sorted.slice(0, 15).map(boqRow));

    if (r.materials?.length) {
      h2('Material take-off (approximate)');
      table([{ w: 4, label: 'Material' }, { w: 3, label: 'Quantity', align: 'right' }, { w: 3, label: 'Unit' }], r.materials.map((m) => [m.label, m.quantity, m.unit]));
    }
    h2('Labour (a view of the cost, not an extra charge)');
    para(`Labour part: ${money(r.labour.totalAmount)} (${r.labour.sharePct}% of subtotal), about ${r.labour.mandays} man-days.`);

    h2('Schedule and cash flow');
    table([{ w: 5, label: 'Stage' }, { w: 2, label: 'Months' }, { w: 1.2, label: 'Share', align: 'right' }, { w: 3, label: 'Amount', align: 'right' }],
      r.schedule.stages.map((s) => [s.name, `${s.startMonth}-${s.endMonth}`, `${s.pct}%`, money(s.amount)]));
    doc.moveDown(0.4);
    table([{ w: 2, label: 'Month' }, { w: 2, label: 'Period' }, { w: 3, label: 'Spend', align: 'right' }, { w: 3, label: 'Cumulative', align: 'right' }],
      r.schedule.cashFlow.map((c) => [c.month, c.label, money(c.amount), money(c.cumulative)]));

    h2('Price escalation outlook');
    para(`If work runs to ${r.prediction.completionMonth}, the projected total is ${money(r.prediction.projectedTotal)} (${r.prediction.escalationPct}% above today's figure). Basis: ${r.prediction.basis === 'rate_history' ? 'historic rate data' : 'default escalation assumption'}.`);

    const c = insight?.content;
    if (c) {
      h2('AI guidance (verify with a registered engineer)');
      para(c.summary);
      doc.moveDown(0.3);
      c.costSavingTips.slice(0, 4).forEach((t) => para(`- ${t.title}: ${t.description} (indicative saving ${money(t.savingAmountMin)} - ${money(t.savingAmountMax)})`));
      doc.moveDown(0.3).font(FB).text('Risks');
      c.risks.forEach((x) => para(`- [${x.severity}] ${x.risk} Mitigation: ${x.mitigation}`));
    }

    h2('Assumptions and rates used');
    para(`Rate set: ${r.ratesUsed.rateSetName} (${r.ratesUsed.fiscalYear}) - ${r.ratesUsed.verified ? 'verified' : 'ILLUSTRATIVE, not verified against current SSR'}. Rates are priced from state SSR first; CPWD DSR only as a corrected fallback (${r.ratesUsed.fallbackItemCount} fallback item(s)). Quantities come from consumption norms and the BHK configuration. Contingency ${r.contingencyPercent}%.`);

    h2('Full bill of quantities');
    table(boqCols, r.lineItems.map(boqRow));

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p += 1) {
      doc.switchToPage(p);
      doc.page.margins.bottom = 0;
      doc.font(F).fontSize(7).fillColor(MUTED).text(r.disclaimer, 40, doc.page.height - 48, { width: W, align: 'center', lineBreak: true });
      doc.text(`Page ${p + 1} of ${range.count}`, 40, doc.page.height - 22, { width: W, align: 'center' });
    }
    doc.end();
  });
}
