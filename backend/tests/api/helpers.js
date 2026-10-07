// Shared helpers for API tests. Integration tests need a real Supabase project with sql/001-005 applied
// and the super admin seeded; run with: RUN_API_TESTS=1 npm run test:api
import request from 'supertest';

export const RUN = process.env.RUN_API_TESTS === '1';
export async function getApp() {
  const { createApp } = await import('../../src/app.js');
  return createApp();
}
export const H = { 'X-Requested-With': 'ccms' };
export const uniqueEmail = (p = 'user') => `${p}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;
export const PASSWORD = 'Str0ng-Test-Pass';

export async function register(app, email = uniqueEmail()) {
  const res = await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email, password: PASSWORD });
  return { res, email, token: res.body.data?.accessToken, cookie: res.headers['set-cookie'] };
}
export async function login(app, email, password) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}
export async function metaConfig(app) {
  return (await request(app).get('/api/v1/meta/config')).body.data;
}
export const sampleInput = (locationId, over = {}) => ({
  houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, bhkMode: 'WHOLE_HOUSE', builtUpAreaSqm: 120, areaBasis: 'PER_FLOOR', qualityTier: 'STANDARD',
  locationId, structureType: 'RCC_FRAME', addons: [], ...over,
});
