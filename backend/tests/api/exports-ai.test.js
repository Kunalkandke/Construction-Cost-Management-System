import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { RUN, getApp, register, metaConfig, sampleInput } from './helpers.js';

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe.skipIf(!RUN)('B8 AI always returns schema-valid content; B9 exports', () => {
  let app; let token; let id;
  beforeAll(async () => {
    app = await getApp();
    const cfg = await metaConfig(app);
    token = (await register(app)).token;
    const created = await request(app).post('/api/v1/estimates').set(auth(token)).send(sampleInput(cfg.locations[0].id));
    id = created.body.data.id;
  });
  it('AI insights return status ok or fallback with the required schema (never an error page)', async () => {
    const r = await request(app).post(`/api/v1/estimates/${id}/ai-insights`).set(auth(token)).send({});
    expect(r.status).toBe(200);
    expect(['ok', 'fallback']).toContain(r.body.data.status);
    const c = r.body.data.content;
    expect(c.costSavingTips.length).toBeGreaterThanOrEqual(3);
    expect(c.risks.length).toBeGreaterThanOrEqual(3);
    expect(c.budgetOutlook.trend).toMatch(/RISING|STABLE|FALLING/);
    c.costSavingTips.forEach((t) => { expect(t.savingPctMax).toBeLessThanOrEqual(30); expect(t.savingAmountMax).toBeGreaterThanOrEqual(0); });
  });
  it('a second call returns the cached insight', async () => {
    const r = await request(app).post(`/api/v1/estimates/${id}/ai-insights`).set(auth(token)).send({});
    if (r.body.data.status === 'ok') expect(r.body.data.cached).toBe(true);
  });
  it('PDF export is a real PDF', async () => {
    const r = await request(app).get(`/api/v1/estimates/${id}/export/pdf`).set(auth(token)).buffer().parse((res, cb) => { const d = []; res.on('data', (c) => d.push(c)); res.on('end', () => cb(null, Buffer.concat(d))); });
    expect(r.status).toBe(200);
    expect(r.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(r.headers['content-disposition']).toMatch(/attachment/);
  });
  it('Excel export has the five sheets and a grand total formula that matches the API', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const r = await request(app).get(`/api/v1/estimates/${id}/export/xlsx`).set(auth(token)).buffer().parse((res, cb) => { const d = []; res.on('data', (c) => d.push(c)); res.on('end', () => cb(null, Buffer.concat(d))); });
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(r.body);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Summary', 'BOQ', 'Materials', 'Schedule', 'Assumptions']);
    const est = (await request(app).get(`/api/v1/estimates/${id}`).set(auth(token))).body.data;
    const boq = wb.getWorksheet('BOQ');
    let gt; boq.eachRow((row) => { if (row.getCell(1).value === 'GRAND TOTAL') gt = row.getCell(7).value; });
    expect(gt.formula).toBeTruthy();
    expect(gt.result).toBe(est.grandTotal);
  });
});
