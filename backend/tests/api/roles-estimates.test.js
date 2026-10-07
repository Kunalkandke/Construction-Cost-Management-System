import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { RUN, getApp, register, login, metaConfig, sampleInput } from './helpers.js';

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe.skipIf(!RUN)('B3 role guards, B5 ownership, B7 rate change, B6 publish validation', () => {
  let app; let locId; let A; let B; let admin;
  beforeAll(async () => {
    app = await getApp();
    const cfg = await metaConfig(app);
    locId = cfg.locations.find((l) => l.displayName.startsWith('Chhatrapati')).id;
    A = await register(app); B = await register(app);
    const r = await login(app, process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
    admin = r.body.data?.accessToken;
  });

  it('B3: a normal user gets 403 on /admin', async () => {
    const r = await request(app).get('/api/v1/admin/users').set(auth(A.token));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
  });
  it('B3: super admin can list users', async () => {
    const r = await request(app).get('/api/v1/admin/users').set(auth(admin));
    expect(r.status).toBe(200);
    expect(r.body.meta.total).toBeGreaterThan(0);
  });
  it('guest can calculate; result has the required sections', async () => {
    const r = await request(app).post('/api/v1/estimates/calculate').send(sampleInput(locId));
    expect(r.status).toBe(200);
    const d = r.body.data;
    ['derived', 'categories', 'lineItems', 'subtotal', 'grandTotal', 'range', 'floorSplit', 'materials', 'labour', 'schedule', 'prediction', 'sensitivity', 'tierComparison', 'benchmark', 'ratesUsed', 'disclaimer'].forEach((k) => expect(d[k]).toBeDefined());
    expect(d.schedule.cashFlow.at(-1).cumulative).toBe(d.grandTotal);
  });
  it('B5: user B cannot read, edit or share user A estimates (404)', async () => {
    const created = await request(app).post('/api/v1/estimates').set(auth(A.token)).send({ ...sampleInput(locId), title: 'A house' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await request(app).get(`/api/v1/estimates/${id}`).set(auth(A.token))).status).toBe(200);
    expect((await request(app).get(`/api/v1/estimates/${id}`).set(auth(B.token))).status).toBe(404);
    expect((await request(app).patch(`/api/v1/estimates/${id}`).set(auth(B.token)).send({ title: 'x' })).status).toBe(404);
    expect((await request(app).post(`/api/v1/estimates/${id}/share`).set(auth(B.token))).status).toBe(404);
    const shared = await request(app).post(`/api/v1/estimates/${id}/share`).set(auth(A.token));
    const view = await request(app).get(`/api/v1/shared/${shared.body.data.shareToken}`);
    expect(view.status).toBe(200);
    expect(JSON.stringify(view.body)).not.toMatch(/userId|user_id|email/);
    await request(app).delete(`/api/v1/estimates/${id}/share`).set(auth(A.token));
    expect((await request(app).get(`/api/v1/shared/${shared.body.data.shareToken}`)).status).toBe(404);
  });
  it('B6: an incomplete rate set cannot be published', async () => {
    const created = await request(app).post('/api/v1/admin/rate-sets').set(auth(admin)).send({ name: `Empty ${Date.now()}`, fiscalYear: '2026-27' });
    expect(created.status).toBe(201);
    const pub = await request(app).post(`/api/v1/admin/rate-sets/${created.body.data.id}/publish`).set(auth(admin)).send({ confirm: true });
    expect(pub.status).toBe(400);
    expect(pub.body.error.details.length).toBeGreaterThan(0);
  });
  it('B7: editing a draft rate changes new estimates, saved estimates stay unchanged', async () => {
    const clone = await request(app).post('/api/v1/admin/rate-sets').set(auth(admin)).send({ name: `Clone ${Date.now()}`, fiscalYear: '2026-27', cloneFromActive: true });
    const setId = clone.body.data.id;
    const before = await request(app).post('/api/v1/estimates').set(auth(A.token)).send(sampleInput(locId));
    const items = await request(app).get(`/api/v1/admin/rate-sets/${setId}/items?q=R01`).set(auth(admin));
    const r01 = items.body.data.find((i) => i.itemCode === 'R01');
    await request(app).patch(`/api/v1/admin/rate-items/${r01.id}`).set(auth(admin)).send({ baseRate: r01.baseRate * 1.3 });
    const preview = await request(app).post(`/api/v1/admin/rate-sets/${setId}/preview`).set(auth(admin)).send({ input: sampleInput(locId) });
    expect(preview.body.data.grandTotal).toBeGreaterThan(before.body.data.grandTotal);
    const again = await request(app).get(`/api/v1/estimates/${before.body.data.id}`).set(auth(A.token));
    expect(again.body.data.grandTotal).toBe(before.body.data.grandTotal);
  });
  it('B11: calculate rejects LOAD_BEARING with G+2 and area outside 20-600', async () => {
    const lb = await request(app).post('/api/v1/estimates/calculate').send(sampleInput(locId, { floors: 'G+2', structureType: 'LOAD_BEARING' }));
    expect(lb.status).toBe(400);
    const big = await request(app).post('/api/v1/estimates/calculate').send(sampleInput(locId, { builtUpAreaSqm: 601 }));
    expect(big.status).toBe(400);
    expect(big.body.error.details[0].path).toBe('builtUpAreaSqm');
  });
  it('budget planner lands within 0.5% of the budget', async () => {
    const r = await request(app).post('/api/v1/estimates/budget-plan').send({ budget: 5000000, houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, locationId: locId });
    expect(r.status).toBe(200);
    r.body.data.tiers.filter((t) => t.feasible).forEach((t) => expect(Math.abs(t.grandTotal - 5000000) / 5000000).toBeLessThanOrEqual(0.005));
  });
});
