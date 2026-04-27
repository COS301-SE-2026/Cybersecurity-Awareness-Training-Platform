import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { APP_NAME } from '@insightful-phish/shared';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return res.json({
        app: APP_NAME,
        api: 'working',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch {
      return res.status(500).json({
        app: APP_NAME,
        api: 'working',
        database: 'not connected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return app;
}
