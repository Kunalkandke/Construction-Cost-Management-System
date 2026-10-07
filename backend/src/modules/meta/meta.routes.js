import { Router } from 'express';
import * as c from './meta.controller.js';

const r = Router();
r.get('/config', c.config);
r.get('/addons', c.addons);
export default r;
