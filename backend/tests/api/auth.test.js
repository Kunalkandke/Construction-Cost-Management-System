import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { RUN, getApp, H, register, login, uniqueEmail, PASSWORD } from './helpers.js';

describe.skipIf(!RUN)('B2 auth: register, login, refresh rotation, reuse detection, lockout', () => {
  let app;
  beforeAll(async () => { app = await getApp(); });

  it('registers, returns access token and sets an httpOnly refresh cookie', async () => {
    const { res } = await register(app);
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/ccms_rt=.*HttpOnly/);
  });
  it('duplicate email gives a generic CONFLICT', async () => {
    const { email } = await register(app);
    const again = await request(app).post('/api/v1/auth/register').send({ name: 'X', email, password: PASSWORD });
    expect(again.status).toBe(409);
  });
  it('login fails with the same message for unknown email and wrong password', async () => {
    const { email } = await register(app);
    const a = await login(app, email, 'Wrong-Pass-123');
    const b = await login(app, uniqueEmail('ghost'), 'Wrong-Pass-123');
    expect(a.status).toBe(401); expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });
  it('refresh rotates the token and detects reuse of the old one', async () => {
    const { cookie } = await register(app);
    const r1 = await request(app).post('/api/v1/auth/refresh').set(H).set('Cookie', cookie);
    expect(r1.status).toBe(200);
    const newCookie = r1.headers['set-cookie'];
    const reuse = await request(app).post('/api/v1/auth/refresh').set(H).set('Cookie', cookie); // old token
    expect(reuse.status).toBe(401);
    const afterTheft = await request(app).post('/api/v1/auth/refresh').set(H).set('Cookie', newCookie); // family revoked
    expect(afterTheft.status).toBe(401);
  });
  it('logout revokes the refresh token', async () => {
    const { cookie } = await register(app);
    expect((await request(app).post('/api/v1/auth/logout').set(H).set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).post('/api/v1/auth/refresh').set(H).set('Cookie', cookie)).status).toBe(401);
  });
  it('locks the account after 5 consecutive failures', async () => {
    const { email } = await register(app);
    for (let i = 0; i < 5; i += 1) await login(app, email, 'Wrong-Pass-123');
    const locked = await login(app, email, PASSWORD);
    expect([429]).toContain(locked.status);
  });
  it('forgot-password always succeeds (no user enumeration)', async () => {
    const r = await request(app).post('/api/v1/auth/forgot-password').send({ email: uniqueEmail('nobody') });
    expect(r.status).toBe(200);
  });
});
