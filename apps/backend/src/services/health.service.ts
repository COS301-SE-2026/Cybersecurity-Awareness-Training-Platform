import { APP_NAME } from '@insightful-phish/shared';
import { checkDatabaseConnection } from '../repositories/health.repository.js';

export interface HealthStatusDto {
  app: string;
  api: 'working';
  database: 'connected' | 'not connected';
  timestamp: string;
}

export async function getHealthStatus(): Promise<{
  statusCode: 200 | 500;
  body: HealthStatusDto;
}> {
  try {
    await checkDatabaseConnection();

    return {
      statusCode: 200,
      body: {
        app: APP_NAME,
        api: 'working',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: {
        app: APP_NAME,
        api: 'working',
        database: 'not connected',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
