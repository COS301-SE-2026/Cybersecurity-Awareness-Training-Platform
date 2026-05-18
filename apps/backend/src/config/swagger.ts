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
        TrainingDocumentNotFoundErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/ApiErrorResponse',
            },
            {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  enum: ['TRAINING_DOCUMENT_NOT_FOUND'],
                  example: 'TRAINING_DOCUMENT_NOT_FOUND',
                },
                message: {
                  type: 'string',
                  example: 'Training document was not found',
                },
              },
            },
          ],
        },
        TrainingRateLimitErrorResponse: {
          allOf: [
            {
              $ref: '#/components/schemas/RateLimitErrorResponse',
            },
            {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  enum: ['TRAINING_RATE_LIMITED'],
                  example: 'TRAINING_RATE_LIMITED',
                },
                message: {
                  type: 'string',
                  example: 'Too many training requests. Please try again later.',
                },
              },
            },
          ],
        },
        EmptyRequestBody: {
          type: 'object',
          additionalProperties: false,
          description: 'Request body must be omitted or an empty JSON object.',
          example: {},
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
        DifficultyLevel: {
          type: 'string',
          enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE'],
          example: 'BEGINNER',
        },
        TrainingContentType: {
          type: 'string',
          enum: ['PDF', 'MARKDOWN', 'HTML', 'URL', 'INTERACTIVE'],
          example: 'MARKDOWN',
        },
        TrainingDocumentStatus: {
          type: 'string',
          enum: ['DRAFT', 'AVAILABLE', 'UNAVAILABLE', 'ARCHIVED'],
          example: 'AVAILABLE',
        },
        TrainingCampaignItemAvailabilityStatus: {
          type: 'string',
          enum: ['AVAILABLE', 'LOCKED', 'UNAVAILABLE', 'ARCHIVED'],
          example: 'AVAILABLE',
        },
        TrainingInteractionEventType: {
          type: 'string',
          enum: ['TRAINING_VIEWED', 'TRAINING_COMPLETED'],
          example: 'TRAINING_VIEWED',
        },
        TrainingDocument: {
          type: 'object',
          required: ['id', 'title', 'contentType', 'contentRef', 'difficultyLevel', 'status'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '33333333-3333-4333-8333-333333333333',
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
              type: 'string',
              nullable: true,
              example: 'Common phishing indicators and safe response steps.',
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
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-4111-8111-111111111111',
            },
            campaignAssignmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '44444444-4444-4444-8444-444444444444',
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
              type: 'string',
              format: 'date-time',
              example: '2026-05-16T09:00:00.000Z',
            },
          },
        },
        RecordTrainingInteractionResponse: {
          type: 'object',
          required: ['success', 'campaignItemId', 'trainingDocumentId', 'event'],
          properties: {
            success: {
              type: 'boolean',
              enum: [true],
              example: true,
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
        EmailClassification: {
          type: 'string',
          enum: ['SAFE', 'SUSPICIOUS', 'PHISHING'],
          example: 'PHISHING',
        },
        EmailRedFlagType: {
          type: 'string',
          enum: ['SENDER', 'LINK', 'LANGUAGE', 'ATTACHMENT', 'REQUEST', 'DOMAIN', 'OTHER'],
          example: 'LANGUAGE',
        },
        RedFlagSeverity: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          example: 'MEDIUM',
        },
        SimulatedEmailInteractionEventType: {
          type: 'string',
          enum: [
            'SIMULATED_EMAIL_OPENED',
            'SIMULATED_EMAIL_LINK_CLICKED',
            'CREDENTIAL_SUBMISSION_ATTEMPTED',
          ],
          example: 'SIMULATED_EMAIL_LINK_CLICKED',
        },
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
              type: 'array',
              items: {
                $ref: '#/components/schemas/SimulatedInboxEmailSummary',
              },
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
        QuestionType: {
          type: 'string',
          enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'],
          example: 'SINGLE_CHOICE',
        },
        QuizAttemptStatus: {
          type: 'string',
          enum: ['IN_PROGRESS', 'SUBMITTED'],
          example: 'IN_PROGRESS',
        },
        QuizStatus: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          example: 'PUBLISHED',
        },
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
