import swaggerJsdoc from 'swagger-jsdoc';
import { APP_NAME } from '@insightful-phish/shared';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${APP_NAME} API`,
      version: '0.1.0',
      description: `
API documentation for ${APP_NAME}.

### Sprint 2 Note
Full endpoint coverage is optional for Sprint 2. This documentation serves as a proof-of-concept and will be expanded as features are finalized.
      `,
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/app.ts', './src/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
