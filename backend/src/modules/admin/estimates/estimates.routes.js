import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { idParams } from '../crud.js';
import * as c from './estimates.controller.js';
import * as s from './estimates.schema.js';

const r = Router();
r.get('/', validate({ query: s.listQuery }), c.list);
r.get('/export.csv', validate({ query: s.listQuery }), c.exportCsv);
r.get('/:id', validate({ params: idParams }), c.get);
r.get('/:id/recalculate', validate({ params: idParams, query: s.recalcQuery }), c.recalc);
r.delete('/:id', validate({ params: idParams }), c.remove);
export default r;
