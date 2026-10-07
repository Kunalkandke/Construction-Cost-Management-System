import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { requireRole } from '../../../middleware/requireRole.js';
import { idParams } from '../crud.js';
import * as c from './users.controller.js';
import * as s from './users.schema.js';

const r = Router();
r.get('/', validate({ query: s.listQuery }), c.list);
r.get('/:id', validate({ params: idParams }), c.get);
r.patch('/:id', validate({ params: idParams, body: s.patchBody }), c.patch);
r.post('/:id/revoke-sessions', validate({ params: idParams }), c.revoke);
r.post('/:id/reset-password', validate({ params: idParams }), c.reset);
r.delete('/:id', requireRole('super_admin'), validate({ params: idParams, body: s.confirmBody }), c.remove);
export default r;
