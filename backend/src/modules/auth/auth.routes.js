import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authRequired } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { requireCsrfHeader } from '../../middleware/requireRole.js';
import * as c from './auth.controller.js';
import * as s from './auth.schema.js';

const r = Router();
r.post('/register', authLimiter, validate({ body: s.registerBody }), c.register);
r.post('/login', authLimiter, validate({ body: s.loginBody }), c.login);
r.post('/refresh', requireCsrfHeader, c.refresh); // global limiter applies; not the 10/15min login limiter
r.post('/logout', requireCsrfHeader, validate({ body: s.logoutBody }), c.logout);
r.post('/forgot-password', authLimiter, validate({ body: s.forgotBody }), c.forgot);
r.post('/reset-password', authLimiter, validate({ body: s.resetBody }), c.reset);
r.get('/me', authRequired, c.me);
r.patch('/me', authRequired, validate({ body: s.patchMeBody }), c.patchMe);
r.post('/change-password', authRequired, validate({ body: s.changePasswordBody }), c.changePassword);
export default r;
