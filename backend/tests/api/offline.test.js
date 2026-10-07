// Runs without a database: boot, envelope, CORS, validation and auth guards that fail before any DB access.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

Object.assign(process.env, {
  NODE_ENV: 'test', CLIENT_ORIGIN: 'http://localhost:5173', APP_BASE_URL: 'http://localhost:5173',
  SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40),
  JWT_ACCESS_SECRET: 'a'.repeat(64), JWT_REFRESH_SECRET: 'b'.repeat(64),
});

let app;
beforeAll(async () => { app = (await import('../../src/app.js')).createApp(); });

describe('offline API behaviour (no database needed)', () => {
  it('GET /health returns ok with a request id header', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.headers['x-request-id']).toBeTruthy();
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
  it('unknown route returns the NOT_FOUND envelope without a stack trace', async () => {
    const r = await request(app).get('/api/v1/nope');
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    expect(JSON.stringify(r.body)).not.toMatch(/at .*\.js/);
  });
  it('CORS allows the configured origin and rejects others', async () => {
    const good = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(good.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('protected routes need a token (UNAUTHENTICATED)', async () => {
    for (const p of ['/api/v1/auth/me', '/api/v1/estimates', '/api/v1/admin/users']) {
      const r = await request(app).get(p);
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
  it('a garbage bearer token is rejected', async () => {
    const r = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not.a.jwt');
    expect(r.status).toBe(401);
  });
  it('register validates input with field paths (B11)', async () => {
    const r = await request(app).post('/api/v1/auth/register').send({ name: '', email: 'bad', password: 'short' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(r.body.error.details.map((d) => d.path)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
  it('weak and common passwords are rejected', async () => {
    const r = await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'a@b.co', password: 'password123' });
    expect(r.status).toBe(400);
  });
  it('refresh requires the X-Requested-With header (CSRF)', async () => {
    const r = await request(app).post('/api/v1/auth/refresh');
    expect(r.status).toBe(403);
  });
  it('estimate calculate validates body before touching the database', async () => {
    const r = await request(app).post('/api/v1/estimates/calculate').send({ houseType: 'PLOT_HOUSE' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('malformed JSON is a VALIDATION_ERROR, not a 500', async () => {
    const r = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(r.status).toBe(400);
  });
  it('contact form validates input', async () => {
    const r = await request(app).post('/api/v1/contact').send({ name: 'x' });
    expect(r.status).toBe(400);
  });
});
