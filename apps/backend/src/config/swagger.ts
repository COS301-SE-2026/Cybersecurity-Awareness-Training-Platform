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
    tags: [
      {
        name: 'Health',
        description: 'Service health and readiness checks.',
      },
      {
        name: 'Auth',
        description: 'Authentication and current user endpoints.',
      },
      {
        name: 'Trainee Simulation',
        description: 'Trainee simulated phishing email workflows.',
      },
      {
        name: 'Trainee Training',
        description: 'Trainee training document workflows.',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token returned by the authentication endpoints.',
        },
      },
      schemas: {
        HealthStatus: {
          type: 'object',
          required: ['app', 'api', 'database', 'timestamp'],
          properties: {
            app: {
              type: 'string',
              example: APP_NAME,
            },
            api: {
              type: 'string',
              enum: ['working'],
              example: 'working',
            },
            database: {
              type: 'string',
              enum: ['connected', 'not connected'],
              example: 'connected',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-05-11T20:44:54.000Z',
            },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          required: ['error', 'message'],
          properties: {
            error: {
              type: 'string',
              description: 'Stable application error code.',
              example: 'AUTH_REQUIRED',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message.',
              example: 'Authentication credentials are required',
            },
          },
        },
        ValidationErrorDetail: {
          type: 'object',
          required: ['field', 'message'],
          properties: {
            field: {
              type: 'string',
              description: 'Request field path that failed validation.',
              example: 'email',
            },
            message: {
              type: 'string',
              description: 'Validation failure message.',
              example: 'Invalid email',
            },
          },
        },
        ValidationErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/ApiErrorResponse',
            },
            {
              type: 'object',
              required: ['details'],
              properties: {
                error: {
                  type: 'string',
                  enum: ['VALIDATION_ERROR'],
                  example: 'VALIDATION_ERROR',
                },
                details: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/ValidationErrorDetail',
                  },
                },
              },
            },
          ],
        },
        RateLimitErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/ApiErrorResponse',
            },
            {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'TOO_MANY_REQUESTS',
                },
                message: {
                  type: 'string',
                  example: 'Too many requests from this IP, please try again after 15 minutes',
                },
              },
            },
          ],
        },
        PublicUser: {
          type: 'object',
          required: ['id', 'firstName', 'lastName', 'email', 'userType', 'authStatus', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              example: 'user-123',
            },
            firstName: {
              type: 'string',
              example: 'Johan',
            },
            lastName: {
              type: 'string',
              example: 'Botha',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'johan@example.com',
            },
            userType: {
              type: 'string',
              enum: ['IP_ADMIN', 'ORGANISATION_ADMIN', 'ORGANISATION_TRAINEE', 'GENERAL_TRAINEE'],
              example: 'GENERAL_TRAINEE',
            },
            authStatus: {
              type: 'string',
              enum: ['PENDING', 'ACTIVE', 'DISABLED'],
              example: 'ACTIVE',
            },
            traineeProfile: {
              type: 'object',
              nullable: true,
              additionalProperties: true,
            },
            adminProfile: {
              type: 'object',
              nullable: true,
              additionalProperties: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-05-11T20:44:54.000Z',
            },
          },
        },
        AuthUser: {
          allOf: [
            {
              $ref: '#/components/schemas/PublicUser',
            },
          ],
          description: 'Authenticated user attached to protected requests.',
        },
      },
      parameters: {
        CampaignItemIdPathParam: {
          name: 'campaignItemId',
          in: 'path',
          required: true,
          description: 'Campaign item identifier.',
          schema: {
            type: 'string',
          },
          example: 'campaign-item-123',
        },
        EmailIdPathParam: {
          name: 'emailId',
          in: 'path',
          required: true,
          description: 'Simulated email identifier.',
          schema: {
            type: 'string',
          },
          example: 'email-123',
        },
      },
      responses: {
        BadRequest: {
          description: 'The request payload or parameters are invalid.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationErrorResponse',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication credentials are missing or invalid.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiErrorResponse',
              },
            },
          },
        },
        Forbidden: {
          description: 'The authenticated user is not allowed to perform this action.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiErrorResponse',
              },
            },
          },
        },
        NotFound: {
          description: 'The requested resource was not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiErrorResponse',
              },
            },
          },
        },
        Conflict: {
          description: 'The request conflicts with an existing resource or state.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiErrorResponse',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'The client has exceeded the configured rate limit.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitErrorResponse',
              },
            },
          },
        },
        InternalServerError: {
          description: 'An unexpected server error occurred.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiErrorResponse',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/app.ts', './src/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
