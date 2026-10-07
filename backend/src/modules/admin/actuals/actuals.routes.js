import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { idParams } from '../crud.js';
import * as c from './actuals.controller.js';
import * as s from './actuals.schema.js';

const r = Router();
r.get('/', validate({ query: s.listQuery }), c.list);
r.get('/calibration', c.calibration);
r.post('/calibration/apply', validate({ body: s.applyBody }), c.apply);
r.patch('/:id', validate({ params: idParams, body: s.verifyBody }), c.verify);
export default r;
