import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import dashboard from './dashboard/dashboard.routes.js';
import users from './users/users.routes.js';
import estimates from './estimates/estimates.routes.js';
import rateSets from './rateSets/rateSets.routes.js';
import rateItems from './rateItems/rateItems.routes.js';
import norms from './norms/norms.routes.js';
import masterData from './masterData/masterData.routes.js';
import aiAdmin from './aiAdmin/aiAdmin.routes.js';
import actuals from './actuals/actuals.routes.js';
import settings from './settings/settings.routes.js';
import audit from './audit/audit.routes.js';
import content from './content/content.routes.js';

// Everything under /api/v1/admin requires role admin or super_admin (super-only routes add requireRole("super_admin")).
const r = Router();
r.use(authRequired, requireRole('admin', 'super_admin'));
r.use('/', dashboard);                 // /dashboard/stats, /health
r.use('/users', users);
r.use('/estimates', estimates);
r.use('/rate-sets', rateSets);
r.use('/', rateItems);                 // /rate-sets/:id/items..., /rate-items/:itemId
r.use('/norms', norms);
r.use('/', masterData);                // /house-types, /floor-options, /bhk-configs, /quality-tiers, /structure-types, /locations, /material-coefficients
r.use('/ai', aiAdmin);
r.use('/actuals', actuals);
r.use('/settings', settings);
r.use('/audit-logs', audit);
r.use('/', content);                   // /faqs, /announcements, /contact-messages
export default r;
