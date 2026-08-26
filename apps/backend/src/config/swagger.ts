import swaggerJsdoc from 'swagger-jsdoc';
import { APP_NAME } from '@insightful-phish/shared';
import { env } from './env.js';

type OpenApiSchema = Record<string, unknown>;

function schemaRef(name: string): OpenApiSchema {
  return {
    $ref: `#/components/schemas/${name}`,
  };
}

function jsonContent(schema: OpenApiSchema) {
  return {
    content: {
      'application/json': {
        schema,
      },
    },
  };
}

function enumString(values: string[], example: string): OpenApiSchema {
  return {
    type: 'string',
    enum: values,
    example,
  };
}

function uuidString(example: string): OpenApiSchema {
  return {
    type: 'string',
    format: 'uuid',
    example,
  };
}

function nullableUuidString(example: string): OpenApiSchema {
  return {
    ...uuidString(example),
    nullable: true,
  };
}

function dateTimeString(example = '2026-05-16T09:00:00.000Z'): OpenApiSchema {
  return {
    type: 'string',
    format: 'date-time',
    example,
  };
}

function nullableString(example: string): OpenApiSchema {
  return {
    type: 'string',
    nullable: true,
    example,
  };
}

function booleanProperty(example: boolean): OpenApiSchema {
  return {
    type: 'boolean',
    example,
  };
}

function nullableIntegerRange(input: {
  minimum: number;
  maximum: number;
  example: number;
}): OpenApiSchema {
  return {
    type: 'integer',
    nullable: true,
    minimum: input.minimum,
    maximum: input.maximum,
    example: input.example,
  };
}

function integerOptionsLimit(input: {
  minimum: number;
  maximum: number;
  defaultValue: number;
  options: number[];
}): OpenApiSchema {
  return {
    type: 'object',
    required: ['min', 'max', 'default', 'options'],
    properties: {
      min: {
        type: 'integer',
        example: input.minimum,
      },
      max: {
        type: 'integer',
        example: input.maximum,
      },
      default: {
        type: 'integer',
        example: input.defaultValue,
      },
      options: {
        type: 'array',
        items: {
          type: 'integer',
        },
        example: input.options,
      },
    },
  };
}

function trueSuccessProperty(): OpenApiSchema {
  return {
    type: 'boolean',
    enum: [true],
    example: true,
  };
}

function arrayOf(schema: OpenApiSchema): OpenApiSchema {
  return {
    type: 'array',
    items: schema,
  };
}

function uuidArray(example: string[]): OpenApiSchema {
  return {
    type: 'array',
    items: uuidString(example[0] ?? '11111111-1111-1111-1111-111111111111'),
    example,
  };
}

function errorResponseSchema(
  baseSchemaName: string,
  errorCode: string,
  messageExample: string,
): OpenApiSchema {
  return {
    allOf: [
      schemaRef(baseSchemaName),
      {
        type: 'object',
        properties: {
          error: enumString([errorCode], errorCode),
          message: {
            type: 'string',
            example: messageExample,
          },
        },
      },
    ],
  };
}

function responseComponent(description: string, schemaName: string) {
  return {
    description,
    ...jsonContent(schemaRef(schemaName)),
  };
}

const organisationSecuritySettingsValueRequired = [
  'enforceRememberMePolicy',
  'allowRememberMe',
  'enforceRegularSessionLength',
  'enforceIdleTimeout',
  'requireReauthenticationForSensitiveActions',
  'allowTraineeEmailChange',
] as const;

function organisationSecuritySettingsValueProperties(): Record<string, OpenApiSchema> {
  return {
    enforceRememberMePolicy: booleanProperty(true),
    allowRememberMe: booleanProperty(true),
    maxRememberedSessionHours: nullableIntegerRange({
      minimum: 1,
      maximum: 720,
      example: 168,
    }),
    enforceRegularSessionLength: booleanProperty(true),
    regularSessionLengthHours: nullableIntegerRange({
      minimum: 1,
      maximum: 24,
      example: 8,
    }),
    enforceIdleTimeout: booleanProperty(true),
    idleTimeoutMinutes: nullableIntegerRange({
      minimum: 5,
      maximum: 480,
      example: 30,
    }),
    requireReauthenticationForSensitiveActions: booleanProperty(true),
    allowTraineeEmailChange: booleanProperty(false),
  };
}

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${APP_NAME} API`,
      version: '0.2.0',
      description: `
API documentation for ${APP_NAME}.

### Demo 2 API
This reference covers the currently mounted Demo 2 backend routes. Planned or unmounted routes are omitted.
      `,
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development',
      },
      {
        url: `https://api.insightfulphish.co.za`,
        description: 'Production Server',
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
        name: 'Account Settings',
        description: 'Authenticated account profile, email, password, sessions, and preferences.',
      },
      {
        name: 'Setup',
        description: 'Public token-driven setup endpoints.',
      },
      {
        name: 'Organisation Registration Requests',
        description: 'Public organisation onboarding request submission.',
      },
      {
        name: 'Organisation Admins',
        description: 'Organisation admin management and permission workflows.',
      },
      {
        name: 'Organisation Security Settings',
        description: 'Organisation-scoped security policy settings for active organisation admins.',
      },
      {
        name: 'Trainee Simulation',
        description: 'Trainee simulated phishing email workflows.',
      },
      {
        name: 'Trainee Training',
        description: 'Trainee training document workflows.',
      },
      {
        name: 'Trainee Campaigns',
        description: 'Trainee campaign discovery and campaign item navigation.',
      },
      {
        name: 'Trainee Quiz',
        description: 'Trainee quiz retrieval, attempts, submissions, and results.',
      },
      {
        name: 'Platform Organisation Requests',
        description:
          'Platform administration of organisation registration requests and onboarding organisations.',
      },
      {
        name: 'Platform Admins',
        description:
          'Platform administrator management, invitations, super admin transfer, and demotion workflows.',
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
              ...dateTimeString('2026-05-11T20:44:54.000Z'),
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
          ...errorResponseSchema(
            'ApiErrorResponse',
            'TOO_MANY_REQUESTS',
            'Too many requests from this IP, please try again after 15 minutes',
          ),
        },
        AuthInvalidErrorResponse: errorResponseSchema(
          'ApiErrorResponse',
          'AUTH_INVALID',
          'Invalid email or password',
        ),
        AuthRateLimitErrorResponse: errorResponseSchema(
          'RateLimitErrorResponse',
          'AUTH_RATE_LIMITED',
          'Too many authentication requests. Please try again later.',
        ),
        TrainingDocumentNotFoundErrorResponse: errorResponseSchema(
          'ApiErrorResponse',
          'TRAINING_DOCUMENT_NOT_FOUND',
          'Training document was not found',
        ),
        TrainingContentUnavailableErrorResponse: errorResponseSchema(
          'ApiErrorResponse',
          'TRAINING_CONTENT_UNAVAILABLE',
          'Training content could not be loaded',
        ),
        TrainingRateLimitErrorResponse: errorResponseSchema(
          'RateLimitErrorResponse',
          'TRAINING_RATE_LIMITED',
          'Too many training requests. Please try again later.',
        ),
        EmptyRequestBody: {
          type: 'object',
          additionalProperties: false,
          description: 'Request body must be omitted or an empty JSON object.',
          example: {},
        },
        UserType: enumString(
          ['IP_ADMIN', 'ORGANISATION_ADMIN', 'ORGANISATION_TRAINEE', 'GENERAL_TRAINEE'],
          'GENERAL_TRAINEE',
        ),
        AuthStatus: enumString(
          ['PENDING_EMAIL_VERIFICATION', 'PENDING_INVITE_SETUP', 'ACTIVE', 'DISABLED'],
          'ACTIVE',
        ),
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
              enum: ['ACTIVE', 'DISABLED'],
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
              ...dateTimeString('2026-05-11T20:44:54.000Z'),
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
          required: ['email', 'password', 'confirmPassword', 'firstName', 'lastName'],
          additionalProperties: false,
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
              minLength: 12,
              example: 'ExampleLocalPassword1!',
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              minLength: 12,
              example: 'ExampleLocalPassword1!',
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
            rememberMe: {
              type: 'boolean',
              example: true,
            },
          },
        },
        AuthRegisterResponse: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              example:
                "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
            },
          },
        },
        AuthContextUser: {
          type: 'object',
          required: ['id', 'userType', 'authStatus'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'user-123',
            },
            userType: {
              $ref: '#/components/schemas/UserType',
            },
            authStatus: {
              $ref: '#/components/schemas/AuthStatus',
            },
          },
        },
        AuthOrganisationContext: {
          type: 'object',
          required: ['id', 'status', 'name'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'org-123',
            },
            status: {
              type: 'string',
              example: 'ACTIVE',
            },
            name: {
              type: 'string',
              example: 'Example Organisation',
            },
          },
        },
        AuthContext: {
          type: 'object',
          required: [
            'user',
            'role',
            'organisation',
            'platformAdminRole',
            'permissions',
            'redirectTo',
          ],
          properties: {
            user: {
              $ref: '#/components/schemas/AuthContextUser',
            },
            role: {
              $ref: '#/components/schemas/UserType',
            },
            organisation: {
              nullable: true,
              allOf: [
                {
                  $ref: '#/components/schemas/AuthOrganisationContext',
                },
              ],
            },
            platformAdminRole: {
              type: 'string',
              nullable: true,
              enum: ['SUPER_ADMIN', 'NORMAL_ADMIN'],
              example: 'NORMAL_ADMIN',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['GENERAL_TRAINEE'],
            },
            redirectTo: {
              type: 'string',
              example: '/trainee/campaigns',
            },
          },
        },
        AuthLoginResponse: {
          type: 'object',
          required: [
            'accessToken',
            'idleTimeoutMinutes',
            'user',
            'context',
            'permissions',
            'redirectTo',
          ],
          properties: {
            accessToken: {
              type: 'string',
              description: 'Bearer access token for authenticated requests.',
              example:
                'eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImV4cGlyZXNBdCI6IjIwMjYtMDUtMTJUMjA6NDQ6NTQuMDAwWiJ9.signature',
            },
            idleTimeoutMinutes: {
              ...nullableIntegerRange({
                minimum: 5,
                maximum: 480,
                example: 30,
              }),
              description:
                'Effective browser-observed inactivity in timeout minutes. Null disabled browser idle timeout.',
            },
            user: {
              $ref: '#/components/schemas/PublicUser',
            },
            context: {
              $ref: '#/components/schemas/AuthContext',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['GENERAL_TRAINEE'],
            },
            redirectTo: {
              type: 'string',
              example: '/trainee/campaigns',
            },
            token: {
              type: 'string',
              description: 'Alias of accessToken for compatibility.',
              example:
                'eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImV4cGlyZXNBdCI6IjIwMjYtMDUtMTJUMjA6NDQ6NTQuMDAwWiJ9.signature',
            },
            tokenType: {
              type: 'string',
              description: 'Token type schema.',
              example: 'Bearer',
            },
            expiresAt: {
              type: 'string',
              description: 'ISO-8601 string representation of access token expiration date-time.',
              example: '2026-05-12T20:44:54.000Z',
            },
            sessionExpiresAt: {
              type: 'string',
              description:
                'ISO-8601 string representation of the associated session absolute expiration date-time.',
              example: '2026-05-12T20:44:54.000Z',
            },
          },
        },
        AuthMeResponse: {
          type: 'object',
          required: ['user', 'context', 'permissions', 'redirectTo'],
          properties: {
            user: {
              $ref: '#/components/schemas/PublicUser',
            },
            context: {
              $ref: '#/components/schemas/AuthContext',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['GENERAL_TRAINEE'],
            },
            redirectTo: {
              type: 'string',
              example: '/trainee/campaigns',
            },
          },
        },
        AuthResendVerificationRequest: {
          type: 'object',
          required: ['email'],
          additionalProperties: false,
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'johan@example.com',
            },
          },
        },
        AuthResendVerificationResponse: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              example:
                'If the email is registered and unverified, a verification link has been queued for delivery.',
            },
          },
        },
        AuthVerifyEmailRequest: {
          type: 'object',
          required: ['token'],
          additionalProperties: false,
          properties: {
            token: {
              type: 'string',
              minLength: 32,
              maxLength: 512,
              pattern: '^[A-Za-z0-9_-]+$',
              example: 'exampleVerificationTokenValueWithAtLeast32Chars',
            },
          },
        },
        AuthVerifyEmailResponse: {
          type: 'object',
          required: ['state'],
          properties: {
            state: enumString(['VALID', 'INVALID', 'EXPIRED', 'USED', 'REVOKED'], 'VALID'),
            user: schemaRef('PublicUser'),
          },
        },
        AccountProfileUpdateRequest: {
          type: 'object',
          required: ['firstName', 'lastName'],
          additionalProperties: false,
          properties: {
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              example: 'Johan',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              example: 'Botha',
            },
          },
        },
        AccountChangeEmailRequest: {
          type: 'object',
          required: ['newEmail', 'confirmNewEmail', 'password'],
          additionalProperties: false,
          properties: {
            newEmail: {
              type: 'string',
              format: 'email',
              maxLength: 254,
              example: 'johan.new@example.com',
            },
            confirmNewEmail: {
              type: 'string',
              format: 'email',
              maxLength: 254,
              example: 'johan.new@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
              maxLength: 128,
              example: 'ExampleLocalPassword1!',
            },
          },
        },
        AccountChangeEmailResponse: {
          type: 'object',
          description:
            'Confirms the email-change request was accepted locally. A true emailQueued value means notification work was durably queued, not that the provider has delivered the email.',
          required: ['message', 'emailQueued'],
          properties: {
            message: {
              type: 'string',
              example:
                'If this email change can be completed, a confirmation email has been queued for delivery to the new address.',
            },
            emailQueued: booleanProperty(true),
          },
        },
        AccountChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmNewPassword'],
          additionalProperties: false,
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
              minLength: 1,
              maxLength: 128,
              example: 'ExampleLocalPassword1!',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 12,
              maxLength: 128,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\sA-Za-z0-9]).+$',
              description:
                'Must include at least one lowercase letter, one uppercase letter, one number, and one special character.',
              example: 'UpdatedLocalPassword1!',
            },
            confirmNewPassword: {
              type: 'string',
              format: 'password',
              minLength: 12,
              maxLength: 128,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\sA-Za-z0-9]).+$',
              description:
                'Must match newPassword and include at least one lowercase letter, one uppercase letter, one number, and one special character.',
              example: 'UpdatedLocalPassword1!',
            },
          },
        },
        AccountChangePasswordResponse: {
          type: 'object',
          description:
            'Confirms the password change committed. A true notificationQueued value means the password-changed notification was durably queued, not that the provider has delivered it.',
          required: ['message', 'notificationQueued', 'revokedSessionCount'],
          properties: {
            message: {
              type: 'string',
              example: 'Password changed successfully.',
            },
            notificationQueued: booleanProperty(true),
            revokedSessionCount: {
              type: 'integer',
              minimum: 0,
              example: 2,
            },
          },
        },
        AccountProfile: {
          type: 'object',
          required: [
            'id',
            'firstName',
            'lastName',
            'email',
            'userType',
            'authStatus',
            'emailVerified',
            'emailVerifiedAt',
            'createdAt',
            'updatedAt',
          ],
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
            userType: schemaRef('UserType'),
            authStatus: schemaRef('AuthStatus'),
            emailVerified: booleanProperty(true),
            emailVerifiedAt: {
              nullable: true,
              allOf: [dateTimeString('2026-05-11T20:44:54.000Z')],
            },
            createdAt: dateTimeString('2026-05-11T20:44:54.000Z'),
            updatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
          },
        },
        AccountSecurityPreferences: {
          type: 'object',
          required: [
            'id',
            'preferredRegularSessionLengthHours',
            'preferredRememberMeSessionLengthHours',
            'preferredIdleTimeoutMinutes',
            'updatedAt',
          ],
          properties: {
            id: nullableString('security-preferences-123'),
            preferredRegularSessionLengthHours: nullableIntegerRange({
              minimum: 1,
              maximum: 24,
              example: 8,
            }),
            preferredRememberMeSessionLengthHours: nullableIntegerRange({
              minimum: 1,
              maximum: 720,
              example: 168,
            }),
            preferredIdleTimeoutMinutes: nullableIntegerRange({
              minimum: 5,
              maximum: 480,
              example: 30,
            }),
            updatedAt: {
              nullable: true,
              allOf: [dateTimeString('2026-05-16T09:00:00.000Z')],
            },
          },
        },
        AccountSecurityPreferencesRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            preferredRegularSessionLengthHours: nullableIntegerRange({
              minimum: 1,
              maximum: 24,
              example: 8,
            }),
            preferredRememberMeSessionLengthHours: nullableIntegerRange({
              minimum: 1,
              maximum: 720,
              example: 168,
            }),
            preferredIdleTimeoutMinutes: nullableIntegerRange({
              minimum: 5,
              maximum: 480,
              example: 30,
            }),
          },
        },
        AccountPolicy: {
          type: 'object',
          required: [
            'organisationId',
            'rememberMeRequested',
            'rememberMeAllowed',
            'rememberMeApplied',
            'regularSessionSeconds',
            'rememberedSessionSeconds',
            'effectiveSessionSeconds',
            'idleTimeoutMinutes',
            'requireReauthenticationForSensitiveActions',
            'allowEmailChange',
            'sources',
          ],
          properties: {
            organisationId: nullableString('org-123'),
            rememberMeRequested: booleanProperty(false),
            rememberMeAllowed: booleanProperty(true),
            rememberMeApplied: booleanProperty(false),
            regularSessionSeconds: {
              type: 'integer',
              example: 900,
            },
            rememberedSessionSeconds: {
              type: 'integer',
              example: 604800,
            },
            effectiveSessionSeconds: {
              type: 'integer',
              example: 900,
            },
            idleTimeoutMinutes: nullableIntegerRange({
              minimum: 5,
              maximum: 480,
              example: 30,
            }),
            requireReauthenticationForSensitiveActions: booleanProperty(true),
            allowEmailChange: booleanProperty(true),
            sources: {
              type: 'object',
              required: ['rememberMe', 'regularSession', 'rememberedSession', 'idleTimeout'],
              properties: {
                rememberMe: enumString(
                  ['PLATFORM_DEFAULT', 'USER_PREFERENCE', 'ORGANISATION_POLICY'],
                  'PLATFORM_DEFAULT',
                ),
                regularSession: enumString(
                  ['PLATFORM_DEFAULT', 'USER_PREFERENCE', 'ORGANISATION_POLICY'],
                  'PLATFORM_DEFAULT',
                ),
                rememberedSession: enumString(
                  ['PLATFORM_DEFAULT', 'USER_PREFERENCE', 'ORGANISATION_POLICY'],
                  'PLATFORM_DEFAULT',
                ),
                idleTimeout: enumString(
                  ['PLATFORM_DEFAULT', 'USER_PREFERENCE', 'ORGANISATION_POLICY'],
                  'PLATFORM_DEFAULT',
                ),
              },
            },
          },
        },
        AccountCapabilities: {
          type: 'object',
          required: [
            'canEditProfile',
            'canRequestEmailChange',
            'canChangePassword',
            'canEditSecurityPreferences',
            'securityPreferenceEditable',
            'blockedReasons',
          ],
          properties: {
            canEditProfile: booleanProperty(true),
            canRequestEmailChange: booleanProperty(true),
            canChangePassword: booleanProperty(true),
            canEditSecurityPreferences: booleanProperty(true),
            securityPreferenceEditable: {
              type: 'object',
              required: [
                'preferredRegularSessionLengthHours',
                'preferredRememberMeSessionLengthHours',
                'preferredIdleTimeoutMinutes',
              ],
              properties: {
                preferredRegularSessionLengthHours: booleanProperty(true),
                preferredRememberMeSessionLengthHours: booleanProperty(true),
                preferredIdleTimeoutMinutes: booleanProperty(true),
              },
            },
            blockedReasons: {
              type: 'object',
              required: [
                'emailChange',
                'securityPreferences',
                'preferredRegularSessionLengthHours',
                'preferredRememberMeSessionLengthHours',
                'preferredIdleTimeoutMinutes',
              ],
              properties: {
                emailChange: nullableString('ORGANISATION_POLICY_BLOCKED'),
                securityPreferences: nullableString('ORGANISATION_POLICY_ENFORCED'),
                preferredRegularSessionLengthHours: nullableString('ORGANISATION_POLICY_ENFORCED'),
                preferredRememberMeSessionLengthHours: nullableString(
                  'ORGANISATION_POLICY_ENFORCED',
                ),
                preferredIdleTimeoutMinutes: nullableString('ORGANISATION_POLICY_ENFORCED'),
              },
            },
          },
        },
        AccountResponse: {
          type: 'object',
          required: ['profile', 'securityPreferences', 'effectivePolicy', 'capabilities'],
          properties: {
            profile: schemaRef('AccountProfile'),
            securityPreferences: schemaRef('AccountSecurityPreferences'),
            effectivePolicy: schemaRef('AccountPolicy'),
            capabilities: schemaRef('AccountCapabilities'),
          },
        },
        AccountSession: {
          type: 'object',
          description:
            'Safe account-session summary. Refresh tokens, token hashes, IP addresses, and raw user-agent strings are never returned.',
          required: [
            'id',
            'rememberMe',
            'current',
            'createdAt',
            'lastActiveAt',
            'expiresAt',
            'idleTimeoutMinutes',
            'deviceSummary',
            'locationSummary',
          ],
          properties: {
            id: {
              type: 'string',
              example: 'session-123',
            },
            rememberMe: booleanProperty(false),
            current: booleanProperty(true),
            createdAt: dateTimeString('2026-05-11T20:44:54.000Z'),
            lastActiveAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            expiresAt: dateTimeString('2026-05-16T09:15:00.000Z'),
            idleTimeoutMinutes: nullableIntegerRange({
              minimum: 5,
              maximum: 480,
              example: 30,
            }),
            deviceSummary: nullableString('Chrome on Windows'),
            locationSummary: nullableString('Johannesburg, ZA'),
          },
        },
        AccountSessionsResponse: {
          type: 'object',
          description: 'Active, non-expired, non-idle sessions owned by the authenticated user.',
          required: ['sessions'],
          properties: {
            sessions: arrayOf(schemaRef('AccountSession')),
          },
        },
        AccountSessionRevocationResponse: {
          type: 'object',
          description:
            'Confirms that the selected owned session was revoked. Revoking the current session is permitted and invalidates its refresh token.',
          required: ['revoked'],
          properties: {
            revoked: trueSuccessProperty(),
          },
        },
        AccountLogoutOthersResponse: {
          type: 'object',
          description:
            'Confirms that active sessions except the current session were revoked with their refresh tokens.',
          required: ['revokedSessionCount'],
          properties: {
            revokedSessionCount: {
              type: 'integer',
              minimum: 0,
              example: 2,
            },
          },
        },
        AccountVerifyEmailChangeRequest: {
          type: 'object',
          required: ['token'],
          additionalProperties: false,
          properties: {
            token: {
              type: 'string',
              minLength: 32,
              maxLength: 512,
              pattern: '^[A-Za-z0-9_-]+$',
              example: 'exampleEmailChangeTokenValueWithAtLeast32Chars',
            },
          },
        },
        AccountVerifyEmailChangeResponse: {
          type: 'object',
          description:
            'Token verification state. A VALID state means the account email was updated and active sessions/refresh tokens were revoked.',
          required: ['state'],
          properties: {
            state: enumString(['VALID', 'INVALID', 'EXPIRED', 'USED', 'REVOKED'], 'VALID'),
          },
        },
        AuthForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          additionalProperties: false,
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'johan@example.com',
            },
          },
        },
        AuthForgotPasswordResponse: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              example:
                'If the email is registered, a password reset link has been queued for delivery.',
            },
          },
        },
        AuthResetPasswordRequest: {
          type: 'object',
          required: ['token', 'newPassword', 'confirmNewPassword'],
          additionalProperties: false,
          properties: {
            token: {
              type: 'string',
              example: 'exampleResetTokenValueWithAtLeast32Chars',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 12,
              example: 'ExampleLocalPassword1!',
            },
            confirmNewPassword: {
              type: 'string',
              example: 'ExampleLocalPassword1!',
            },
          },
        },
        AuthResetPasswordResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
          },
        },
        TokenContextResponse: {
          type: 'object',
          required: ['tokenState', 'canResend', 'resendCooldownSeconds', 'messageCode', 'flow'],
          properties: {
            tokenState: {
              type: 'string',
              enum: ['VALID', 'INVALID', 'EXPIRED', 'USED', 'REVOKED'],
              example: 'VALID',
            },
            canResend: {
              type: 'boolean',
              example: true,
            },
            resendCooldownSeconds: {
              type: 'integer',
              example: 0,
            },
            messageCode: {
              type: 'string',
              example: 'TOKEN_VALID',
            },
            flow: {
              type: 'string',
              enum: [
                'EMAIL_VERIFICATION',
                'PASSWORD_RESET',
                'EMAIL_CHANGE_VERIFICATION',
                'INITIAL_ORGANISATION_ADMIN_SETUP',
                'ORGANISATION_TRAINEE_INVITE',
                'ORGANISATION_ADMIN_PROMOTION',
                'PLATFORM_ADMIN_INVITE',
                'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
                'UNKNOWN',
              ],
              example: 'PASSWORD_RESET',
            },
          },
        },
        SetupTokenState: enumString(['VALID', 'INVALID', 'EXPIRED', 'USED', 'REVOKED'], 'VALID'),
        SetupTokenContextResponse: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'object',
              required: ['state'],
              properties: {
                state: {
                  $ref: '#/components/schemas/SetupTokenState',
                },
                purpose: {
                  type: 'string',
                  nullable: true,
                  enum: [
                    'INITIAL_ORGANISATION_ADMIN_SETUP',
                    'ORGANISATION_TRAINEE_INVITE',
                    'PLATFORM_ADMIN_INVITE',
                  ],
                  example: 'ORGANISATION_TRAINEE_INVITE',
                },
              },
            },
            targetEmail: {
              type: 'string',
              format: 'email',
              example: 'learner@example.com',
            },
            targetFirstName: {
              type: 'string',
              nullable: true,
              example: 'Jane',
            },
            targetLastName: {
              type: 'string',
              nullable: true,
              example: 'Doe',
            },
            role: {
              type: 'string',
              enum: ['ORGANISATION_TRAINEE', 'ORGANISATION_ADMIN', 'IP_ADMIN'],
              example: 'ORGANISATION_TRAINEE',
            },
            organisationName: {
              type: 'string',
              example: 'Example Organisation',
            },
          },
        },
        SetupCompleteRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'password', 'confirmPassword'],
          additionalProperties: false,
          properties: {
            firstName: {
              type: 'string',
              minLength: 1,
              example: 'Adriano',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              example: 'Jorge',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 12,
              example: 'ExampleLocalPassword1!',
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              minLength: 12,
              example: 'ExampleLocalPassword1!',
            },
          },
        },
        SetupCompleteResponse: {
          type: 'object',
          required: ['user'],
          properties: {
            user: {
              $ref: '#/components/schemas/PublicUser',
            },
          },
        },
        InvitationStatus: enumString(
          [
            'PENDING',
            'ACCEPTED',
            'REJECTED',
            'EXPIRED',
            'REVOKED',
            'USED',
            'SENT',
            'FAILED_TO_SEND',
          ],
          'PENDING',
        ),
        InvitationType: enumString(
          [
            'ORGANISATION_TRAINEE',
            'ORGANISATION_ADMIN_PROMOTION',
            'PLATFORM_ADMIN',
            'INITIAL_ORGANISATION_ADMIN_SETUP',
          ],
          'ORGANISATION_TRAINEE',
        ),
        InvitationRoleGranted: enumString(
          ['ORGANISATION_TRAINEE', 'ORGANISATION_ADMIN', 'PLATFORM_ADMIN'],
          'ORGANISATION_TRAINEE',
        ),
        InvitationContextResponse: {
          type: 'object',
          required: ['requiredAction', 'rejectAllowed', 'status'],
          properties: {
            requiredAction: enumString(
              [
                'CONTINUE_SETUP',
                'LOGIN_REQUIRED',
                'SWITCH_ACCOUNT',
                'CONFIRM_ROLE_CHANGE',
                'ROLE_CONFLICT',
                'INVITATION_UNAVAILABLE',
                'TOKEN_UNAVAILABLE',
              ],
              'LOGIN_REQUIRED',
            ),
            rejectAllowed: {
              type: 'boolean',
              example: true,
            },
            status: {
              $ref: '#/components/schemas/InvitationStatus',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-07-15T12:00:00.000Z',
            },
            invitationType: {
              $ref: '#/components/schemas/InvitationType',
            },
            organisationId: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-4111-8111-111111111111',
            },
            organisationName: {
              type: 'string',
              example: 'Acme Corp',
            },
            roleGranted: {
              $ref: '#/components/schemas/InvitationRoleGranted',
            },
            permissions: arrayOf({
              type: 'string',
              example: 'VIEW_ORGANISATION_TRAINEES',
            }),
          },
        },
        InvitationAcceptRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            confirmRoleChange: {
              type: 'boolean',
              description:
                'Must be true when accepting an invitation that promotes an Organisation Trainee to Organisation Admin.',
              example: true,
            },
          },
        },
        InvitationAcceptResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Invitation accepted successfully.',
            },
            redirectTo: {
              type: 'string',
              example: '/trainee/campaigns',
            },
            roleGranted: {
              $ref: '#/components/schemas/InvitationRoleGranted',
            },
            organisationId: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-4111-8111-111111111111',
            },
            sessionOutcome: enumString(
              ['REFRESH_AUTH_CONTEXT', 'REAUTHENTICATE'],
              'REFRESH_AUTH_CONTEXT',
            ),
          },
        },
        InvitationRejectRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rejectionReason: {
              type: 'string',
              maxLength: 500,
              example: 'No longer with the company.',
            },
          },
        },
        InvitationRejectResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Invitation rejected successfully.',
            },
          },
        },
        CreateOrganisationRegistrationRequest: {
          type: 'object',
          required: [
            'organisationName',
            'organisationSize',
            'representativeFirstName',
            'representativeLastName',
            'representativeEmail',
          ],
          additionalProperties: false,
          properties: {
            organisationName: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'Example Consulting',
            },
            organisationDescription: {
              type: 'string',
              maxLength: 2000,
              description: 'Stored using the current onboarding request description field.',
              example: 'Small consulting company that wants phishing awareness training.',
            },
            organisationSize: {
              type: 'integer',
              minimum: 1,
              maximum: 100000,
              description: 'Approximate number of trainees or users in the organisation.',
              example: 75,
            },
            organisationWebsiteUrl: {
              type: 'string',
              format: 'uri',
              description: 'Optional. Must use http or https when provided.',
              maxLength: 2048,
              example: 'https://example-consulting.test',
            },
            representativeFirstName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Adriano',
            },
            representativeLastName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Jorge',
            },
            representativeEmail: {
              type: 'string',
              format: 'email',
              maxLength: 254,
              example: 'adriano@example.test',
            },
          },
        },
        OrganisationRegistrationRequestCreatedResponse: {
          type: 'object',
          required: ['requestId', 'status', 'confirmationEmailQueued'],
          properties: {
            requestId: {
              type: 'string',
              example: 'registration-request-123',
            },
            status: {
              type: 'string',
              enum: ['PENDING_REVIEW'],
              example: 'PENDING_REVIEW',
            },
            confirmationEmailQueued: {
              type: 'boolean',
              example: true,
            },
          },
        },
        OrganisationRegistrationRequestConflictErrorResponse: errorResponseSchema(
          'ApiErrorResponse',
          'ORGANISATION_REQUEST_CONFLICT',
          'The organisation registration request conflicts with existing records.',
        ),
        TraineeInvitationConflictErrorResponse: errorResponseSchema(
          'ApiErrorResponse',
          'CANNOT_INVITE_USER',
          'The user cannot be invited to the organisation as a trainee at this time.',
        ),
        PlatformOrganisationRequest: {
          type: 'object',
          required: [
            'id',
            'submittedOrganisationName',
            'representativeFirstName',
            'representativeLastName',
            'representativeEmail',
            'status',
            'createdAt',
            'updatedAt',
            'derivedStatus',
          ],
          properties: {
            id: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            submittedOrganisationName: { type: 'string', example: 'Example Consulting' },
            submittedWebsite: nullableString('https://example.com'),
            submittedOrganisationDescription: nullableString('A small consulting company'),
            submittedOrganisationSize: { type: 'integer', nullable: true, example: 75 },
            submittedPrimaryDomain: nullableString('example.com'),
            representativeFirstName: { type: 'string', example: 'Adriano' },
            representativeLastName: { type: 'string', example: 'Jorge' },
            representativeEmail: {
              type: 'string',
              format: 'email',
              example: 'adriano@example.com',
            },
            representativePhone: nullableString('+1234567890'),
            status: enumString(
              ['PENDING_REVIEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
              'PENDING_REVIEW',
            ),
            contactedByIpAdminId: nullableUuidString('c3fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            approvedByIpAdminId: nullableUuidString('d4fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            rejectedByIpAdminId: nullableUuidString('e5fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            approvedOrganisationId: nullableUuidString('f6fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            contactedAt: { ...dateTimeString('2026-05-16T09:00:00.000Z'), nullable: true },
            approvedAt: { ...dateTimeString('2026-05-16T09:00:00.000Z'), nullable: true },
            rejectedAt: { ...dateTimeString('2026-05-16T09:00:00.000Z'), nullable: true },
            rejectionReason: nullableString('Invalid details'),
            createdAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            updatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            organisationStatus: {
              type: 'string',
              nullable: true,
              enum: [
                'PENDING_ONBOARDING',
                'ACTIVE',
                'INACTIVE',
                'SUSPENDED',
                'DISABLED',
                'ARCHIVED',
              ],
              example: 'PENDING_ONBOARDING',
            },
            setupStatus: {
              nullable: true,
              $ref: '#/components/schemas/OrganisationInitialSetupStatus',
            },
            resendEligibility: {
              nullable: true,
              $ref: '#/components/schemas/OrganisationResendEligibility',
            },
            derivedStatus: {
              type: 'string',
              example: 'APPROVED_PENDING_SETUP',
            },
            contactedBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: uuidString('c3fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
                user: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string', example: 'Jane' },
                    lastName: { type: 'string', example: 'Doe' },
                    email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  },
                },
              },
            },
            approvedBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: uuidString('d4fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
                user: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string', example: 'Jane' },
                    lastName: { type: 'string', example: 'Doe' },
                    email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  },
                },
              },
            },
            rejectedBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: uuidString('e5fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
                user: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string', example: 'Jane' },
                    lastName: { type: 'string', example: 'Doe' },
                    email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  },
                },
              },
            },
          },
        },
        PlatformOrganisationRequestsListResponse: {
          type: 'object',
          required: ['requests', 'pagination'],
          properties: {
            requests: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PlatformOrganisationRequest',
              },
            },
            pagination: {
              type: 'object',
              required: ['page', 'limit', 'total', 'totalPages'],
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 50 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },
        ApproveOrganisationRequest: {
          type: 'object',
          required: ['initialAdminEmail'],
          additionalProperties: false,
          properties: {
            organisationName: { type: 'string', maxLength: 200, example: 'Example Consulting' },
            initialAdminEmail: { type: 'string', format: 'email', example: 'admin@example.com' },
          },
        },
        RejectOrganisationRequest: {
          type: 'object',
          required: ['rejectionReason'],
          additionalProperties: false,
          properties: {
            rejectionReason: {
              type: 'string',
              maxLength: 1000,
              example: 'The domain representative is invalid.',
            },
          },
        },
        OrganisationInitialSetupStatus: {
          type: 'object',
          nullable: true,
          required: [
            'id',
            'status',
            'recipientEmail',
            'expiresAt',
            'latestActionToken',
            'latestEmailDelivery',
          ],
          properties: {
            id: uuidString('inv-1234-abcd'),
            status: enumString(
              [
                'PENDING',
                'SENT',
                'FAILED_TO_SEND',
                'ACCEPTED',
                'COMPLETED',
                'EXPIRED',
                'REVOKED',
                'REJECTED',
              ],
              'PENDING',
            ),
            recipientEmail: { type: 'string', format: 'email', example: 'admin@example.com' },
            expiresAt: dateTimeString('2026-05-23T09:00:00.000Z'),
            latestActionToken: {
              type: 'object',
              nullable: true,
              required: ['id', 'expiresAt', 'usedAt', 'revokedAt', 'status'],
              properties: {
                id: uuidString('tok-1234-abcd'),
                expiresAt: dateTimeString('2026-05-23T09:00:00.000Z'),
                usedAt: { ...dateTimeString('2026-05-16T10:00:00.000Z'), nullable: true },
                revokedAt: { ...dateTimeString('2026-05-16T10:00:00.000Z'), nullable: true },
                status: enumString(['AVAILABLE', 'USED', 'REVOKED', 'EXPIRED'], 'AVAILABLE'),
              },
            },
            latestEmailDelivery: {
              type: 'object',
              nullable: true,
              required: ['id', 'deliveryStatus', 'sentAt', 'failedAt', 'failureReason'],
              properties: {
                id: uuidString('log-1234-abcd'),
                deliveryStatus: enumString(['PENDING', 'SENT', 'FAILED'], 'SENT'),
                sentAt: { ...dateTimeString('2026-05-16T09:00:00.000Z'), nullable: true },
                failedAt: { ...dateTimeString('2026-05-16T09:00:00.000Z'), nullable: true },
                failureReason: nullableString('SMTP connection timeout'),
              },
            },
          },
        },
        OrganisationResendEligibility: {
          type: 'object',
          required: ['isEligible', 'reason'],
          properties: {
            isEligible: { type: 'boolean', example: true },
            // reason is always present -- null when eligible, a typed code string when not.
            reason: {
              type: 'string',
              nullable: true,
              enum: [
                'ORGANISATION_NOT_ONBOARDING',
                'INVITATION_NOT_ELIGIBLE',
                'SETUP_ALREADY_COMPLETED',
                'ACTIVE_SETUP_TOKEN_EXISTS',
                'SETUP_TOKEN_EXPIRED',
                'SETUP_EMAIL_FAILED',
                'CONCURRENT_RESEND_IN_PROGRESS',
                null,
              ],
              example: 'ORGANISATION_NOT_ONBOARDING',
            },
          },
        },
        PlatformTimelineEntry: {
          type: 'object',
          required: [
            'id',
            'type',
            'timestamp',
            'action',
            'summary',
            'actor',
            'outcome',
            'metadata',
          ],
          properties: {
            id: uuidString('log-5678-efgh'),
            type: enumString(['AUDIT_LOG', 'EMAIL_DELIVERY'], 'AUDIT_LOG'),
            timestamp: dateTimeString('2026-05-16T09:00:00.000Z'),
            action: { type: 'string', example: 'APPROVED' },
            summary: { type: 'string', example: 'APPROVED on ORGANISATION_REGISTRATION_REQUEST' },
            actor: nullableString('Patricia Platform'),
            // 'status' field removed -- runtime no longer returns it (was a stale duplicate of outcome).
            outcome: nullableString('SUCCESS'),
            // metadata is always null -- raw audit data is never exposed in timeline responses.
            metadata: { type: 'string', nullable: true, enum: [null], example: null },
          },
        },
        PlatformOrganisationDetail: {
          type: 'object',
          required: [
            'id',
            'name',
            'status',
            'detailType',
            'description',
            'approximateSize',
            'website',
            'primaryDomain',
            'createdAt',
            'updatedAt',
            '_count',
            'registrationRequest',
            'setupStatus',
            'resendEligibility',
            'admins',
            'timeline',
          ],
          properties: {
            id: uuidString('f6fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            name: { type: 'string', example: 'Example Consulting' },
            status: enumString(
              ['PENDING_ONBOARDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DISABLED', 'ARCHIVED'],
              'PENDING_ONBOARDING',
            ),
            detailType: enumString(
              [
                'onboarding organisation',
                'active organisation',
                'suspended organisation',
                'disabled organisation',
              ],
              'onboarding organisation',
            ),
            description: nullableString('A consulting company'),
            approximateSize: { type: 'integer', nullable: true, example: 150 },
            website: nullableString('https://example.com'),
            primaryDomain: nullableString('example.com'),
            createdAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            updatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            _count: {
              type: 'object',
              required: ['adminProfiles', 'traineeProfiles'],
              properties: {
                adminProfiles: { type: 'integer', example: 1 },
                traineeProfiles: { type: 'integer', example: 15 },
              },
            },
            registrationRequest: {
              type: 'object',
              nullable: true,
              required: [
                'id',
                'representativeFirstName',
                'representativeLastName',
                'representativeEmail',
              ],
              properties: {
                id: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
                representativeFirstName: { type: 'string', example: 'Adriano' },
                representativeLastName: { type: 'string', example: 'Jorge' },
                representativeEmail: {
                  type: 'string',
                  format: 'email',
                  example: 'adriano@example.com',
                },
                submittedWebsite: nullableString('https://example.com'),
                submittedPrimaryDomain: nullableString('example.com'),
              },
            },
            setupStatus: {
              $ref: '#/components/schemas/OrganisationInitialSetupStatus',
            },
            resendEligibility: {
              $ref: '#/components/schemas/OrganisationResendEligibility',
            },
            admins: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'adminStatus', 'firstName', 'lastName', 'email', 'isInitialAdmin'],
                properties: {
                  id: uuidString('adm-1234-abcd'),
                  // ACTIVE | DISABLED -- PENDING is an invitation status, not an admin profile status.
                  adminStatus: enumString(['ACTIVE', 'DISABLED'], 'ACTIVE'),
                  firstName: { type: 'string', example: 'Jane' },
                  lastName: { type: 'string', example: 'Doe' },
                  email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  isInitialAdmin: booleanProperty(false),
                },
              },
            },
            timeline: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PlatformTimelineEntry',
              },
            },
          },
        },
        PlatformOrganisationRequestDetailsResponse: {
          allOf: [
            { $ref: '#/components/schemas/PlatformOrganisationRequest' },
            {
              type: 'object',
              required: ['detailType', 'setupStatus', 'resendEligibility', 'timeline'],
              properties: {
                detailType: enumString(
                  [
                    'request-only',
                    'onboarding organisation',
                    'active organisation',
                    'suspended organisation',
                    'disabled organisation',
                  ],
                  'request-only',
                ),
                setupStatus: {
                  $ref: '#/components/schemas/OrganisationInitialSetupStatus',
                },
                resendEligibility: {
                  $ref: '#/components/schemas/OrganisationResendEligibility',
                },
                timeline: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/PlatformTimelineEntry',
                  },
                },
              },
            },
          ],
        },
        PlatformAdminRole: enumString(['SUPER_ADMIN', 'NORMAL_ADMIN'], 'SUPER_ADMIN'),
        PlatformAdminStatus: enumString(['ACTIVE', 'DISABLED'], 'ACTIVE'),
        PlatformAdminInvitationStatus: enumString(
          [
            'PENDING',
            'SENT',
            'FAILED_TO_SEND',
            'ACCEPTED',
            'COMPLETED',
            'EXPIRED',
            'REVOKED',
            'REJECTED',
            'PENDING_UPGRADE',
          ],
          'SENT',
        ),
        PlatformAdminAllowedActions: {
          type: 'object',
          required: ['canTransferSuperAdmin', 'canDemote', 'canResendInvite'],
          additionalProperties: false,
          properties: {
            canTransferSuperAdmin: booleanProperty(false),
            canDemote: booleanProperty(true),
            canResendInvite: booleanProperty(false),
          },
        },
        PlatformAdmin: {
          type: 'object',
          required: [
            'id',
            'firstName',
            'lastName',
            'email',
            'platformAdminRole',
            'adminStatus',
            'authStatus',
            'invitationStatus',
            'inviteId',
            'allowedActions',
          ],
          additionalProperties: false,
          properties: {
            id: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            firstName: { type: 'string', example: 'Connor' },
            lastName: { type: 'string', example: 'Bell' },
            email: { type: 'string', format: 'email', example: 'connor.bell@example.com' },
            platformAdminRole: schemaRef('PlatformAdminRole'),
            adminStatus: schemaRef('PlatformAdminStatus'),
            authStatus: schemaRef('AuthStatus'),
            invitationStatus: {
              ...schemaRef('PlatformAdminInvitationStatus'),
              nullable: true,
            },
            inviteId: nullableUuidString('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
            allowedActions: schemaRef('PlatformAdminAllowedActions'),
          },
        },
        PlatformAdminsListResponse: {
          type: 'object',
          required: [
            'admins',
            'allowedToInvite',
            'allowedToTransfer',
            'allowedToDemote',
            'allowedToResendInvites',
          ],
          additionalProperties: false,
          properties: {
            admins: {
              type: 'array',
              items: schemaRef('PlatformAdmin'),
            },
            allowedToInvite: booleanProperty(true),
            allowedToTransfer: booleanProperty(true),
            allowedToDemote: booleanProperty(true),
            allowedToResendInvites: booleanProperty(true),
          },
        },
        InvitePlatformAdminRequest: {
          type: 'object',
          required: ['email'],
          additionalProperties: false,
          properties: {
            email: {
              type: 'string',
              format: 'email',
              minLength: 1,
              maxLength: 254,
              example: 'newadmin@example.com',
            },
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Jane',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Doe',
            },
            confirmUpgrade: booleanProperty(false),
          },
        },
        InvitePlatformAdminResponse: {
          type: 'object',
          required: ['type', 'userId', 'email'],
          additionalProperties: false,
          properties: {
            type: enumString(['new-invite', 'upgrade-confirmation'], 'new-invite'),
            userId: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            email: { type: 'string', format: 'email', example: 'newadmin@example.com' },
          },
        },
        ResendPlatformAdminInviteResponse: {
          type: 'object',
          required: ['success', 'emailQueued'],
          additionalProperties: false,
          properties: {
            success: trueSuccessProperty(),
            emailQueued: booleanProperty(true),
          },
        },
        TransferSuperAdminRequest: {
          type: 'object',
          required: ['targetUserId', 'password', 'confirmation'],
          additionalProperties: false,
          properties: {
            targetUserId: uuidString('c3fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
              example: 'SuperAdminPassword123!',
            },
            confirmation: enumString(['TRANSFER'], 'TRANSFER'),
          },
        },
        DemotePlatformAdminRequest: {
          type: 'object',
          required: ['password', 'confirmation'],
          additionalProperties: false,
          properties: {
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
              example: 'SuperAdminPassword123!',
            },
            confirmation: enumString(['DEMOTE'], 'DEMOTE'),
          },
        },
        DemotePlatformAdminResponse: {
          type: 'object',
          required: ['userId', 'email', 'adminStatus', 'authStatus'],
          additionalProperties: false,
          properties: {
            userId: uuidString('c3fdeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            email: { type: 'string', format: 'email', example: 'demotedadmin@example.com' },
            adminStatus: enumString(['DISABLED'], 'DISABLED'),
            authStatus: schemaRef('AuthStatus'),
          },
        },
        OrganisationPermissionKey: enumString(
          [
            'VIEW_ORGANISATION_ADMINS',
            'INVITE_ORGANISATION_ADMINS',
            'REMOVE_ORGANISATION_ADMINS',
            'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
            'CHANGE_ORGANISATION_SECURITY_SETTINGS',
            'VIEW_ORGANISATION_TRAINEES',
            'INVITE_ORGANISATION_TRAINEES',
            'REMOVE_ORGANISATION_TRAINEES',
            'ASSIGN_CAMPAIGNS',
            'VIEW_CAMPAIGNS',
            'MANAGE_CAMPAIGNS',
          ],
          'VIEW_ORGANISATION_ADMINS',
        ),
        OrganisationAdminPermissionSummary: {
          type: 'object',
          required: ['key', 'displayName'],
          properties: {
            key: {
              $ref: '#/components/schemas/OrganisationPermissionKey',
            },
            displayName: {
              type: 'string',
              example: 'View organisation admins',
            },
          },
        },
        OrganisationAdminAvailablePermission: {
          type: 'object',
          required: ['key', 'displayName', 'isCritical'],
          properties: {
            key: {
              $ref: '#/components/schemas/OrganisationPermissionKey',
            },
            displayName: {
              type: 'string',
              example: 'Invite organisation admins',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Invite or promote users to organisation admin access.',
            },
            isCritical: {
              type: 'boolean',
              example: true,
            },
          },
        },
        OrganisationAdminSummary: {
          type: 'object',
          required: [
            'id',
            'userId',
            'firstName',
            'lastName',
            'email',
            'adminStatus',
            'isInitialAdmin',
            'joinedAt',
            'disabledAt',
            'permissions',
          ],
          properties: {
            id: {
              ...uuidString('22222222-2222-4222-8222-222222222222'),
            },
            userId: {
              ...uuidString('11111111-1111-4111-8111-111111111111'),
            },
            firstName: {
              type: 'string',
              example: 'Johan',
            },
            lastName: {
              type: 'string',
              example: 'Nel',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'johan@example.com',
            },
            adminStatus: enumString(['ACTIVE', 'DISABLED'], 'ACTIVE'),
            isInitialAdmin: {
              type: 'boolean',
              example: true,
            },
            joinedAt: {
              ...dateTimeString('2026-07-01T08:00:00.000Z'),
            },
            disabledAt: {
              ...nullableString('2026-07-02T08:00:00.000Z'),
            },
            permissions: {
              ...arrayOf(schemaRef('OrganisationAdminPermissionSummary')),
            },
          },
        },
        OrganisationAdminListResponse: {
          type: 'object',
          required: ['admins', 'availablePermissions', 'actorPermissions'],
          properties: {
            admins: {
              ...arrayOf(schemaRef('OrganisationAdminSummary')),
            },
            availablePermissions: {
              ...arrayOf(schemaRef('OrganisationAdminAvailablePermission')),
            },
            actorPermissions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrganisationPermissionKey',
              },
              example: ['VIEW_ORGANISATION_ADMINS', 'INVITE_ORGANISATION_ADMINS'],
            },
          },
        },
        OrganisationAdminPromotionRequest: {
          type: 'object',
          required: ['traineeEmail', 'permissionKeys'],
          additionalProperties: false,
          properties: {
            traineeEmail: {
              type: 'string',
              format: 'email',
              example: 'trainee@example.com',
            },
            permissionKeys: {
              type: 'array',
              minItems: 1,
              uniqueItems: true,
              items: {
                $ref: '#/components/schemas/OrganisationPermissionKey',
              },
              example: ['VIEW_ORGANISATION_ADMINS', 'INVITE_ORGANISATION_ADMINS'],
            },
          },
        },
        OrganisationAdminPromotionResponse: {
          type: 'object',
          required: [
            'invitationId',
            'actionTokenId',
            'status',
            'expiresAt',
            'permissionKeys',
            'emailQueued',
          ],
          properties: {
            invitationId: {
              ...uuidString('33333333-3333-4333-8333-333333333333'),
            },
            actionTokenId: {
              ...uuidString('44444444-4444-4444-8444-444444444444'),
            },
            status: enumString(['PENDING', 'SENT', 'FAILED_TO_SEND'], 'SENT'),
            expiresAt: {
              ...dateTimeString('2026-07-08T08:00:00.000Z'),
            },
            permissionKeys: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrganisationPermissionKey',
              },
              example: ['VIEW_ORGANISATION_ADMINS', 'INVITE_ORGANISATION_ADMINS'],
            },
            emailQueued: {
              type: 'boolean',
              example: true,
            },
          },
        },
        OrganisationAdminPermissionUpdateRequest: {
          type: 'object',
          required: ['permissionKeys'],
          additionalProperties: false,
          properties: {
            permissionKeys: {
              type: 'array',
              minItems: 1,
              uniqueItems: true,
              items: {
                $ref: '#/components/schemas/OrganisationPermissionKey',
              },
              example: ['VIEW_ORGANISATION_ADMINS', 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'],
            },
          },
        },
        OrganisationAdminPermissionUpdateResponse: {
          type: 'object',
          required: ['adminId', 'permissionKeys'],
          properties: {
            adminId: {
              ...uuidString('22222222-2222-4222-8222-222222222222'),
            },
            permissionKeys: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrganisationPermissionKey',
              },
              example: ['VIEW_ORGANISATION_ADMINS', 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'],
            },
          },
        },
        OrganisationAdminRemoveRequest: {
          type: 'object',
          required: ['password', 'confirmation'],
          additionalProperties: false,
          properties: {
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
            },
            confirmation: {
              type: 'string',
              enum: ['REMOVE'],
              example: 'REMOVE',
            },
          },
        },
        OrganisationAdminRemoveResponse: {
          type: 'object',
          required: ['adminId', 'status'],
          properties: {
            adminId: {
              ...uuidString('22222222-2222-4222-8222-222222222222'),
            },
            status: enumString(['DISABLED'], 'DISABLED'),
          },
        },
        TraineeListItem: {
          type: 'object',
          required: ['id', 'rowType', 'type', 'email', 'status', 'eligibility'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-4111-8111-111111111111',
            },
            rowType: {
              type: 'string',
              enum: ['ACTIVE_TRAINEE', 'INVITATION'],
              example: 'INVITATION',
            },
            type: {
              type: 'string',
              enum: ['ACTIVE_TRAINEE', 'INVITATION'],
              example: 'INVITATION',
            },
            traineeProfileId: {
              type: 'string',
              format: 'uuid',
              example: '22222222-2222-4222-8222-222222222222',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-4333-8333-333333333333',
            },
            invitationId: {
              type: 'string',
              format: 'uuid',
              example: '44444444-4444-4444-8444-444444444444',
            },
            invitationStatus: {
              type: 'string',
              enum: [
                'PENDING',
                'SENT',
                'FAILED_TO_SEND',
                'ACCEPTED',
                'COMPLETED',
                'EXPIRED',
                'REVOKED',
                'REJECTED',
              ],
              example: 'PENDING',
            },
            invitationLifecycleState: {
              type: 'string',
              enum: [
                'PENDING',
                'SENT',
                'FAILED_TO_SEND',
                'ACCEPTED',
                'COMPLETED',
                'EXPIRED',
                'REVOKED',
                'REJECTED',
              ],
              nullable: true,
              example: 'PENDING',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'trainee@example.com',
            },
            firstName: {
              ...nullableString('Alex'),
            },
            lastName: {
              ...nullableString('Trainee'),
            },
            status: enumString(
              [
                'ACTIVE',
                'DISABLED',
                'INVITE_PENDING',
                'INVITE_FAILED',
                'INVITE_EXPIRED',
                'INVITE_REJECTED',
                'INVITE_REVOKED',
                'INVITE_ACCEPTED',
                'INVITE_COMPLETED',
              ],
              'ACTIVE',
            ),
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-07-15T12:00:00.000Z',
            },
            joinedAt: {
              ...nullableString('2026-07-15T12:00:00.000Z'),
            },
            invitedAt: {
              ...nullableString('2026-07-15T12:00:00.000Z'),
            },
            disabledAt: {
              ...nullableString('2026-07-20T12:00:00.000Z'),
            },
            disabledReason: {
              ...nullableString('No longer with organisation.'),
            },
            expiresAt: {
              ...nullableString('2026-07-22T12:00:00.000Z'),
            },
            emailDeliveryStatus: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'FAILED', 'UNKNOWN'],
              example: 'SENT',
            },
            deliveryState: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'FAILED', 'UNKNOWN'],
              example: 'SENT',
            },
            requiredAction: {
              type: 'string',
              enum: ['NONE', 'CONTINUE_SETUP'],
              example: 'CONTINUE_SETUP',
            },
            requiredActions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['NONE', 'CONTINUE_SETUP'],
              },
              example: ['CONTINUE_SETUP'],
            },
            eligibility: {
              type: 'object',
              required: [
                'canResend',
                'canRevoke',
                'canDisable',
                'canPromote',
                'resendCooldownSeconds',
              ],
              properties: {
                canResend: booleanProperty(false),
                canRevoke: booleanProperty(false),
                canDisable: booleanProperty(true),
                canPromote: booleanProperty(true),
                resendCooldownSeconds: { type: 'number', example: 0 },
                resendDisabledReason: nullableString('Resend is only available for invitations.'),
                resendDisabledReasonCode: {
                  type: 'string',
                  nullable: true,
                  enum: [
                    'COOLDOWN_ACTIVE',
                    'INVITATION_NOT_ACTIVE',
                    'INVITATION_REVOKED',
                    'INVITATION_ACCEPTED',
                    'INVITATION_REJECTED',
                    'INVITATION_EXPIRED',
                    'INVITATION_COMPLETED',
                    'INVITATION_NOT_RESENDABLE',
                    'NOT_APPLICABLE',
                  ],
                  example: 'NOT_APPLICABLE',
                },
                revokeDisabledReason: nullableString('Revoke is only available for invitations.'),
                revokeDisabledReasonCode: {
                  type: 'string',
                  nullable: true,
                  enum: [
                    'COOLDOWN_ACTIVE',
                    'INVITATION_NOT_ACTIVE',
                    'INVITATION_REVOKED',
                    'INVITATION_ACCEPTED',
                    'INVITATION_REJECTED',
                    'INVITATION_EXPIRED',
                    'INVITATION_COMPLETED',
                    'INVITATION_NOT_RESENDABLE',
                    'NOT_APPLICABLE',
                  ],
                  example: 'NOT_APPLICABLE',
                },
                disableDisabledReason: nullableString('Cannot disable a pending invitation.'),
                disableDisabledReasonCode: {
                  type: 'string',
                  nullable: true,
                  enum: ['COOLDOWN_ACTIVE', 'INVITATION_NOT_ACTIVE', 'NOT_APPLICABLE'],
                  example: 'NOT_APPLICABLE',
                },
                promoteDisabledReason: nullableString('Only active trainees can be promoted.'),
                promoteDisabledReasonCode: {
                  type: 'string',
                  nullable: true,
                  enum: ['COOLDOWN_ACTIVE', 'INVITATION_NOT_ACTIVE', 'NOT_APPLICABLE'],
                  example: 'NOT_APPLICABLE',
                },
              },
            },
          },
        },
        TraineeListResponse: {
          type: 'object',
          required: ['trainees', 'invitations'],
          properties: {
            trainees: arrayOf(schemaRef('TraineeListItem')),
            invitations: arrayOf(schemaRef('TraineeListItem')),
            pendingInvitations: arrayOf(schemaRef('TraineeListItem')),
          },
        },
        CreateTraineeInvitationRequest: {
          type: 'object',
          required: ['email'],
          additionalProperties: false,
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'new.trainee@example.com',
            },
            firstName: {
              type: 'string',
              example: 'Sam',
            },
            lastName: {
              type: 'string',
              example: 'New',
            },
          },
        },
        CreateTraineeInvitationResponse: {
          type: 'object',
          required: ['success', 'message', 'invitation'],
          properties: {
            success: booleanProperty(true),
            message: {
              type: 'string',
              example: 'Invitation email queued for delivery.',
            },
            invitation: {
              $ref: '#/components/schemas/TraineeListItem',
            },
          },
        },
        InvitationResendResponse: {
          type: 'object',
          required: ['success', 'message', 'invitationId', 'status', 'resentAt', 'invitation'],
          properties: {
            success: booleanProperty(true),
            message: {
              type: 'string',
              example: 'Invitation email queued for delivery.',
            },
            invitationId: {
              ...uuidString('33333333-3333-4333-8333-333333333333'),
            },
            status: enumString(
              [
                'PENDING',
                'SENT',
                'FAILED_TO_SEND',
                'ACCEPTED',
                'COMPLETED',
                'EXPIRED',
                'REVOKED',
                'REJECTED',
              ],
              'SENT',
            ),
            resentAt: {
              ...dateTimeString('2026-07-15T08:30:00.000Z'),
            },
            invitation: {
              $ref: '#/components/schemas/TraineeListItem',
            },
          },
        },
        InvitationRevokeResponse: {
          type: 'object',
          required: ['success', 'message', 'invitationId', 'status', 'revokedAt'],
          properties: {
            success: booleanProperty(true),
            message: {
              type: 'string',
              example: 'Invitation revoked successfully.',
            },
            invitationId: {
              ...uuidString('33333333-3333-4333-8333-333333333333'),
            },
            status: enumString(['REVOKED'], 'REVOKED'),
            revokedAt: {
              ...dateTimeString('2026-07-15T08:30:00.000Z'),
            },
          },
        },
        DisableTraineeRequest: {
          type: 'object',
          required: ['password', 'confirmation'],
          additionalProperties: false,
          properties: {
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
            },
            confirmation: {
              type: 'boolean',
              enum: [true],
              example: true,
            },
            disabledReason: {
              type: 'string',
              example: 'Policy violation or leaving organization',
            },
          },
        },
        DisableTraineeResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: booleanProperty(true),
            message: {
              type: 'string',
              example: 'Trainee account disabled successfully.',
            },
            traineeId: uuidString('44444444-4444-4444-8444-444444444444'),
            status: enumString(['DISABLED'], 'DISABLED'),
          },
        },
        OrganisationSecuritySettings: {
          type: 'object',
          required: [
            'id',
            'organisationId',
            ...organisationSecuritySettingsValueRequired,
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: {
              ...uuidString('33333333-3333-4333-8333-333333333333'),
            },
            organisationId: {
              ...uuidString('11111111-1111-4111-8111-111111111111'),
            },
            ...organisationSecuritySettingsValueProperties(),
            updatedByOrganisationAdminId: {
              ...nullableUuidString('22222222-2222-4222-8222-222222222222'),
            },
            createdAt: {
              ...dateTimeString('2026-07-01T08:00:00.000Z'),
            },
            updatedAt: {
              ...dateTimeString('2026-07-02T08:00:00.000Z'),
            },
          },
        },
        OrganisationSecuritySettingsEffectivePolicy: {
          type: 'object',
          required: [
            'organisationId',
            'rememberMeRequested',
            'rememberMeAllowed',
            'rememberMeApplied',
            'regularSessionSeconds',
            'rememberedSessionSeconds',
            'effectiveSessionSeconds',
            'idleTimeoutMinutes',
            'requireReauthenticationForSensitiveActions',
            'allowEmailChange',
          ],
          properties: {
            organisationId: {
              ...nullableUuidString('11111111-1111-4111-8111-111111111111'),
            },
            rememberMeRequested: {
              ...booleanProperty(false),
            },
            rememberMeAllowed: {
              ...booleanProperty(true),
            },
            rememberMeApplied: {
              ...booleanProperty(false),
            },
            regularSessionSeconds: {
              type: 'integer',
              example: 28800,
            },
            rememberedSessionSeconds: {
              type: 'integer',
              example: 604800,
            },
            effectiveSessionSeconds: {
              type: 'integer',
              example: 28800,
            },
            idleTimeoutMinutes: {
              type: 'integer',
              nullable: true,
              example: 30,
            },
            requireReauthenticationForSensitiveActions: {
              ...booleanProperty(true),
            },
            allowEmailChange: {
              ...booleanProperty(false),
            },
          },
        },
        OrganisationSecuritySettingsLimits: {
          type: 'object',
          required: ['rememberMe', 'regularSession', 'idleTimeout'],
          properties: {
            rememberMe: {
              type: 'object',
              required: ['maxRememberedSessionHours'],
              properties: {
                maxRememberedSessionHours: integerOptionsLimit({
                  minimum: 1,
                  maximum: 720,
                  defaultValue: 168,
                  options: [24, 72, 168, 336, 720],
                }),
              },
            },
            regularSession: {
              type: 'object',
              required: ['regularSessionLengthHours'],
              properties: {
                regularSessionLengthHours: integerOptionsLimit({
                  minimum: 1,
                  maximum: 24,
                  defaultValue: 8,
                  options: [4, 8, 12, 24],
                }),
              },
            },
            idleTimeout: {
              type: 'object',
              required: ['idleTimeoutMinutes'],
              properties: {
                idleTimeoutMinutes: integerOptionsLimit({
                  minimum: 5,
                  maximum: 480,
                  defaultValue: 30,
                  options: [15, 30, 60, 120, 240, 480],
                }),
              },
            },
          },
        },
        OrganisationSecuritySettingsChangesApply: {
          type: 'object',
          required: [
            'rememberMePolicy',
            'regularSessionLength',
            'idleTimeout',
            'requireReauthenticationForSensitiveActions',
            'allowTraineeEmailChange',
          ],
          properties: {
            rememberMePolicy: enumString(['NEXT_REFRESH_OR_LOGIN'], 'NEXT_REFRESH_OR_LOGIN'),
            regularSessionLength: enumString(['NEXT_REFRESH_OR_LOGIN'], 'NEXT_REFRESH_OR_LOGIN'),
            idleTimeout: enumString(['NEXT_REFRESH'], 'NEXT_REFRESH'),
            requireReauthenticationForSensitiveActions: enumString(
              ['IMMEDIATE_FOR_NEW_ACTIONS'],
              'IMMEDIATE_FOR_NEW_ACTIONS',
            ),
            allowTraineeEmailChange: enumString(
              ['IMMEDIATE_FOR_NEW_REQUESTS'],
              'IMMEDIATE_FOR_NEW_REQUESTS',
            ),
          },
        },
        OrganisationSecuritySettingsCapabilities: {
          type: 'object',
          required: ['canView', 'canEdit', 'readOnlyReason', 'changesApply'],
          properties: {
            canView: {
              ...booleanProperty(true),
            },
            canEdit: {
              ...booleanProperty(true),
            },
            readOnlyReason: {
              type: 'string',
              nullable: true,
              enum: ['MISSING_PERMISSION', 'ORGANISATION_SUSPENDED', 'ORGANISATION_DISABLED'],
              example: null,
            },
            changesApply: {
              $ref: '#/components/schemas/OrganisationSecuritySettingsChangesApply',
            },
          },
        },
        OrganisationSecuritySettingsResponse: {
          type: 'object',
          required: [
            'organisationId',
            'settings',
            'effectivePolicy',
            'platformLimits',
            'capabilities',
          ],
          properties: {
            organisationId: {
              ...uuidString('11111111-1111-4111-8111-111111111111'),
            },
            settings: {
              $ref: '#/components/schemas/OrganisationSecuritySettings',
            },
            effectivePolicy: {
              $ref: '#/components/schemas/OrganisationSecuritySettingsEffectivePolicy',
            },
            platformLimits: {
              $ref: '#/components/schemas/OrganisationSecuritySettingsLimits',
            },
            capabilities: {
              $ref: '#/components/schemas/OrganisationSecuritySettingsCapabilities',
            },
          },
        },
        OrganisationSecuritySettingsUpdateRequest: {
          type: 'object',
          required: [
            ...organisationSecuritySettingsValueRequired,
            'maxRememberedSessionHours',
            'regularSessionLengthHours',
            'idleTimeoutMinutes',
          ],
          additionalProperties: false,
          properties: organisationSecuritySettingsValueProperties(),
        },
        DifficultyLevel: enumString(
          ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE'],
          'BEGINNER',
        ),
        TrainingContentType: enumString(
          ['PDF', 'MARKDOWN', 'HTML', 'URL', 'INTERACTIVE'],
          'MARKDOWN',
        ),
        TrainingDocumentStatus: enumString(
          ['DRAFT', 'AVAILABLE', 'UNAVAILABLE', 'ARCHIVED'],
          'AVAILABLE',
        ),
        TrainingCampaignItemAvailabilityStatus: enumString(
          ['AVAILABLE', 'LOCKED', 'UNAVAILABLE', 'ARCHIVED'],
          'AVAILABLE',
        ),
        TrainingInteractionEventType: enumString(
          ['TRAINING_VIEWED', 'TRAINING_COMPLETED'],
          'TRAINING_VIEWED',
        ),
        CampaignType: enumString(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM'], 'PREMADE_GENERAL'),
        CampaignStatus: enumString(
          ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
          'ACTIVE',
        ),
        CampaignAssignmentStatus: enumString(
          ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
          'IN_PROGRESS',
        ),
        CampaignAccessType: enumString(['ASSIGNED', 'SELF_SELECTED'], 'ASSIGNED'),
        CampaignItemType: enumString(['COMPONENT', 'GROUP'], 'COMPONENT'),
        CampaignComponentType: enumString(
          ['SIMULATED_INBOX', 'TRAINING_DOCUMENT', 'QUIZ'],
          'TRAINING_DOCUMENT',
        ),
        CampaignGroupType: enumString(
          ['SECTION', 'MODULE', 'REVISION_SET', 'ASSESSMENT_SET', 'SIMULATION_SET'],
          'MODULE',
        ),
        CampaignCompletionRule: enumString(
          ['COMPLETE_ALL', 'COMPLETE_ANY', 'COMPLETE_REQUIRED_ONLY'],
          'COMPLETE_REQUIRED_ONLY',
        ),
        CampaignItemAvailabilityStatus: enumString(
          ['AVAILABLE', 'LOCKED', 'UNAVAILABLE', 'ARCHIVED'],
          'AVAILABLE',
        ),
        TraineeCampaignProgressStatus: enumString(
          [
            'NOT_STARTED',
            'VIEWED',
            'INTERACTED',
            'CLASSIFIED',
            'IN_PROGRESS',
            'COMPLETED',
            'SUBMITTED',
          ],
          'VIEWED',
        ),
        TraineeCampaignAssignmentSummary: {
          type: 'object',
          required: ['assignmentId', 'assignmentStatus', 'accessType', 'assignedAt'],
          properties: {
            assignmentId: {
              ...uuidString('55555555-5555-4555-8555-555555555555'),
            },
            assignmentStatus: {
              $ref: '#/components/schemas/CampaignAssignmentStatus',
            },
            accessType: {
              $ref: '#/components/schemas/CampaignAccessType',
            },
            currentCampaignItemId: {
              ...nullableUuidString('88888888-8888-4888-8888-888888888888'),
            },
            assignedAt: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
            },
            dueDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            startedAt: {
              ...dateTimeString('2026-05-16T08:30:00.000Z'),
              nullable: true,
            },
            completedAt: {
              ...dateTimeString('2026-05-17T08:30:00.000Z'),
              nullable: true,
            },
          },
        },
        CampaignAllowedAction: enumString(
          ['VIEW', 'EDIT', 'ACTIVATE', 'ARCHIVE', 'REACTIVATE', 'ASSIGN'],
          'VIEW',
        ),
        CampaignEligibilityReason: enumString(
          ['AVAILABLE', 'NOT_STARTED', 'EXPIRED', 'CAMPAIGN_INACTIVE', 'COMPLETED'],
          'AVAILABLE',
        ),
        CampaignEligibility: {
          type: 'object',
          required: ['canView', 'canProgress', 'reason'],
          properties: {
            canView: booleanProperty(true),
            canProgress: booleanProperty(true),
            reason: schemaRef('CampaignEligibilityReason'),
          },
        },
        CampaignMutationPrecondition: {
          type: 'object',
          required: ['expectedUpdatedAt'],
          properties: {
            expectedUpdatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
          },
        },
        CampaignLifecycleActionResponse: {
          type: 'object',
          required: ['success', 'campaignId', 'status', 'updatedAt', 'allowedActions'],
          properties: {
            success: trueSuccessProperty(),
            campaignId: uuidString('44444444-4444-4444-8444-444444444444'),
            status: schemaRef('CampaignStatus'),
            updatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            allowedActions: {
              ...arrayOf(schemaRef('CampaignAllowedAction')),
            },
          },
        },
        CampaignDetailComponentItem: {
          type: 'object',
          required: [
            'campaignItemId',
            'itemType',
            'componentType',
            'contentId',
            'title',
            'position',
            'isRequired',
            'sourceAvailable',
          ],
          properties: {
            campaignItemId: uuidString('88888888-8888-4888-8888-888888888888'),
            itemType: {
              type: 'string',
              enum: ['COMPONENT'],
              example: 'COMPONENT',
            },
            componentType: schemaRef('CampaignComponentType'),
            contentId: uuidString('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
            title: {
              type: 'string',
              example: 'Phishing Awareness Video',
            },
            description: nullableString('Core training content'),
            position: {
              type: 'integer',
              example: 10,
            },
            isRequired: booleanProperty(true),
            sourceAvailable: booleanProperty(true),
          },
        },
        CampaignDetailGroupItem: {
          type: 'object',
          required: [
            'campaignItemId',
            'itemType',
            'groupType',
            'completionRule',
            'title',
            'position',
            'isRequired',
            'children',
          ],
          properties: {
            campaignItemId: uuidString('66666666-6666-4666-8666-666666666666'),
            itemType: {
              type: 'string',
              enum: ['GROUP'],
              example: 'GROUP',
            },
            title: {
              type: 'string',
              example: 'Module 1: Phishing Basics',
            },
            description: nullableString('Core concepts and quiz'),
            groupType: schemaRef('CampaignGroupType'),
            completionRule: schemaRef('CampaignCompletionRule'),
            position: {
              type: 'integer',
              example: 10,
            },
            isRequired: booleanProperty(true),
            children: {
              type: 'array',
              minItems: 2,
              items: schemaRef('CampaignDetailComponentItem'),
            },
          },
        },
        CampaignDetailItem: {
          oneOf: [schemaRef('CampaignDetailComponentItem'), schemaRef('CampaignDetailGroupItem')],
        },
        CampaignDetailResponse: {
          type: 'object',
          required: [
            'id',
            'name',
            'campaignType',
            'status',
            'createdAt',
            'updatedAt',
            'allowedActions',
            'items',
          ],
          properties: {
            id: uuidString('44444444-4444-4444-8444-444444444444'),
            organisationId: nullableUuidString('11111111-1111-4111-8111-111111111111'),
            name: {
              type: 'string',
              example: 'Phishing Defense 2026',
            },
            description: nullableString('Comprehensive phishing simulation and quiz'),
            accentColor: nullableString('#00FFA6'),
            campaignType: schemaRef('CampaignType'),
            status: schemaRef('CampaignStatus'),
            startDate: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
              nullable: true,
            },
            endDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            createdBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: uuidString('33333333-3333-4333-8333-333333333333'),
                displayName: {
                  type: 'string',
                  example: 'Alex Security',
                },
              },
            },
            createdAt: dateTimeString('2026-05-16T08:00:00.000Z'),
            updatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            allowedActions: {
              ...arrayOf(schemaRef('CampaignAllowedAction')),
            },
            items: {
              ...arrayOf(schemaRef('CampaignDetailItem')),
            },
          },
        },
        CampaignListRow: {
          type: 'object',
          required: [
            'id',
            'name',
            'campaignType',
            'status',
            'itemCount',
            'createdAt',
            'updatedAt',
            'allowedActions',
          ],
          properties: {
            id: uuidString('44444444-4444-4444-8444-444444444444'),
            name: {
              type: 'string',
              example: 'Phishing Defense 2026',
            },
            description: nullableString('Comprehensive phishing simulation and quiz'),
            accentColor: nullableString('#00FFA6'),
            campaignType: schemaRef('CampaignType'),
            status: schemaRef('CampaignStatus'),
            itemCount: {
              type: 'integer',
              minimum: 0,
              example: 3,
            },
            startDate: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
              nullable: true,
            },
            endDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            createdBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: uuidString('33333333-3333-4333-8333-333333333333'),
                displayName: {
                  type: 'string',
                  example: 'Alex Security',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'alex@example.com',
                },
              },
            },
            createdAt: dateTimeString('2026-05-16T08:00:00.000Z'),
            updatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            allowedActions: {
              ...arrayOf(schemaRef('CampaignAllowedAction')),
            },
          },
        },
        GetCampaignsResponse: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: {
              ...arrayOf(schemaRef('CampaignListRow')),
            },
            pagination: schemaRef('PaginationMetadata'),
          },
        },
        CampaignCatalogueItem: {
          type: 'object',
          required: ['id', 'type', 'title', 'difficultyLevel', 'status'],
          properties: {
            id: uuidString('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
            type: schemaRef('CampaignComponentType'),
            title: {
              type: 'string',
              example: 'Phishing Indicators',
            },
            description: nullableString('Common indicators in corporate emails'),
            contentType: nullableString('MARKDOWN'),
            estimatedReadTimeMinutes: nullableIntegerRange({
              minimum: 1,
              maximum: 120,
              example: 8,
            }),
            passThresholdPercentage: nullableIntegerRange({
              minimum: 0,
              maximum: 100,
              example: 80,
            }),
            questionCount: {
              type: 'integer',
              nullable: true,
              example: 5,
            },
            emailCount: {
              type: 'integer',
              nullable: true,
              example: 3,
            },
            difficultyLevel: schemaRef('DifficultyLevel'),
            status: {
              type: 'string',
              example: 'AVAILABLE',
            },
          },
        },
        GetCampaignCatalogueResponse: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: {
              ...arrayOf(schemaRef('CampaignCatalogueItem')),
            },
            pagination: schemaRef('PaginationMetadata'),
          },
        },
        CreateCampaignDraftComponentItemInput: {
          type: 'object',
          required: ['componentType', 'contentId'],
          properties: {
            itemType: {
              type: 'string',
              enum: ['COMPONENT'],
              example: 'COMPONENT',
            },
            campaignItemId: nullableUuidString('88888888-8888-4888-8888-888888888888'),
            componentType: schemaRef('CampaignComponentType'),
            contentId: uuidString('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
            isRequired: booleanProperty(true),
          },
        },
        CreateCampaignDraftGroupItemInput: {
          type: 'object',
          required: ['itemType', 'title', 'groupType', 'completionRule', 'children'],
          properties: {
            itemType: {
              type: 'string',
              enum: ['GROUP'],
              example: 'GROUP',
            },
            campaignItemId: nullableUuidString('66666666-6666-4666-8666-666666666666'),
            title: {
              type: 'string',
              example: 'Module 1: Phishing Basics',
            },
            description: nullableString('Core training concepts'),
            groupType: schemaRef('CampaignGroupType'),
            completionRule: schemaRef('CampaignCompletionRule'),
            isRequired: booleanProperty(true),
            children: {
              type: 'array',
              minItems: 2,
              items: schemaRef('CreateCampaignDraftComponentItemInput'),
            },
          },
        },
        CreateCampaignDraftItemInput: {
          oneOf: [
            schemaRef('CreateCampaignDraftComponentItemInput'),
            schemaRef('CreateCampaignDraftGroupItemInput'),
          ],
        },
        CreateCampaignDraftRequest: {
          type: 'object',
          required: ['name', 'accentColor', 'items'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
              example: 'Phishing Defense 2026',
            },
            description: nullableString('Comprehensive awareness campaign'),
            accentColor: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              example: '#00FFA6',
            },
            startDate: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
              nullable: true,
            },
            endDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            items: {
              type: 'array',
              items: schemaRef('CreateCampaignDraftItemInput'),
            },
          },
        },
        UpdateCampaignDraftRequest: {
          type: 'object',
          required: ['expectedUpdatedAt', 'name', 'accentColor', 'items'],
          properties: {
            expectedUpdatedAt: dateTimeString('2026-05-16T09:00:00.000Z'),
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
              example: 'Phishing Defense 2026',
            },
            description: nullableString('Comprehensive awareness campaign'),
            accentColor: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              example: '#00FFA6',
            },
            startDate: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
              nullable: true,
            },
            endDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            items: {
              type: 'array',
              items: schemaRef('CreateCampaignDraftItemInput'),
            },
          },
        },
        TraineeCampaignSummary: {
          type: 'object',
          required: [
            'campaignId',
            'name',
            'campaignType',
            'difficultyLevel',
            'status',
            'eligibility',
          ],
          properties: {
            campaignId: {
              ...uuidString('44444444-4444-4444-8444-444444444444'),
            },
            name: {
              type: 'string',
              example: 'Phishing Fundamentals',
            },
            description: {
              ...nullableString('Build safe email habits.'),
            },
            accentColor: {
              ...nullableString('#00FFA6'),
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
            campaignType: {
              $ref: '#/components/schemas/CampaignType',
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            status: {
              $ref: '#/components/schemas/CampaignStatus',
            },
            startDate: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
              nullable: true,
            },
            endDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            assignment: {
              nullable: true,
              allOf: [schemaRef('TraineeCampaignAssignmentSummary')],
            },
            accessType: {
              nullable: true,
              allOf: [schemaRef('CampaignAccessType')],
            },
            progressStatus: {
              nullable: true,
              allOf: [schemaRef('TraineeCampaignProgressStatus')],
            },
            itemCount: {
              type: 'integer',
              minimum: 0,
              example: 4,
            },
            availableItemCount: {
              type: 'integer',
              minimum: 0,
              example: 3,
            },
            eligibility: schemaRef('CampaignEligibility'),
          },
        },
        CampaignTrainingDocumentSummary: {
          type: 'object',
          required: ['id', 'title', 'difficultyLevel', 'status'],
          properties: {
            id: {
              ...uuidString('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
            },
            title: {
              type: 'string',
              example: 'Identifying Phishing Emails',
            },
            contentSummary: {
              ...nullableString('Common phishing indicators.'),
            },
            estimatedReadTimeMinutes: {
              type: 'integer',
              nullable: true,
              minimum: 0,
              example: 8,
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            status: {
              $ref: '#/components/schemas/TrainingDocumentStatus',
            },
          },
        },
        CampaignQuizSummary: {
          type: 'object',
          required: ['id', 'title', 'passThresholdPercentage', 'difficultyLevel', 'status'],
          properties: {
            id: {
              ...uuidString('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
            },
            title: {
              type: 'string',
              example: 'Phishing Check',
            },
            description: {
              ...nullableString('Choose the safest action.'),
            },
            passThresholdPercentage: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 70,
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            status: {
              $ref: '#/components/schemas/QuizStatus',
            },
            questionCount: {
              type: 'integer',
              minimum: 0,
              example: 4,
            },
          },
        },
        CampaignSimulationSummary: {
          type: 'object',
          required: ['id', 'title', 'difficultyLevel'],
          properties: {
            id: {
              ...uuidString('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
            },
            title: {
              type: 'string',
              example: 'Inbox Simulation',
            },
            description: {
              ...nullableString('Practice with a realistic inbox.'),
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
          },
        },
        TraineeCampaignItemSummary: {
          oneOf: [schemaRef('TraineeCampaignComponentItem'), schemaRef('TraineeCampaignGroupItem')],
          discriminator: {
            propertyName: 'itemType',
          },
        },
        TraineeCampaignComponentItem: {
          type: 'object',
          required: [
            'campaignItemId',
            'campaignId',
            'itemType',
            'componentType',
            'title',
            'position',
            'isRequired',
            'availabilityStatus',
            'isOpenable',
            'activityApiPath',
            'eligibility',
          ],
          properties: {
            campaignItemId: {
              ...uuidString('88888888-8888-4888-8888-888888888888'),
            },
            campaignId: {
              ...uuidString('44444444-4444-4444-8444-444444444444'),
            },
            parentGroupId: {
              ...nullableUuidString('66666666-6666-4666-8666-666666666666'),
            },
            itemType: {
              type: 'string',
              enum: ['COMPONENT'],
              example: 'COMPONENT',
            },
            componentType: {
              $ref: '#/components/schemas/CampaignComponentType',
            },
            groupType: {
              type: 'string',
              nullable: true,
              example: null,
            },
            completionRule: {
              type: 'string',
              nullable: true,
              example: null,
            },
            title: {
              type: 'string',
              example: 'Phishing basics',
            },
            description: {
              ...nullableString('Read this first.'),
            },
            position: {
              type: 'integer',
              example: 1,
            },
            isRequired: {
              type: 'boolean',
              example: true,
            },
            availabilityStatus: {
              $ref: '#/components/schemas/CampaignItemAvailabilityStatus',
            },
            isOpenable: {
              type: 'boolean',
              example: true,
            },
            activityApiPath: {
              type: 'string',
              description:
                'Activity endpoint for supported components. SIMULATED_INBOX maps to /trainee/campaign-items/{campaignItemId}/simulated-inbox, TRAINING_DOCUMENT maps to /trainee/campaign-items/{campaignItemId}/training-document, and QUIZ maps to /trainee/campaign-items/{campaignItemId}/quiz.',
              example:
                '/trainee/campaign-items/88888888-8888-4888-8888-888888888888/training-document',
            },
            progressStatus: {
              nullable: true,
              allOf: [schemaRef('TraineeCampaignProgressStatus')],
            },
            eligibility: schemaRef('CampaignEligibility'),
            trainingDocument: {
              nullable: true,
              allOf: [schemaRef('CampaignTrainingDocumentSummary')],
            },
            quiz: {
              nullable: true,
              allOf: [schemaRef('CampaignQuizSummary')],
            },
            simulation: {
              nullable: true,
              allOf: [schemaRef('CampaignSimulationSummary')],
            },
          },
        },
        TraineeCampaignGroupItem: {
          type: 'object',
          required: [
            'campaignItemId',
            'campaignId',
            'itemType',
            'groupType',
            'completionRule',
            'title',
            'position',
            'isRequired',
            'availabilityStatus',
            'isOpenable',
            'eligibility',
            'children',
          ],
          properties: {
            campaignItemId: {
              ...uuidString('66666666-6666-4666-8666-666666666666'),
            },
            campaignId: {
              ...uuidString('44444444-4444-4444-8444-444444444444'),
            },
            parentGroupId: {
              ...nullableUuidString('66666666-6666-4666-8666-666666666666'),
            },
            itemType: {
              type: 'string',
              enum: ['GROUP'],
              example: 'GROUP',
            },
            componentType: {
              type: 'string',
              nullable: true,
              example: null,
            },
            groupType: {
              $ref: '#/components/schemas/CampaignGroupType',
            },
            completionRule: {
              $ref: '#/components/schemas/CampaignCompletionRule',
            },
            title: {
              type: 'string',
              example: 'Email safety module',
            },
            description: {
              ...nullableString('Work through the essentials.'),
            },
            position: {
              type: 'integer',
              example: 1,
            },
            isRequired: {
              type: 'boolean',
              example: true,
            },
            availabilityStatus: {
              $ref: '#/components/schemas/CampaignItemAvailabilityStatus',
            },
            isOpenable: {
              type: 'boolean',
              enum: [false],
              example: false,
            },
            activityApiPath: {
              type: 'string',
              nullable: true,
              example: null,
            },
            progressStatus: {
              nullable: true,
              allOf: [schemaRef('TraineeCampaignProgressStatus')],
            },
            eligibility: schemaRef('CampaignEligibility'),
            children: {
              ...arrayOf(schemaRef('TraineeCampaignItemSummary')),
            },
          },
        },
        GetTraineeCampaignsResponse: {
          type: 'object',
          required: ['campaigns'],
          properties: {
            campaigns: {
              ...arrayOf(schemaRef('TraineeCampaignSummary')),
            },
          },
        },
        GetTraineeCampaignDetailResponse: {
          allOf: [
            schemaRef('TraineeCampaignSummary'),
            {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  ...arrayOf(schemaRef('TraineeCampaignItemSummary')),
                },
              },
            },
          ],
        },
        PaginationMetadata: {
          type: 'object',
          required: ['page', 'limit', 'totalItems', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
          properties: {
            page: { type: 'integer', minimum: 1, example: 1 },
            limit: { type: 'integer', minimum: 1, example: 10 },
            totalItems: { type: 'integer', minimum: 0, example: 45 },
            totalPages: { type: 'integer', minimum: 0, example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
        PlatformCampaignSummary: {
          type: 'object',
          required: [
            'campaignId',
            'name',
            'campaignType',
            'difficultyLevel',
            'status',
            'eligibility',
          ],
          properties: {
            campaignId: {
              ...uuidString('44444444-4444-4444-8444-444444444444'),
            },
            name: {
              type: 'string',
              example: 'Phishing Fundamentals',
            },
            description: {
              ...nullableString('Build safe email habits.'),
            },
            accentColor: {
              ...nullableString('#00FFA6'),
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
            campaignType: {
              type: 'string',
              enum: ['PREMADE_GENERAL'],
              example: 'PREMADE_GENERAL',
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE'],
              example: 'ACTIVE',
            },
            startDate: {
              ...dateTimeString('2026-05-16T08:00:00.000Z'),
              nullable: true,
            },
            endDate: {
              ...dateTimeString('2026-06-16T08:00:00.000Z'),
              nullable: true,
            },
            assignment: {
              nullable: true,
              allOf: [schemaRef('TraineeCampaignAssignmentSummary')],
            },
            accessType: {
              nullable: true,
              allOf: [schemaRef('CampaignAccessType')],
            },
            isEnrolled: {
              type: 'boolean',
              example: false,
            },
            progressStatus: {
              nullable: true,
              allOf: [schemaRef('TraineeCampaignProgressStatus')],
            },
            itemCount: {
              type: 'integer',
              minimum: 0,
              example: 4,
            },
            availableItemCount: {
              type: 'integer',
              minimum: 0,
              example: 3,
            },
            eligibility: schemaRef('CampaignEligibility'),
          },
        },
        GetPlatformCampaignsResponse: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: {
              ...arrayOf(schemaRef('PlatformCampaignSummary')),
            },
            pagination: schemaRef('PaginationMetadata'),
          },
        },
        TrainingDocument: {
          type: 'object',
          required: [
            'id',
            'title',
            'contentType',
            'contentRef',
            'content',
            'difficultyLevel',
            'status',
          ],
          properties: {
            id: {
              ...uuidString('33333333-3333-4333-8333-333333333333'),
            },
            title: {
              type: 'string',
              example: 'Identifying Phishing Emails',
            },
            contentType: {
              $ref: '#/components/schemas/TrainingContentType',
            },
            contentRef: {
              type: 'string',
              example: 'training/training-doc-1',
            },
            content: {
              type: 'string',
              nullable: true,
              example: '## Phishing warning signs\n- Verify sender domains\n- Avoid urgent threats',
            },
            contentSummary: {
              ...nullableString('Common phishing indicators and safe response steps.'),
            },
            estimatedReadTimeMinutes: {
              type: 'integer',
              nullable: true,
              minimum: 0,
              example: 8,
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            status: {
              $ref: '#/components/schemas/TrainingDocumentStatus',
            },
          },
        },
        TrainingCampaignItemContext: {
          type: 'object',
          required: ['title', 'position', 'isRequired', 'availabilityStatus'],
          properties: {
            title: {
              type: 'string',
              example: 'Phishing Basics',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Read the basics before the quiz.',
            },
            position: {
              type: 'integer',
              example: 1,
            },
            isRequired: {
              type: 'boolean',
              example: true,
            },
            availabilityStatus: {
              $ref: '#/components/schemas/TrainingCampaignItemAvailabilityStatus',
            },
          },
        },
        GetTrainingDocumentResponse: {
          type: 'object',
          required: ['campaignItemId', 'trainingDocument', 'campaignItem'],
          properties: {
            campaignItemId: {
              ...uuidString('11111111-1111-4111-8111-111111111111'),
            },
            campaignAssignmentId: {
              ...nullableUuidString('44444444-4444-4444-8444-444444444444'),
            },
            trainingDocument: {
              $ref: '#/components/schemas/TrainingDocument',
            },
            campaignItem: {
              $ref: '#/components/schemas/TrainingCampaignItemContext',
            },
          },
        },
        TrainingInteractionEvent: {
          type: 'object',
          required: ['id', 'eventType', 'occurredAt'],
          properties: {
            id: {
              type: 'string',
              example: 'event-1',
            },
            eventType: {
              $ref: '#/components/schemas/TrainingInteractionEventType',
            },
            occurredAt: {
              ...dateTimeString(),
            },
          },
        },
        RecordTrainingInteractionResponse: {
          type: 'object',
          required: ['success', 'campaignItemId', 'trainingDocumentId', 'event'],
          properties: {
            success: {
              ...trueSuccessProperty(),
            },
            campaignItemId: {
              ...uuidString('11111111-1111-4111-8111-111111111111'),
            },
            trainingDocumentId: {
              ...uuidString('33333333-3333-4333-8333-333333333333'),
            },
            event: {
              $ref: '#/components/schemas/TrainingInteractionEvent',
            },
          },
        },
        EmailClassification: enumString(['SAFE', 'SUSPICIOUS', 'PHISHING'], 'PHISHING'),
        EmailRedFlagType: enumString(
          ['SENDER', 'LINK', 'LANGUAGE', 'ATTACHMENT', 'REQUEST', 'DOMAIN', 'OTHER'],
          'LANGUAGE',
        ),
        RedFlagSeverity: enumString(['LOW', 'MEDIUM', 'HIGH'], 'MEDIUM'),
        SimulatedEmailInteractionEventType: enumString(
          [
            'SIMULATED_EMAIL_OPENED',
            'SIMULATED_EMAIL_LINK_CLICKED',
            'CREDENTIAL_SUBMISSION_ATTEMPTED',
          ],
          'SIMULATED_EMAIL_LINK_CLICKED',
        ),
        SimulatedInboxEmailSummary: {
          type: 'object',
          required: [
            'id',
            'inboxId',
            'senderLabel',
            'senderAddress',
            'subject',
            'receivedAt',
            'difficultyLevel',
            'isOpened',
          ],
          properties: {
            id: {
              ...uuidString('11111111-1111-1111-1111-111111111111'),
            },
            campaignAssignmentId: {
              ...nullableUuidString('44444444-4444-4444-4444-444444444444'),
            },
            campaignItemId: {
              ...nullableUuidString('22222222-2222-2222-2222-222222222222'),
            },
            inboxId: {
              type: 'string',
              example: 'inbox-1',
            },
            senderLabel: {
              type: 'string',
              example: 'Bank',
            },
            senderAddress: {
              type: 'string',
              format: 'email',
              example: 'bank@example.com',
            },
            subject: {
              type: 'string',
              example: 'Security Alert',
            },
            preview: {
              type: 'string',
              nullable: true,
              example: 'Please review this important security notice.',
            },
            receivedAt: {
              ...dateTimeString(),
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            isOpened: {
              type: 'boolean',
              description: 'Whether the current trainee has opened this simulated email.',
              example: false,
            },
          },
        },
        SimulatedInbox: {
          type: 'object',
          required: ['emails'],
          properties: {
            emails: {
              ...arrayOf(schemaRef('SimulatedInboxEmailSummary')),
            },
          },
        },
        SimulatedEmailDetail: {
          type: 'object',
          required: [
            'id',
            'inboxId',
            'senderLabel',
            'senderAddress',
            'subject',
            'bodyHtml',
            'hasAttachment',
            'receivedAt',
            'difficultyLevel',
          ],
          properties: {
            id: {
              ...uuidString('11111111-1111-1111-1111-111111111111'),
            },
            campaignAssignmentId: {
              ...nullableUuidString('44444444-4444-4444-4444-444444444444'),
            },
            campaignItemId: {
              ...nullableUuidString('22222222-2222-2222-2222-222222222222'),
            },
            inboxId: {
              type: 'string',
              example: 'inbox-1',
            },
            senderLabel: {
              type: 'string',
              example: 'Bank',
            },
            senderAddress: {
              type: 'string',
              format: 'email',
              example: 'bank@example.com',
            },
            subject: {
              type: 'string',
              example: 'Security Alert',
            },
            preview: {
              type: 'string',
              nullable: true,
              example: 'Please review this important security notice.',
            },
            bodyHtml: {
              type: 'string',
              example: '<p>Hello</p>',
            },
            simulatedLinkTarget: {
              type: 'string',
              nullable: true,
              example: '/simulations/credential-warning',
            },
            hasAttachment: {
              type: 'boolean',
              example: false,
            },
            receivedAt: {
              ...dateTimeString(),
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
          },
        },
        RecordSimulatedEmailInteractionRequest: {
          type: 'object',
          required: ['eventType'],
          additionalProperties: false,
          properties: {
            eventType: {
              $ref: '#/components/schemas/SimulatedEmailInteractionEventType',
            },
          },
        },
        RecordSimulatedEmailInteractionResponse: {
          type: 'object',
          required: ['success', 'eventType'],
          properties: {
            success: {
              ...trueSuccessProperty(),
            },
            eventType: {
              $ref: '#/components/schemas/SimulatedEmailInteractionEventType',
            },
          },
        },
        ClassifySimulatedEmailRequest: {
          type: 'object',
          required: ['selectedClassification'],
          additionalProperties: false,
          properties: {
            selectedClassification: {
              $ref: '#/components/schemas/EmailClassification',
            },
            selectedRedFlagIds: {
              ...uuidArray(['33333333-3333-3333-3333-333333333333']),
            },
            freeTextReason: {
              type: 'string',
              maxLength: 1000,
              example: 'The message uses urgent language and asks me to click a suspicious link.',
            },
          },
        },
        EmailRedFlag: {
          type: 'object',
          required: ['id', 'redFlagType', 'label', 'severity'],
          properties: {
            id: {
              ...uuidString('33333333-3333-3333-3333-333333333333'),
            },
            redFlagType: {
              $ref: '#/components/schemas/EmailRedFlagType',
            },
            label: {
              type: 'string',
              example: 'Urgent language',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'The email pressures the trainee to act quickly.',
            },
            severity: {
              $ref: '#/components/schemas/RedFlagSeverity',
            },
          },
        },
        ClassifySimulatedEmailResponse: {
          type: 'object',
          required: ['success', 'responseId', 'selectedClassification', 'isCorrect'],
          properties: {
            success: {
              ...trueSuccessProperty(),
            },
            responseId: {
              type: 'string',
              example: 'resp-123',
            },
            selectedClassification: {
              $ref: '#/components/schemas/EmailClassification',
            },
            isCorrect: {
              type: 'boolean',
              example: true,
            },
            feedback: {
              type: 'string',
              nullable: true,
              example: 'Great job! You correctly identified the email.',
            },
            redFlags: {
              ...arrayOf(schemaRef('EmailRedFlag')),
            },
          },
        },
        QuestionType: enumString(['SINGLE_CHOICE', 'MULTIPLE_CHOICE'], 'SINGLE_CHOICE'),
        QuizAttemptStatus: enumString(['IN_PROGRESS', 'SUBMITTED'], 'IN_PROGRESS'),
        QuizStatus: enumString(['DRAFT', 'PUBLISHED', 'ARCHIVED'], 'PUBLISHED'),
        QuizCampaignItemContext: {
          type: 'object',
          properties: {
            campaignItemId: {
              ...nullableUuidString('11111111-1111-1111-1111-111111111111'),
            },
            campaignAssignmentId: {
              ...nullableUuidString('44444444-4444-4444-4444-444444444444'),
            },
          },
        },
        QuizOptionForTrainee: {
          type: 'object',
          required: ['id', 'label', 'text', 'position'],
          properties: {
            id: {
              ...uuidString('44444444-4444-4444-4444-444444444444'),
            },
            label: {
              type: 'string',
              example: 'A',
            },
            text: {
              type: 'string',
              example: 'Check the sender address',
            },
            position: {
              type: 'integer',
              example: 1,
            },
          },
        },
        QuizQuestionForTrainee: {
          type: 'object',
          required: ['id', 'prompt', 'questionType', 'position', 'points', 'options'],
          properties: {
            id: {
              ...uuidString('33333333-3333-3333-3333-333333333333'),
            },
            prompt: {
              type: 'string',
              example: 'What is the best way to verify an email sender?',
            },
            questionType: {
              $ref: '#/components/schemas/QuestionType',
            },
            position: {
              type: 'integer',
              example: 1,
            },
            points: {
              type: 'integer',
              example: 5,
            },
            options: {
              ...arrayOf(schemaRef('QuizOptionForTrainee')),
            },
          },
        },
        GetQuizResponse: {
          type: 'object',
          required: [
            'id',
            'title',
            'passThresholdPercentage',
            'difficultyLevel',
            'status',
            'questions',
          ],
          properties: {
            id: {
              type: 'string',
              example: 'quiz-1',
            },
            campaignItemId: {
              ...nullableUuidString('11111111-1111-1111-1111-111111111111'),
            },
            campaignAssignmentId: {
              type: 'string',
              nullable: true,
              example: 'assign-1',
            },
            title: {
              type: 'string',
              example: 'Phishing Check',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Check your phishing awareness.',
            },
            passThresholdPercentage: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 70,
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
            },
            status: {
              $ref: '#/components/schemas/QuizStatus',
            },
            questions: {
              ...arrayOf(schemaRef('QuizQuestionForTrainee')),
            },
          },
        },
        QuizAttempt: {
          type: 'object',
          required: ['attemptId', 'traineeProfileId', 'quizId', 'status', 'startedAt'],
          properties: {
            attemptId: {
              ...uuidString('22222222-2222-2222-2222-222222222222'),
            },
            traineeProfileId: {
              type: 'string',
              example: 'trainee-profile-id',
            },
            quizId: {
              type: 'string',
              example: 'quiz-1',
            },
            campaignAssignmentId: {
              type: 'string',
              nullable: true,
              example: 'assign-1',
            },
            campaignItemId: {
              ...nullableUuidString('11111111-1111-1111-1111-111111111111'),
            },
            status: {
              type: 'string',
              enum: ['IN_PROGRESS'],
              example: 'IN_PROGRESS',
            },
            startedAt: {
              ...dateTimeString(),
            },
          },
        },
        StartQuizAttemptResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/QuizAttempt',
            },
          ],
        },
        AttemptAnswer: {
          type: 'object',
          required: ['questionId', 'selectedOptionIds'],
          additionalProperties: false,
          properties: {
            questionId: {
              ...uuidString('33333333-3333-3333-3333-333333333333'),
            },
            selectedOptionIds: {
              ...uuidArray(['44444444-4444-4444-4444-444444444444']),
              minItems: 1,
            },
            responseSummary: {
              type: 'string',
              maxLength: 1000,
              example: 'Selected the sender verification answer.',
            },
            typedResponse: {
              type: 'string',
              maxLength: 4000,
              example: 'I would inspect the sender domain before clicking links.',
            },
          },
        },
        SubmitQuizAttemptRequest: {
          type: 'object',
          required: ['answers'],
          additionalProperties: false,
          properties: {
            answers: {
              ...arrayOf(schemaRef('AttemptAnswer')),
              minItems: 1,
            },
          },
        },
        SubmitQuizAttemptResponse: {
          type: 'object',
          required: ['success', 'attemptId', 'status'],
          properties: {
            success: {
              ...trueSuccessProperty(),
            },
            attemptId: {
              ...uuidString('22222222-2222-2222-2222-222222222222'),
            },
            status: {
              type: 'string',
              enum: ['SUBMITTED'],
              example: 'SUBMITTED',
            },
          },
        },
        QuizResultOption: {
          type: 'object',
          required: ['optionId', 'label', 'text', 'isCorrect'],
          properties: {
            optionId: {
              ...uuidString('44444444-4444-4444-4444-444444444444'),
            },
            label: {
              type: 'string',
              example: 'A',
            },
            text: {
              type: 'string',
              example: 'Check the sender address',
            },
            isCorrect: {
              type: 'boolean',
              example: true,
            },
            feedbackText: {
              type: 'string',
              nullable: true,
              example: 'Checking the exact sender address helps detect spoofing.',
            },
          },
        },
        QuizResultQuestion: {
          type: 'object',
          required: ['questionId', 'selectedOptions'],
          properties: {
            questionId: {
              ...uuidString('33333333-3333-3333-3333-333333333333'),
            },
            isCorrect: {
              type: 'boolean',
              nullable: true,
              example: true,
            },
            awardedPoints: {
              type: 'number',
              nullable: true,
              example: 5,
            },
            feedbackShown: {
              type: 'string',
              nullable: true,
              example: 'Correct!',
            },
            selectedOptions: {
              ...arrayOf(schemaRef('QuizResultOption')),
            },
          },
        },
        GetQuizResultResponse: {
          type: 'object',
          required: ['attemptId', 'quizId', 'scorePercentage', 'passed', 'answers'],
          properties: {
            attemptId: {
              ...uuidString('22222222-2222-2222-2222-222222222222'),
            },
            quizId: {
              type: 'string',
              example: 'quiz-1',
            },
            campaignAssignmentId: {
              type: 'string',
              nullable: true,
              example: 'assign-1',
            },
            campaignItemId: {
              ...nullableUuidString('11111111-1111-1111-1111-111111111111'),
            },
            scorePercentage: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 100,
            },
            passed: {
              type: 'boolean',
              example: true,
            },
            summary: {
              type: 'string',
              nullable: true,
              example: 'Well done',
            },
            answers: {
              ...arrayOf(schemaRef('QuizResultQuestion')),
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          required: ['page', 'limit', 'total', 'totalPages'],
          additionalProperties: false,
          properties: {
            page: { type: 'integer', minimum: 1, example: 1 },
            limit: { type: 'integer', minimum: 1, example: 20 },
            total: { type: 'integer', minimum: 0, example: 45 },
            totalPages: { type: 'integer', minimum: 0, example: 3 },
          },
        },
        AssignableCampaignOption: {
          type: 'object',
          required: [
            'campaignId',
            'name',
            'description',
            'status',
            'type',
            'itemCount',
            'startDate',
            'endDate',
            'assignmentCount',
          ],
          additionalProperties: false,
          properties: {
            campaignId: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            name: { type: 'string', example: 'Q3 Phishing Awareness' },
            description: nullableString('Quarterly phishing simulation and training'),
            status: enumString(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'], 'ACTIVE'),
            type: enumString(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM'], 'ORGANISATION_CUSTOM'),
            itemCount: { type: 'integer', minimum: 0, example: 3 },
            startDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2026-09-01T00:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2026-09-30T23:59:59.000Z',
            },
            assignmentCount: { type: 'integer', minimum: 0, example: 12 },
          },
        },
        GetAssignableCampaignsResponse: {
          type: 'object',
          required: ['items', 'pagination'],
          additionalProperties: false,
          properties: {
            items: {
              type: 'array',
              items: schemaRef('AssignableCampaignOption'),
            },
            pagination: schemaRef('PaginationMeta'),
          },
        },
        CampaignAssignmentCandidateOption: {
          type: 'object',
          required: [
            'traineeProfileId',
            'organisationTraineeProfileId',
            'userId',
            'displayName',
            'email',
            'active',
          ],
          additionalProperties: false,
          properties: {
            traineeProfileId: uuidString('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'),
            organisationTraineeProfileId: uuidString('b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7'),
            userId: uuidString('c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8'),
            displayName: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
            active: { type: 'boolean', enum: [true], example: true },
          },
        },
        GetCampaignAssignmentCandidatesResponse: {
          type: 'object',
          required: ['items', 'pagination'],
          additionalProperties: false,
          properties: {
            items: {
              type: 'array',
              items: schemaRef('CampaignAssignmentCandidateOption'),
            },
            pagination: schemaRef('PaginationMeta'),
          },
        },
        CreateCampaignAssignmentsRequest: {
          type: 'object',
          required: ['campaignIds', 'traineeProfileIds'],
          additionalProperties: false,
          properties: {
            campaignIds: {
              ...uuidArray(['9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d']),
              minItems: 1,
              maxItems: 100,
            },
            traineeProfileIds: {
              ...uuidArray(['a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6']),
              minItems: 1,
              maxItems: 100,
            },
          },
        },
        CampaignAssignmentResultRow: {
          type: 'object',
          required: ['assignmentId', 'campaignId', 'traineeProfileId'],
          additionalProperties: false,
          properties: {
            assignmentId: uuidString('55555555-5555-4555-8555-555555555555'),
            campaignId: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            traineeProfileId: uuidString('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'),
          },
        },
        CampaignAssignmentSummary: {
          type: 'object',
          required: [
            'requestedCampaigns',
            'requestedTrainees',
            'requestedPairs',
            'createdCount',
            'alreadyAssignedCount',
          ],
          additionalProperties: false,
          properties: {
            requestedCampaigns: { type: 'integer', minimum: 0, example: 1 },
            requestedTrainees: { type: 'integer', minimum: 0, example: 2 },
            requestedPairs: { type: 'integer', minimum: 0, example: 2 },
            createdCount: { type: 'integer', minimum: 0, example: 2 },
            alreadyAssignedCount: { type: 'integer', minimum: 0, example: 0 },
          },
        },
        CreateCampaignAssignmentsResponse: {
          type: 'object',
          required: ['created', 'alreadyAssigned', 'summary'],
          additionalProperties: false,
          properties: {
            created: arrayOf(schemaRef('CampaignAssignmentResultRow')),
            alreadyAssigned: arrayOf(schemaRef('CampaignAssignmentResultRow')),
            summary: schemaRef('CampaignAssignmentSummary'),
          },
        },
        CampaignAssignmentReadRow: {
          type: 'object',
          required: [
            'assignmentId',
            'campaignId',
            'campaignName',
            'campaignStatus',
            'campaignType',
            'traineeProfileId',
            'displayName',
            'email',
            'traineeStatus',
            'assignmentStatus',
            'accessType',
            'assignedAt',
            'startedAt',
            'completedAt',
          ],
          additionalProperties: false,
          properties: {
            assignmentId: uuidString('55555555-5555-4555-8555-555555555555'),
            campaignId: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            campaignName: { type: 'string', example: 'Checkers Sixty60 Phishing Awareness' },
            campaignStatus: enumString(
              ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
              'ACTIVE',
            ),
            campaignType: enumString(
              ['PREMADE_GENERAL', 'ORGANISATION_CUSTOM'],
              'ORGANISATION_CUSTOM',
            ),
            traineeProfileId: uuidString('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'),
            displayName: { type: 'string', example: 'Sipho Ndlovu' },
            email: {
              type: 'string',
              format: 'email',
              example: 'sipho.ndlovu@rustenburg-cyber.co.za',
            },
            traineeStatus: enumString(['ACTIVE', 'INACTIVE'], 'ACTIVE'),
            assignmentStatus: enumString(
              ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
              'ASSIGNED',
            ),
            accessType: enumString(['ASSIGNED', 'SELF_SELECTED'], 'ASSIGNED'),
            assignedAt: dateTimeString('2026-08-07T12:00:00.000Z'),
            startedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
            completedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
          },
        },
        GetCampaignAssignmentsResponse: {
          type: 'object',
          required: ['items', 'pagination'],
          additionalProperties: false,
          properties: {
            items: arrayOf(schemaRef('CampaignAssignmentReadRow')),
            pagination: schemaRef('PaginationMeta'),
          },
        },
        DeletedProgressCounts: {
          type: 'object',
          required: ['quizAttempts', 'emailClassificationResponses', 'interactionEvents'],
          additionalProperties: false,
          properties: {
            quizAttempts: { type: 'integer', minimum: 0, example: 1 },
            emailClassificationResponses: { type: 'integer', minimum: 0, example: 2 },
            interactionEvents: { type: 'integer', minimum: 0, example: 5 },
          },
        },
        DeleteCampaignAssignmentResponse: {
          type: 'object',
          required: [
            'assignmentId',
            'campaignId',
            'traineeProfileId',
            'unassigned',
            'deletedProgress',
          ],
          additionalProperties: false,
          properties: {
            assignmentId: uuidString('55555555-5555-4555-8555-555555555555'),
            campaignId: uuidString('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
            traineeProfileId: uuidString('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'),
            unassigned: trueSuccessProperty(),
            deletedProgress: schemaRef('DeletedProgressCounts'),
          },
        },
      },

      parameters: {
        CampaignIdPathParam: {
          name: 'campaignId',
          in: 'path',
          required: true,
          description: 'Campaign identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '44444444-4444-4444-8444-444444444444',
        },
        CampaignItemIdPathParam: {
          name: 'campaignItemId',
          in: 'path',
          required: true,
          description: 'Campaign item identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '11111111-1111-4111-8111-111111111111',
        },
        EmailIdPathParam: {
          name: 'emailId',
          in: 'path',
          required: true,
          description: 'Simulated email identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '11111111-1111-1111-1111-111111111111',
        },
        AttemptIdPathParam: {
          name: 'attemptId',
          in: 'path',
          required: true,
          description: 'Quiz attempt identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '22222222-2222-2222-2222-222222222222',
        },
        OrganisationIdPathParam: {
          name: 'organisationId',
          in: 'path',
          required: true,
          description: 'Organisation identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '11111111-1111-4111-8111-111111111111',
        },
        OrganisationAdminIdPathParam: {
          name: 'adminId',
          in: 'path',
          required: true,
          description: 'Organisation admin profile identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '22222222-2222-4222-8222-222222222222',
        },
        TraineeIdPathParam: {
          name: 'traineeId',
          in: 'path',
          required: true,
          description: 'Organisation trainee profile identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '55555555-5555-4555-8555-555555555555',
        },
        InvitationIdPathParam: {
          name: 'invitationId',
          in: 'path',
          required: true,
          description: 'Invitation identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '33333333-3333-4333-8333-333333333333',
        },
        SetupTokenPathParam: {
          name: 'token',
          in: 'path',
          required: true,
          description: 'Opaque setup/action token from the setup link.',
          schema: {
            type: 'string',
            minLength: 32,
            maxLength: 512,
            pattern: '^[A-Za-z0-9_-]+$',
          },
          example: 'exampleSetupTokenValueWithAtLeast32Chars',
        },
        InvitationTokenPathParam: {
          name: 'token',
          in: 'path',
          required: true,
          description:
            'Opaque invitation token or action token identifier from the invitation link.',
          schema: {
            type: 'string',
            minLength: 32,
            maxLength: 512,
            pattern: '^[A-Za-z0-9_-]+$',
          },
          example: 'exampleInvitationTokenValueWithAtLeast32Chars',
        },
        AccountSessionIdPathParam: {
          name: 'sessionId',
          in: 'path',
          required: true,
          description: 'Authenticated account session identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          example: '11111111-1111-4111-8111-111111111111',
        },
      },
      requestBodies: {
        AuthRegister: {
          required: true,
          ...jsonContent(schemaRef('AuthRegisterRequest')),
        },
        AuthLogin: {
          required: true,
          ...jsonContent(schemaRef('AuthLoginRequest')),
        },
        AuthVerifyEmail: {
          required: true,
          ...jsonContent(schemaRef('AuthVerifyEmailRequest')),
        },
        AccountVerifyEmailChange: {
          required: true,
          ...jsonContent(schemaRef('AccountVerifyEmailChangeRequest')),
        },
        AccountProfileUpdate: {
          required: true,
          ...jsonContent(schemaRef('AccountProfileUpdateRequest')),
        },
        AccountChangeEmail: {
          required: true,
          ...jsonContent(schemaRef('AccountChangeEmailRequest')),
        },
        AccountChangePassword: {
          required: true,
          ...jsonContent(schemaRef('AccountChangePasswordRequest')),
        },
        AccountSecurityPreferences: {
          required: true,
          ...jsonContent(schemaRef('AccountSecurityPreferencesRequest')),
        },
        AuthForgotPassword: {
          required: true,
          ...jsonContent(schemaRef('AuthForgotPasswordRequest')),
        },
        AuthResetPassword: {
          required: true,
          ...jsonContent(schemaRef('AuthResetPasswordRequest')),
        },
        EmptyJson: {
          required: false,
          ...jsonContent(schemaRef('EmptyRequestBody')),
        },
        RecordSimulatedEmailInteraction: {
          required: true,
          ...jsonContent(schemaRef('RecordSimulatedEmailInteractionRequest')),
        },
        ClassifySimulatedEmail: {
          required: true,
          ...jsonContent(schemaRef('ClassifySimulatedEmailRequest')),
        },
        SubmitQuizAttempt: {
          required: true,
          ...jsonContent(schemaRef('SubmitQuizAttemptRequest')),
        },
        SetupComplete: {
          required: true,
          ...jsonContent(schemaRef('SetupCompleteRequest')),
        },
        CreateOrganisationRegistrationRequest: {
          required: true,
          ...jsonContent(schemaRef('CreateOrganisationRegistrationRequest')),
        },
        OrganisationAdminPromotion: {
          required: true,
          ...jsonContent(schemaRef('OrganisationAdminPromotionRequest')),
        },
        OrganisationAdminPermissionUpdate: {
          required: true,
          ...jsonContent(schemaRef('OrganisationAdminPermissionUpdateRequest')),
        },
        OrganisationAdminRemove: {
          required: true,
          ...jsonContent(schemaRef('OrganisationAdminRemoveRequest')),
        },
        ApproveOrganisationRequest: {
          required: true,
          ...jsonContent(schemaRef('ApproveOrganisationRequest')),
        },
        RejectOrganisationRequest: {
          required: true,
          ...jsonContent(schemaRef('RejectOrganisationRequest')),
        },
        OrganisationSecuritySettingsUpdate: {
          required: true,
          ...jsonContent(schemaRef('OrganisationSecuritySettingsUpdateRequest')),
        },
        InvitationAccept: {
          required: true,
          ...jsonContent(schemaRef('InvitationAcceptRequest')),
        },
        InvitationReject: {
          required: true,
          ...jsonContent(schemaRef('InvitationRejectRequest')),
        },
        CreateTraineeInvitation: {
          required: true,
          ...jsonContent(schemaRef('CreateTraineeInvitationRequest')),
        },
        DisableTrainee: {
          required: true,
          ...jsonContent(schemaRef('DisableTraineeRequest')),
        },
        CreateCampaignAssignments: {
          required: true,
          ...jsonContent(schemaRef('CreateCampaignAssignmentsRequest')),
        },
        InvitePlatformAdmin: {
          required: true,
          ...jsonContent(schemaRef('InvitePlatformAdminRequest')),
        },
        TransferSuperAdmin: {
          required: true,
          ...jsonContent(schemaRef('TransferSuperAdminRequest')),
        },
        DemotePlatformAdmin: {
          required: true,
          ...jsonContent(schemaRef('DemotePlatformAdminRequest')),
        },
      },
      responses: {
        GetAssignableCampaignsOk: responseComponent(
          'Paginated list of assignable custom campaigns.',
          'GetAssignableCampaignsResponse',
        ),
        GetCampaignAssignmentCandidatesOk: responseComponent(
          'Paginated list of eligible trainee assignment candidates.',
          'GetCampaignAssignmentCandidatesResponse',
        ),
        CreateCampaignAssignmentsOk: responseComponent(
          'Bulk campaign assignments created or returned as existing.',
          'CreateCampaignAssignmentsResponse',
        ),
        GetCampaignAssignmentsOk: responseComponent(
          'Paginated list of campaign assignments.',
          'GetCampaignAssignmentsResponse',
        ),
        DeleteCampaignAssignmentOk: responseComponent(
          'Campaign assignment and all associated trainee progress permanently removed.',
          'DeleteCampaignAssignmentResponse',
        ),

        HealthOk: responseComponent('API and database are reachable.', 'HealthStatus'),
        HealthDatabaseUnavailable: responseComponent(
          'API is reachable, but the database check failed.',
          'HealthStatus',
        ),
        AuthRegisterCreated: responseComponent(
          'Account registered successfully.',
          'AuthRegisterResponse',
        ),
        AuthLoginOk: {
          description:
            'Login successful. Returns access token, user context, and sets httpOnly refresh token cookie.',
          headers: {
            'Set-Cookie': {
              schema: {
                type: 'string',
                example: 'refreshToken=abcde12345; Path=/; HttpOnly; Secure; SameSite=Lax',
              },
              description: 'Contains the rotating refresh token in an HTTP-only cookie.',
            },
          },
          ...jsonContent(schemaRef('AuthLoginResponse')),
        },
        AuthMeOk: responseComponent('Current authenticated user.', 'AuthMeResponse'),
        AuthEmailExists: responseComponent(
          'A user with the provided email already exists.',
          'AuthEmailExistsErrorResponse',
        ),
        AuthRateLimited: responseComponent(
          'Too many authentication requests.',
          'AuthRateLimitErrorResponse',
        ),
        AccountOk: responseComponent('Current account settings.', 'AccountResponse'),
        AccountChangeEmailRequested: responseComponent(
          'Email change request accepted for processing.',
          'AccountChangeEmailResponse',
        ),
        AccountPasswordChanged: responseComponent(
          'Password changed successfully.',
          'AccountChangePasswordResponse',
        ),
        AccountSessionsOk: responseComponent('Active account sessions.', 'AccountSessionsResponse'),
        AccountSessionRevoked: responseComponent(
          'Account session revoked.',
          'AccountSessionRevocationResponse',
        ),
        AccountOtherSessionsLoggedOut: responseComponent(
          'Other account sessions logged out.',
          'AccountLogoutOthersResponse',
        ),
        SetupTokenContextOk: responseComponent(
          'Safe setup-token context. The token is not consumed.',
          'SetupTokenContextResponse',
        ),
        SetupCompleteCreated: responseComponent(
          'Setup completed successfully.',
          'SetupCompleteResponse',
        ),
        InvitationContextOk: responseComponent(
          'Safe invitation token context. The token is not consumed.',
          'InvitationContextResponse',
        ),
        InvitationAcceptOk: responseComponent(
          'Invitation accepted successfully.',
          'InvitationAcceptResponse',
        ),
        InvitationRejectOk: responseComponent(
          'Invitation rejected successfully.',
          'InvitationRejectResponse',
        ),
        OrganisationTraineesOk: responseComponent(
          'Organisation trainees and pending invitations.',
          'TraineeListResponse',
        ),
        OrganisationTraineeInvitationCreated: responseComponent(
          'Trainee invitation email queued for delivery.',
          'CreateTraineeInvitationResponse',
        ),
        OrganisationTraineeInvitationResent: responseComponent(
          'Trainee invitation email queued for delivery.',
          'InvitationResendResponse',
        ),
        OrganisationTraineeInvitationRevoked: responseComponent(
          'Trainee invitation revoked successfully.',
          'InvitationRevokeResponse',
        ),
        OrganisationTraineeDisabled: responseComponent(
          'Trainee account disabled successfully.',
          'DisableTraineeResponse',
        ),
        OrganisationRegistrationRequestCreated: responseComponent(
          'Organisation registration request submitted for review.',
          'OrganisationRegistrationRequestCreatedResponse',
        ),
        OrganisationRegistrationRequestConflict: responseComponent(
          'The submitted request conflicts with existing records.',
          'OrganisationRegistrationRequestConflictErrorResponse',
        ),
        TraineeInvitationConflict: responseComponent(
          'Cannot invite user to the organisation.',
          'TraineeInvitationConflictErrorResponse',
        ),
        OrganisationAdminsOk: responseComponent(
          'Organisation admins and available permissions.',
          'OrganisationAdminListResponse',
        ),
        OrganisationAdminPromotionCreated: responseComponent(
          'Organisation admin promotion invitation created.',
          'OrganisationAdminPromotionResponse',
        ),
        OrganisationAdminPermissionsUpdated: responseComponent(
          'Organisation admin permissions updated.',
          'OrganisationAdminPermissionUpdateResponse',
        ),
        OrganisationAdminRemoved: responseComponent(
          'Organisation admin privileges removed.',
          'OrganisationAdminRemoveResponse',
        ),
        OrganisationSecuritySettingsOk: responseComponent(
          'Organisation security settings and effective policy.',
          'OrganisationSecuritySettingsResponse',
        ),
        OrganisationSecuritySettingsUpdated: responseComponent(
          'Organisation security settings updated.',
          'OrganisationSecuritySettingsResponse',
        ),
        TraineeCampaignsOk: responseComponent(
          'Campaigns accessible to the authenticated active trainee.',
          'GetTraineeCampaignsResponse',
        ),
        TraineeCampaignDetailOk: responseComponent(
          'Campaign detail with ordered trainee-safe item tree.',
          'GetTraineeCampaignDetailResponse',
        ),
        GetPlatformCampaignsOk: responseComponent(
          'Paginated list of active platform campaigns discoverable by the authenticated active general trainee.',
          'GetPlatformCampaignsResponse',
        ),
        EnrolPlatformCampaignOk: responseComponent(
          'Platform campaign self-enrolment created or existing assignment returned idempotently.',
          'TraineeCampaignSummary',
        ),
        PlatformAdminsListOk: responseComponent(
          'List of platform administrators with capability flags and row actions.',
          'PlatformAdminsListResponse',
        ),
        InvitePlatformAdminCreated: responseComponent(
          'Platform administrator invitation or upgrade request created successfully.',
          'InvitePlatformAdminResponse',
        ),
        ResendPlatformAdminInviteOk: responseComponent(
          'Platform administrator invitation resend attempt completed, with emailQueued indicating queue status.',
          'ResendPlatformAdminInviteResponse',
        ),
        TransferSuperAdminOk: responseComponent(
          'Super administrator role transferred. Returns updated actor user profile.',
          'AuthMeResponse',
        ),
        DemotePlatformAdminOk: responseComponent(
          'Platform administrator demoted to disabled status and sessions revoked.',
          'DemotePlatformAdminResponse',
        ),
        TraineeCampaignNotFound: responseComponent(
          'Campaign is missing, inactive, or not accessible to the trainee.',
          'ApiErrorResponse',
        ),
        SimulatedInboxOk: responseComponent(
          'Simulated inbox email summaries for the campaign item.',
          'SimulatedInbox',
        ),
        SimulatedEmailDetailOk: responseComponent(
          'Simulated email details safe for pre-classification display.',
          'SimulatedEmailDetail',
        ),
        SimulatedEmailInteractionOk: responseComponent(
          'Simulated email interaction recorded.',
          'RecordSimulatedEmailInteractionResponse',
        ),
        SimulatedEmailClassificationOk: responseComponent(
          'Simulated email classification recorded with feedback.',
          'ClassifySimulatedEmailResponse',
        ),
        SimulationNotFound: responseComponent(
          'Simulated inbox or email is missing, unavailable, or not accessible through this campaign item.',
          'ApiErrorResponse',
        ),
        SimulatedEmailAlreadyClassified: responseComponent(
          'The simulated email has already been classified by this trainee.',
          'ApiErrorResponse',
        ),
        TrainingDocumentOk: responseComponent(
          'Training document resolved for the campaign item.',
          'GetTrainingDocumentResponse',
        ),
        TrainingViewedCreated: responseComponent(
          'Training view interaction recorded.',
          'RecordTrainingInteractionResponse',
        ),
        TrainingCompletedCreated: responseComponent(
          'Training completion interaction recorded.',
          'RecordTrainingInteractionResponse',
        ),
        TrainingDocumentNotFound: responseComponent(
          'Training document is missing, unavailable, or not accessible to the trainee.',
          'TrainingDocumentNotFoundErrorResponse',
        ),
        TrainingContentUnavailable: responseComponent(
          'Training document content could not be loaded.',
          'TrainingContentUnavailableErrorResponse',
        ),
        TrainingRateLimited: responseComponent(
          'Too many trainee training requests.',
          'TrainingRateLimitErrorResponse',
        ),
        QuizOk: responseComponent(
          'Quiz content safe for trainee pre-submission display.',
          'GetQuizResponse',
        ),
        QuizAttemptCreated: responseComponent(
          'Quiz attempt is ready for answers.',
          'StartQuizAttemptResponse',
        ),
        QuizAttemptSubmitted: responseComponent(
          'Quiz attempt submitted successfully.',
          'SubmitQuizAttemptResponse',
        ),
        QuizResultOk: responseComponent(
          'Quiz result and answer feedback for a submitted attempt.',
          'GetQuizResultResponse',
        ),
        QuizNotFound: responseComponent(
          'Quiz, quiz attempt, or associated campaign item was not found.',
          'ApiErrorResponse',
        ),
        QuizAttemptAlreadySubmitted: responseComponent(
          'Quiz attempt has already been submitted.',
          'ApiErrorResponse',
        ),
        QuizResultUnavailable: responseComponent(
          'Results are not available until the attempt is submitted, or the user cannot access the attempt.',
          'ApiErrorResponse',
        ),
        BadRequest: responseComponent(
          'The request payload or parameters are invalid.',
          'ValidationErrorResponse',
        ),
        UnprocessableEntity: responseComponent(
          'The request payload is syntactically valid JSON but fails validation.',
          'ValidationErrorResponse',
        ),
        Unauthorized: responseComponent(
          'Authentication credentials are missing or invalid.',
          'ApiErrorResponse',
        ),
        Forbidden: responseComponent(
          'The authenticated user is not allowed to perform this action.',
          'ApiErrorResponse',
        ),
        NotFound: responseComponent('The requested resource was not found.', 'ApiErrorResponse'),
        Conflict: responseComponent(
          'The request conflicts with an existing resource or state.',
          'ApiErrorResponse',
        ),
        TooManyRequests: responseComponent(
          'The client has exceeded the configured rate limit.',
          'RateLimitErrorResponse',
        ),
        InternalServerError: responseComponent(
          'An unexpected server error occurred.',
          'ApiErrorResponse',
        ),
      },
    },
  },
  apis: ['./src/app.ts', './src/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
