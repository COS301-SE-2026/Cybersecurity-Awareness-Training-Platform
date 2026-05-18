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
      {
        name: 'Trainee Quiz',
        description: 'Trainee quiz retrieval, attempts, submissions, and results.',
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
        AuthEmailExistsErrorResponse: errorResponseSchema(
          'ApiErrorResponse',
          'AUTH_EMAIL_EXISTS',
          'A user with the provided email already exists',
        ),
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
        AuthStatus: enumString(['PENDING', 'ACTIVE', 'DISABLED'], 'ACTIVE'),
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
        TrainingDocument: {
          type: 'object',
          required: ['id', 'title', 'contentType', 'contentRef', 'difficultyLevel', 'status'],
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
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-4111-8111-111111111111',
            },
            trainingDocumentId: {
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-4333-8333-333333333333',
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
          ],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-1111-1111-111111111111',
            },
            campaignAssignmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '44444444-4444-4444-4444-444444444444',
            },
            campaignItemId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '22222222-2222-2222-2222-222222222222',
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
              type: 'string',
              format: 'date-time',
              example: '2026-05-16T09:00:00.000Z',
            },
            difficultyLevel: {
              $ref: '#/components/schemas/DifficultyLevel',
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
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-1111-1111-111111111111',
            },
            campaignAssignmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '44444444-4444-4444-4444-444444444444',
            },
            campaignItemId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '22222222-2222-2222-2222-222222222222',
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
              type: 'string',
              format: 'date-time',
              example: '2026-05-16T09:00:00.000Z',
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
              type: 'boolean',
              enum: [true],
              example: true,
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
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
              },
              example: ['33333333-3333-3333-3333-333333333333'],
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
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-3333-3333-333333333333',
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
              type: 'boolean',
              enum: [true],
              example: true,
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
              type: 'array',
              items: {
                $ref: '#/components/schemas/EmailRedFlag',
              },
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
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '11111111-1111-1111-1111-111111111111',
            },
            campaignAssignmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '44444444-4444-4444-4444-444444444444',
            },
          },
        },
        QuizOptionForTrainee: {
          type: 'object',
          required: ['id', 'label', 'text', 'position'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '44444444-4444-4444-4444-444444444444',
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
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-3333-3333-333333333333',
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
              type: 'array',
              items: {
                $ref: '#/components/schemas/QuizOptionForTrainee',
              },
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
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '11111111-1111-1111-1111-111111111111',
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
              type: 'array',
              items: {
                $ref: '#/components/schemas/QuizQuestionForTrainee',
              },
            },
          },
        },
        QuizAttempt: {
          type: 'object',
          required: ['attemptId', 'traineeProfileId', 'quizId', 'status', 'startedAt'],
          properties: {
            attemptId: {
              type: 'string',
              format: 'uuid',
              example: '22222222-2222-2222-2222-222222222222',
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
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '11111111-1111-1111-1111-111111111111',
            },
            status: {
              type: 'string',
              enum: ['IN_PROGRESS'],
              example: 'IN_PROGRESS',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-05-16T09:00:00.000Z',
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
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-3333-3333-333333333333',
            },
            selectedOptionIds: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'string',
                format: 'uuid',
              },
              example: ['44444444-4444-4444-4444-444444444444'],
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
              type: 'array',
              minItems: 1,
              items: {
                $ref: '#/components/schemas/AttemptAnswer',
              },
            },
          },
        },
        SubmitQuizAttemptResponse: {
          type: 'object',
          required: ['success', 'attemptId', 'status'],
          properties: {
            success: {
              type: 'boolean',
              enum: [true],
              example: true,
            },
            attemptId: {
              type: 'string',
              format: 'uuid',
              example: '22222222-2222-2222-2222-222222222222',
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
              type: 'string',
              format: 'uuid',
              example: '44444444-4444-4444-4444-444444444444',
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
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-3333-3333-333333333333',
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
              type: 'array',
              items: {
                $ref: '#/components/schemas/QuizResultOption',
              },
            },
          },
        },
        GetQuizResultResponse: {
          type: 'object',
          required: ['attemptId', 'quizId', 'scorePercentage', 'passed', 'answers'],
          properties: {
            attemptId: {
              type: 'string',
              format: 'uuid',
              example: '22222222-2222-2222-2222-222222222222',
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
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '11111111-1111-1111-1111-111111111111',
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
              type: 'array',
              items: {
                $ref: '#/components/schemas/QuizResultQuestion',
              },
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
      },
      responses: {
        BadRequest: responseComponent(
          'The request payload or parameters are invalid.',
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
