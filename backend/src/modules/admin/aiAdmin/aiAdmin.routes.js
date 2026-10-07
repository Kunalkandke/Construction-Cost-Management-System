import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { requireRole } from '../../../middleware/requireRole.js';
import { idParams } from '../crud.js';
import * as c from './aiAdmin.controller.js';
import * as s from './aiAdmin.schema.js';

const r = Router();
const sa = requireRole('super_admin');
r.get('/prompts', validate({ query: s.promptsQuery }), c.prompts);
r.post('/prompts', sa, validate({ body: s.promptBody }), c.createPrompt);
r.post('/prompts/:id/activate', sa, validate({ params: idParams }), c.activate);
r.post('/prompts/:id/test', sa, validate({ params: idParams, body: s.testBody }), c.test);
r.get('/usage', validate({ query: s.usageQuery }), c.usage);
r.get('/settings', c.settings);
r.patch('/settings', sa, validate({ body: s.aiSettingsBody }), c.patchSettings);
export default r;
