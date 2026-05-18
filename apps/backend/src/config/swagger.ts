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
        AuthEmailExistsErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/ApiErrorResponse',
            },
            {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  enum: ['AUTH_EMAIL_EXISTS'],
                  example: 'AUTH_EMAIL_EXISTS',
                },
                message: {
                  type: 'string',
                  example: 'A user with the provided email already exists',
                },
              },
            },
          ],
        },
        AuthInvalidErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/ApiErrorResponse',
            },
            {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  enum: ['AUTH_INVALID'],
                  example: 'AUTH_INVALID',
                },
                message: {
                  type: 'string',
                  example: 'Invalid email or password',
                },
              },
            },
          ],
        },
        AuthRateLimitErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/RateLimitErrorResponse',
            },
            {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  enum: ['AUTH_RATE_LIMITED'],
                  example: 'AUTH_RATE_LIMITED',
                },
                message: {
                  type: 'string',
                  example: 'Too many authentication requests. Please try again later.',
                },
              },
            },
          ],
        },
        UserType: {
          type: 'string',
          enum: ['IP_ADMIN', 'ORGANISATION_ADMIN', 'ORGANISATION_TRAINEE', 'GENERAL_TRAINEE'],
          example: 'GENERAL_TRAINEE',
        },
        AuthStatus: {
          type: 'string',
          enum: ['PENDING', 'ACTIVE', 'DISABLED'],
          example: 'ACTIVE',
        },
        PublicOrganisation: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: {
              type: 'string',
              example: 'org-123',
            },
            name: {
              type: 'string',
              example: 'Example Organisation',
            },
          },
        },
        PublicTraineeProfile: {
          type: 'object',
          required: ['id', 'traineeStatus', 'traineeType'],
          properties: {
            id: {
              type: 'string',
              example: 'trainee-profile-123',
            },
            traineeStatus: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              example: 'ACTIVE',
            },
            traineeType: {
              type: 'string',
              enum: ['GENERAL', 'ORGANISATION'],
              example: 'GENERAL',
            },
            organisation: {
              nullable: true,
              allOf: [
                {
                  $ref: '#/components/schemas/PublicOrganisation',
                },
              ],
            },
          },
        },
        PublicAdminProfile: {
          type: 'object',
          required: ['id', 'adminStatus', 'adminType'],
          properties: {
            id: {
              type: 'string',
              example: 'admin-profile-123',
            },
            adminStatus: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              example: 'ACTIVE',
            },
            adminType: {
              type: 'string',
              enum: ['ORGANISATION', 'IP'],
              example: 'ORGANISATION',
            },
            organisation: {
              nullable: true,
              allOf: [
                {
                  $ref: '#/components/schemas/PublicOrganisation',
                },
              ],
            },
          },
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
              $ref: '#/components/schemas/UserType',
            },
            authStatus: {
              $ref: '#/components/schemas/AuthStatus',
            },
            traineeProfile: {
              nullable: true,
              allOf: [
                {
                  $ref: '#/components/schemas/PublicTraineeProfile',
                },
              ],
            },
            adminProfile: {
              nullable: true,
              allOf: [
                {
                  $ref: '#/components/schemas/PublicAdminProfile',
                },
              ],
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
        AuthRegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email is trimmed and lowercased before registration.',
              example: 'johan@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'correct-horse-battery-staple',
            },
            firstName: {
              type: 'string',
              minLength: 1,
              description: 'First name is trimmed before registration.',
              example: 'Johan',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              description: 'Last name is trimmed before registration.',
              example: 'Botha',
            },
          },
        },
        AuthLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email is trimmed and lowercased before login.',
              example: 'johan@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
              example: 'correct-horse-battery-staple',
            },
          },
        },
        AuthRegisterResponse: {
          type: 'object',
          required: ['user'],
          properties: {
            user: {
              $ref: '#/components/schemas/PublicUser',
            },
          },
        },
        AuthLoginResponse: {
          type: 'object',
          required: ['user', 'token', 'tokenType', 'expiresAt'],
          properties: {
            user: {
              $ref: '#/components/schemas/PublicUser',
            },
            token: {
              type: 'string',
              description: 'Bearer token for authenticated requests.',
              example:
                'eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImV4cGlyZXNBdCI6IjIwMjYtMDUtMTJUMjA6NDQ6NTQuMDAwWiJ9.signature',
            },
            tokenType: {
              type: 'string',
              enum: ['Bearer'],
              example: 'Bearer',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-05-12T20:44:54.000Z',
            },
          },
        },
        AuthMeResponse: {
          type: 'object',
          required: ['user'],
          properties: {
            user: {
              $ref: '#/components/schemas/PublicUser',
            },
          },
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
