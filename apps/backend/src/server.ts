import { env } from './config/env.js';
import { createApp } from './app.js';
import { startEmailDispatcher } from './services/email-dispatcher.service.js';

const app = createApp();
const emailDispatcher = startEmailDispatcher();

const server = app.listen(env.PORT, () => {
  console.log(`Insightful Phish backend running on http://localhost:${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.info('[Server] Shutdown requested', { signal });
  emailDispatcher.stop();

  server.close(() => {
    console.info('[Server] HTTP server stopped');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout', { signal });
    process.exit(1);
  }, 10_000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
