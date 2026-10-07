import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`CCMS API listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  console.log(`Allowed origins: ${env.clientOrigins.join(', ')}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
  process.exit(1);
});
const shutdown = (sig) => {
  console.log(`${sig} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
