import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { env } from './config/env.js';
import { ENGINE_VERSION } from './config/constants.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import metaRoutes from './modules/meta/meta.routes.js';
import estimatesRoutes, { sharedRoutes } from './modules/estimates/estimates.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import adminRoutes from './modules/admin/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use((req, res, next) => { req.id = uuid(); res.setHeader('X-Request-Id', req.id); next(); });
  app.use(helmet());
  // Allow exact origins from CLIENT_ORIGIN env var, plus any Vercel preview deployments
  // for the same project (pattern: https://<project>-<hash>.vercel.app)
  const vercelPreviewRe = /^https:\/\/construction-cost-management-system-[a-z0-9]+\.vercel\.app$/;
  app.use(cors({
    origin: (origin, cb) => (!origin || env.clientOrigins.includes(origin) || vercelPreviewRe.test(origin) ? cb(null, true) : cb(null, false)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition', 'X-Request-Id', 'Retry-After'],
  }));
  app.use(compression());
  morgan.token('rid', (req) => req.id);
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? ':rid :remote-addr ":method :url" :status :res[content-length] - :response-time ms' : 'dev'));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(globalLimiter);

  app.get('/health', (req, res) => res.json({ status: 'ok', version: ENGINE_VERSION }));

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/meta', metaRoutes);
  api.use('/estimates', estimatesRoutes);
  api.use('/shared', sharedRoutes);
  api.use('/ai', aiRoutes);
  api.use('/admin', adminRoutes);
  api.use('/', contentRoutes); // /faqs, /contact
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
