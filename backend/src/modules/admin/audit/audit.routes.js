import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { requireRole } from '../../../middleware/requireRole.js';
import * as c from './audit.controller.js';
import { listQuery } from './audit.schema.js';

const r = Router();
r.get('/', validate({ query: listQuery }), c.list);
r.get('/export.csv', requireRole('super_admin'), validate({ query: listQuery }), c.exportCsv);
export default r;
