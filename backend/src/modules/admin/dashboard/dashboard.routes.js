import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import * as c from './dashboard.controller.js';
import { statsQuery } from './dashboard.schema.js';

const r = Router();
r.get('/dashboard/stats', validate({ query: statsQuery }), c.stats);
r.get('/health', c.health);
export default r;
