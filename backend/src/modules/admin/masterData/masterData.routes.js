import { Router } from 'express';
import { routers } from './masterData.controller.js';

const r = Router();
Object.entries(routers).forEach(([path, router]) => r.use(`/${path}`, router));
export default r;
