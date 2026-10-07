import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { requireRole } from '../../../middleware/requireRole.js';
import { idParams } from '../crud.js';
import * as c from './norms.controller.js';
import * as s from './norms.schema.js';

const r = Router();
r.get('/', validate({ query: s.listQuery }), c.list);
r.get('/:id', validate({ params: idParams }), c.get);
r.post('/', validate({ body: s.createBody }), c.create);
r.patch('/:id', validate({ params: idParams, body: s.patchBody }), c.patch);
r.delete('/:id', requireRole('super_admin'), validate({ params: idParams }), c.remove);
export default r;
