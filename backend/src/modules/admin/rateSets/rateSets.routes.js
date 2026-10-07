import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { idParams } from '../crud.js';
import * as c from './rateSets.controller.js';
import * as s from './rateSets.schema.js';

const r = Router();
r.get('/', validate({ query: s.listQuery }), c.list);
r.post('/', validate({ body: s.createBody }), c.create);
r.get('/:id', validate({ params: idParams }), c.get);
r.patch('/:id', validate({ params: idParams, body: s.patchBody }), c.patch);
r.post('/:id/clone', validate({ params: idParams }), c.clone);
r.post('/:id/publish', validate({ params: idParams, body: s.publishBody }), c.publish);
r.post('/:id/archive', validate({ params: idParams, body: s.archiveBody }), c.archive);
r.get('/:id/diff/:otherId', validate({ params: s.diffParams }), c.diff);
r.post('/:id/preview', validate({ params: idParams, body: s.previewBody }), c.preview);
export default r;
