import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { healthRoutes } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { accountRouter } from './routes/account.routes.js';
import { traineeRouter } from './routes/trainee.routes.js';
import { traineeTrainingRouter } from './routes/trainee-training.routes.js';
import { traineeQuizRouter, quizAttemptRouter } from './routes/quiz.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupRouter } from './routes/setup.routes.js';
import { organisationRegistrationRequestRouter } from './routes/organisation-registration-request.routes.js';
import { organisationAdminRouter } from './routes/organisation-admin.routes.js';
import { platformRouter } from './routes/platform.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json());

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Mount API Routers
  app.use(healthRoutes);
  app.use(authRouter);
  app.use(accountRouter);
  app.use(setupRouter);
  app.use(organisationRegistrationRequestRouter);
  app.use(organisationAdminRouter);
  app.use(platformRouter);
  app.use('/trainee', traineeRouter);
  app.use(traineeTrainingRouter);
  app.use('/trainee/campaign-items', traineeQuizRouter);
  app.use('/quiz-attempts', quizAttemptRouter);

  // Centralized fallback error handler (must be registered last)
  app.use(errorHandler);

  return app;
}
