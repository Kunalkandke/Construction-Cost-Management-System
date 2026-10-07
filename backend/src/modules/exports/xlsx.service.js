import ExcelJS from 'exceljs';

const INR_FMT = '[>=10000000]##\\,##\\,##\\,##0;[>=100000]##\\,##\\,##0;##,##0';
const HEAD = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F7C' } } };

function style(row) { row.eachCell((c) => Object.assign(c, HEAD)); }
function autofit(ws) {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: false }, (c) => { const v = c.value?.result ?? c.value; max = Math.max(max, Math.min(60, String(v ?? '').length + 2)); });
    col.width = max;
  });
}

export async function buildEstimateXlsx(est) {
  const r = est.results;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CCMS';

  // Summary first in tab order; its grand total references the BOQ formula cell
  const sum = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  const boq = wb.addWorksheet('BOQ', { views: [{ state: 'frozen', ySplit: 1 }] });
  boq.addRow(['Category', 'Code', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount', 'Labour', 'Source', 'Floor']);
  style(boq.getRow(1));
  const subtotalRefs = [];
  const cats = [...new Set(r.lineItems.map((l) => l.category))];
  for (const cat of cats) {
    const lines = r.lineItems.filter((l) => l.category === cat);
    const first = boq.rowCount + 1;
    lines.forEach((l) => {
      const row = boq.addRow([cat, l.itemCode, l.description, l.unit, l.quantity, l.rate, null, l.labourAmount, l.source, l.floorLabel]);
      row.getCell(7).value = { formula: `ROUND(E${row.number}*F${row.number},0)`, result: l.amount }; // same whole-rupee rule as the engine
    });
    const last = boq.rowCount;
    const sub = boq.addRow([`${cat} subtotal`, '', '', '', '', '', null, null]);
    sub.getCell(7).value = { formula: `SUM(G${first}:G${last})`, result: lines.reduce((a, l) => a + l.amount, 0) };
    sub.getCell(8).value = { formula: `SUM(H${first}:H${last})`, result: lines.reduce((a, l) => a + l.labourAmount, 0) };
    sub.font = { bold: true };
    subtotalRefs.push(`G${sub.number}`);
  }
  boq.addRow([]);
  const sRow = boq.addRow(['Subtotal']); sRow.getCell(7).value = { formula: subtotalRefs.join('+') || '0', result: r.subtotal };
  const cRow = boq.addRow([`Contingency ${r.contingencyPercent}%`]); cRow.getCell(7).value = { formula: `ROUND(G${sRow.number}*${r.contingencyPercent}/100,0)`, result: r.contingency };
  const parts = [`G${sRow.number}`, `G${cRow.number}`];
  if (r.softCosts) { const x = boq.addRow(['Professional and statutory fees']); x.getCell(7).value = r.softCosts; parts.push(`G${x.number}`); }
  if (r.gst) { const x = boq.addRow(['GST']); x.getCell(7).value = r.gst; parts.push(`G${x.number}`); }
  const gRow = boq.addRow(['GRAND TOTAL']); gRow.getCell(7).value = { formula: parts.join('+'), result: r.grandTotal }; gRow.font = { bold: true };
  boq.getColumn(5).numFmt = '#,##0.000'; boq.getColumn(6).numFmt = '#,##0.00'; boq.getColumn(7).numFmt = INR_FMT; boq.getColumn(8).numFmt = INR_FMT;
  autofit(boq);

  sum.addRow(['Field', 'Value']); style(sum.getRow(1));
  const i = r.inputs; const d = r.derived;
  [['Title', est.title], ['Mode', r.mode], ['House type', i.houseType], ['Floors', i.floors], ['BHK', i.bhk], ['BHK mode', i.bhkMode],
    ['Total area (sqm)', d.totalAreaSqm], ['Total area (sqft)', d.totalAreaSqft], ['Quality tier', i.qualityTier], ['Structure', i.structureType], ['Soil', i.soilType], ['Start month', i.startMonth],
    ['Subtotal', r.subtotal], ['Contingency', r.contingency], ['Soft costs', r.softCosts], ['GST', r.gst]].forEach((x) => sum.addRow(x));
  const g = sum.addRow(['Grand total', null]); g.getCell(2).value = { formula: `BOQ!G${gRow.number}`, result: r.grandTotal }; g.font = { bold: true };
  sum.addRow(['Cost per sqft', r.costPerSqft]);
  sum.addRow(['Likely range (min)', r.range.min]); sum.addRow(['Likely range (max)', r.range.max]); sum.addRow(['Accuracy band %', r.range.bandPercent]);
  sum.addRow([]); sum.addRow(['Category', 'Amount']); style(sum.getRow(sum.rowCount));
  r.categories.forEach((c) => sum.addRow([c.label, c.amount]));
  sum.getColumn(2).numFmt = INR_FMT; autofit(sum);

  const mat = wb.addWorksheet('Materials', { views: [{ state: 'frozen', ySplit: 1 }] });
  mat.addRow(['Material', 'Quantity', 'Unit']); style(mat.getRow(1));
  r.materials.forEach((m) => mat.addRow([m.label, m.quantity, m.unit]));
  mat.addRow([]); mat.addRow(['Labour total', r.labour.totalAmount]); mat.addRow(['Labour share %', r.labour.sharePct]); mat.addRow(['Man-days', r.labour.mandays]);
  autofit(mat);

  const sch = wb.addWorksheet('Schedule', { views: [{ state: 'frozen', ySplit: 1 }] });
  sch.addRow(['Stage', 'Start month', 'End month', 'Share %', 'Amount']); style(sch.getRow(1));
  r.schedule.stages.forEach((s) => sch.addRow([s.name, s.startMonth, s.endMonth, s.pct, s.amount]));
  sch.addRow([]); const h = sch.addRow(['Month', 'Period', 'Spend', 'Cumulative']); style(h);
  r.schedule.cashFlow.forEach((c) => sch.addRow([c.month, c.label, c.amount, c.cumulative]));
  sch.getColumn(5).numFmt = INR_FMT; sch.getColumn(3).numFmt = INR_FMT; sch.getColumn(4).numFmt = INR_FMT; autofit(sch);

  const as = wb.addWorksheet('Assumptions');
  as.addRow(['Item', 'Detail']); style(as.getRow(1));
  [['Rate set', `${r.ratesUsed.rateSetName} (${r.ratesUsed.fiscalYear})`], ['Rates verified', r.ratesUsed.verified ? 'Yes' : 'No - illustrative'],
    ['Fallback (DSR) items', r.ratesUsed.fallbackItemCount], ['Engine version', r.engineVersion], ['Escalation basis', r.prediction.basis],
    ['Projected total at completion', r.prediction.projectedTotal], ['Disclaimer', r.disclaimer]].forEach((x) => as.addRow(x));
  as.getColumn(2).width = 90; as.getColumn(1).width = 30;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
