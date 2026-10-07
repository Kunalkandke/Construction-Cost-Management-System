import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { requireRole } from '../../../middleware/requireRole.js';
import * as c from './settings.controller.js';
import { patchBody } from './settings.schema.js';

const r = Router();
r.get('/', c.list);
r.patch('/', requireRole('super_admin'), validate({ body: patchBody }), c.patch);
export default r;
