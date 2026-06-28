import { describe, expect, it } from 'vitest';
import { swaggerSpec } from '../../src/config/swagger.js';

type HttpMethod = 'get' | 'post';

interface SwaggerOperationShape {
  responses?: Record<string, unknown>;
}

interface SwaggerSpecShape {
  openapi?: string;
  paths?: Record<string, Record<string, SwaggerOperationShape>>;
  components?: {
    schemas?: Record<string, unknown>;
    responses?: Record<string, unknown>;
    requestBodies?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

const expectedSchemas = [
  'HealthStatus',
  'ApiErrorResponse',
  'ValidationErrorResponse',
  'RateLimitErrorResponse',
  'PublicUser',
  'AuthRegisterRequest',
  'AuthLoginRequest',
  'AuthRegisterResponse',
  'AuthContextUser',
  'AuthOrganisationContext',
  'AuthContext',
  'AuthLoginResponse',
  'AuthMeResponse',
  'AuthResendVerificationRequest',
  'AuthResendVerificationResponse',
  'AuthRateLimitErrorResponse',
  'SetupTokenState',
  'SetupTokenContextResponse',
  'SetupCompleteRequest',
  'SetupCompleteResponse',
  'CreateOrganisationRegistrationRequest',
  'OrganisationRegistrationRequestCreatedResponse',
  'OrganisationRegistrationRequestConflictErrorResponse',
  'UserType',
  'AuthStatus',
  'TrainingDocument',
  'TrainingCampaignItemContext',
  'GetTrainingDocumentResponse',
  'RecordTrainingInteractionResponse',
  'TrainingInteractionEvent',
  'EmptyRequestBody',
  'TrainingContentType',
  'DifficultyLevel',
  'TrainingDocumentStatus',
  'TrainingInteractionEventType',
  'CampaignType',
  'CampaignStatus',
  'CampaignAssignmentStatus',
  'CampaignAccessType',
  'CampaignItemType',
  'CampaignComponentType',
  'CampaignGroupType',
  'CampaignCompletionRule',
  'CampaignItemAvailabilityStatus',
  'TraineeCampaignProgressStatus',
  'TraineeCampaignAssignmentSummary',
  'TraineeCampaignSummary',
  'CampaignTrainingDocumentSummary',
  'CampaignQuizSummary',
  'CampaignSimulationSummary',
  'TraineeCampaignItemSummary',
  'TraineeCampaignGroupItem',
  'TraineeCampaignComponentItem',
  'GetTraineeCampaignsResponse',
  'GetTraineeCampaignDetailResponse',
  'SimulatedInbox',
  'SimulatedInboxEmailSummary',
  'SimulatedEmailDetail',
  'RecordSimulatedEmailInteractionRequest',
  'RecordSimulatedEmailInteractionResponse',
  'ClassifySimulatedEmailRequest',
  'ClassifySimulatedEmailResponse',
  'EmailRedFlag',
  'EmailClassification',
  'EmailRedFlagType',
  'RedFlagSeverity',
  'SimulatedEmailInteractionEventType',
  'QuizCampaignItemContext',
  'QuizOptionForTrainee',
  'QuizQuestionForTrainee',
  'GetQuizResponse',
  'StartQuizAttemptResponse',
  'SubmitQuizAttemptRequest',
  'SubmitQuizAttemptResponse',
  'GetQuizResultResponse',
  'QuizResultQuestion',
  'QuizResultOption',
  'QuizAttempt',
  'AttemptAnswer',
  'QuestionType',
  'QuizAttemptStatus',
  'QuizStatus',
] as const;

const expectedResponses = [
  'BadRequest',
  'Unauthorized',
  'Forbidden',
  'NotFound',
  'Conflict',
  'UnprocessableEntity',
  'TooManyRequests',
  'InternalServerError',
] as const;

const expectedParameters = [
  'CampaignIdPathParam',
  'CampaignItemIdPathParam',
  'EmailIdPathParam',
  'AttemptIdPathParam',
  'SetupTokenPathParam',
] as const;

const expectedRequestBodies = [
  'AuthRegister',
  'AuthLogin',
  'EmptyJson',
  'RecordSimulatedEmailInteraction',
  'ClassifySimulatedEmail',
  'SubmitQuizAttempt',
  'SetupComplete',
  'CreateOrganisationRegistrationRequest',
] as const;

const expectedRouteDocs: Array<[HttpMethod, string, string[]]> = [
  ['get', '/health', ['200', '500']],
  ['post', '/auth/register', ['201', '400', '409', '429', '500']],
  ['post', '/auth/login', ['200', '400', '401', '403', '429', '500']],
  ['get', '/auth/me', ['200', '401', '403', '429', '500']],
  ['post', '/auth/logout', ['200', '500']],
  ['post', '/auth/refresh', ['200', '401', '403', '429', '500']],
  ['post', '/auth/resend-verification', ['200', '400', '429', '500']],
  ['get', '/setup/token/{token}/context', ['200', '400', '401', '409', '429', '500']],
  ['post', '/setup/token/{token}/complete', ['201', '400', '401', '409', '429', '500']],
  ['post', '/organisation-registration-requests', ['201', '409', '422', '429', '500']],
  ['get', '/trainee/campaigns', ['200', '401', '429', '500']],
  ['get', '/trainee/campaigns/{campaignId}', ['200', '400', '401', '404', '429', '500']],
  [
    'get',
    '/trainee/campaign-items/{campaignItemId}/training-document',
    ['200', '400', '401', '404', '429', '500'],
  ],
  [
    'post',
    '/trainee/campaign-items/{campaignItemId}/training-document/viewed',
    ['201', '400', '401', '404', '429', '500'],
  ],
  [
    'post',
    '/trainee/campaign-items/{campaignItemId}/training-document/completed',
    ['201', '400', '401', '404', '429', '500'],
  ],
  [
    'get',
    '/trainee/campaign-items/{campaignItemId}/simulated-inbox',
    ['200', '400', '401', '403', '404', '429', '500'],
  ],
  [
    'get',
    '/trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}',
    ['200', '400', '401', '403', '404', '429', '500'],
  ],
  [
    'post',
    '/trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}/interactions',
    ['200', '400', '401', '403', '404', '429', '500'],
  ],
  [
    'post',
    '/trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}/classification',
    ['200', '400', '401', '403', '404', '409', '429', '500'],
  ],
  [
    'get',
    '/trainee/campaign-items/{campaignItemId}/quiz',
    ['200', '400', '401', '403', '404', '429', '500'],
  ],
  [
    'post',
    '/trainee/campaign-items/{campaignItemId}/quiz/attempts',
    ['201', '400', '401', '403', '404', '429', '500'],
  ],
  [
    'post',
    '/quiz-attempts/{attemptId}/submit',
    ['200', '400', '401', '403', '404', '409', '429', '500'],
  ],
  ['get', '/quiz-attempts/{attemptId}/results', ['200', '400', '401', '403', '404', '429', '500']],
];

const inactiveRouteDocs = [
  '/training/assigned',
  '/training/{trainingId}',
  '/training/{trainingId}/progress',
  '/simulations/inbox',
  '/simulations/emails/{emailId}',
  '/quizzes/{quizId}',
  '/trainee/simulated-emails/{emailId}',
  '/trainee/campaign-items/{campaignItemId}/quiz-attempts',
  '/trainee/campaigns/{campaignId}/start',
  '/trainee/campaigns/{campaignId}/complete',
  '/trainee/campaigns/{campaignId}/items/{campaignItemId}/complete',
  '/quiz-attempts/{attemptId}/result',
] as const;

describe('swaggerSpec', () => {
  const spec = swaggerSpec as SwaggerSpecShape;

  function getPath(path: string, method: HttpMethod) {
    return spec.paths?.[path]?.[method];
  }

  function expectPathExists(path: string, method: HttpMethod) {
    expect(getPath(path, method), `${method.toUpperCase()} ${path}`).toBeDefined();
  }

  function expectSchemaExists(name: string) {
    expect(spec.components?.schemas).toHaveProperty(name);
  }

  function expectPathResponse(path: string, method: HttpMethod, status: string) {
    expect(getPath(path, method)?.responses).toHaveProperty(status);
  }

  function expectBearerAuth(path: string, method: HttpMethod) {
    expect(JSON.stringify(getPath(path, method))).toContain('bearerAuth');
  }

  function expectSchemaNotToContain(schemaName: string, forbiddenTerms: string[]) {
    const serializedSchema = JSON.stringify(spec.components?.schemas?.[schemaName]);

    for (const term of forbiddenTerms) {
      expect(serializedSchema).not.toContain(term);
    }
  }

  it('generates the base OpenAPI spec with bearer auth', () => {
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.components?.securitySchemes).toHaveProperty('bearerAuth');
  });

  it.each(expectedSchemas)('includes reusable schema %s', (schemaName) => {
    expectSchemaExists(schemaName);
  });

  it.each(expectedResponses)('includes reusable response %s', (responseName) => {
    expect(spec.components?.responses).toHaveProperty(responseName);
  });

  it.each(expectedParameters)('includes reusable UUID parameter %s', (parameterName) => {
    expect(spec.components?.parameters).toHaveProperty(parameterName);
    if (parameterName !== 'SetupTokenPathParam') {
      expect(JSON.stringify(spec.components?.parameters?.[parameterName])).toContain('"uuid"');
    }
  });

  it.each(expectedRequestBodies)('includes reusable request body %s', (requestBodyName) => {
    expect(spec.components?.requestBodies).toHaveProperty(requestBodyName);
  });

  it.each(expectedRouteDocs)('documents %s %s', (method, path, statuses) => {
    expectPathExists(path, method);

    for (const status of statuses) {
      expectPathResponse(path, method, status);
    }
  });

  it('documents trainee campaign routes with bearer auth', () => {
    expectPathExists('/trainee/campaigns', 'get');
    expectPathExists('/trainee/campaigns/{campaignId}', 'get');
    expectBearerAuth('/trainee/campaigns', 'get');
    expectBearerAuth('/trainee/campaigns/{campaignId}', 'get');
  });

  it('documents setup endpoints as public token-authorized flows', () => {
    expectPathExists('/setup/token/{token}/context', 'get');
    expectPathExists('/setup/token/{token}/complete', 'post');

    expect(JSON.stringify(getPath('/setup/token/{token}/context', 'get'))).toContain(
      '"security":[]',
    );
    expect(JSON.stringify(getPath('/setup/token/{token}/complete', 'post'))).toContain(
      '"security":[]',
    );
  });

  it('documents organisation registration request submission as public', () => {
    expectPathExists('/organisation-registration-requests', 'post');

    expect(JSON.stringify(getPath('/organisation-registration-requests', 'post'))).toContain(
      '"security":[]',
    );
  });

  it.each(inactiveRouteDocs)('does not document inactive route %s', (path) => {
    expect(spec.paths).not.toHaveProperty(path);
  });

  it('keeps public user schemas free of password hashes', () => {
    expectSchemaNotToContain('PublicUser', ['passwordHash']);
  });

  it('keeps setup context free of token hashes and passwords', () => {
    expectSchemaNotToContain('SetupTokenContextResponse', [
      'tokenHash',
      'password',
      'passwordHash',
    ]);
  });

  it('keeps organisation registration request docs free of account creation fields', () => {
    expectSchemaNotToContain('CreateOrganisationRegistrationRequest', [
      'password',
      'passwordHash',
      'invitationId',
      'setupToken',
      'actionToken',
    ]);
  });

  it('documents organisation request web URL restrictions', () => {
    const schema = JSON.stringify(spec.components?.schemas?.CreateOrganisationRegistrationRequest);

    expect(schema).toContain('Must use http or https.');
  });

  it('keeps simulated email detail free of pre-classification answers', () => {
    expectSchemaNotToContain('SimulatedEmailDetail', ['expectedClassification', 'redFlags']);
  });

  it('keeps quiz fetch response free of pre-submission answers', () => {
    expectSchemaNotToContain('GetQuizResponse', ['isCorrect', 'feedbackText']);
  });

  it('keeps trainee campaign schemas free of internal and sensitive activity fields', () => {
    const serializedSchemas = JSON.stringify([
      spec.components?.schemas?.GetTraineeCampaignsResponse,
      spec.components?.schemas?.GetTraineeCampaignDetailResponse,
      spec.components?.schemas?.TraineeCampaignSummary,
      spec.components?.schemas?.TraineeCampaignComponentItem,
      spec.components?.schemas?.TraineeCampaignGroupItem,
      spec.components?.schemas?.CampaignTrainingDocumentSummary,
      spec.components?.schemas?.CampaignQuizSummary,
      spec.components?.schemas?.CampaignSimulationSummary,
    ]);

    for (const term of [
      'createdByUserId',
      'traineeProfileId',
      'trainingDocumentId',
      'quizId',
      'simulationId',
      'answerOptions',
      'expectedClassification',
      'redFlags',
    ]) {
      expect(serializedSchemas).not.toContain(term);
    }
  });

  it('documents trainee campaign activity path mapping', () => {
    const componentSchema = JSON.stringify(spec.components?.schemas?.TraineeCampaignComponentItem);

    expect(componentSchema).toContain('/simulated-inbox');
    expect(componentSchema).toContain('/training-document');
    expect(componentSchema).toContain('/quiz');
  });

  it('includes quiz result feedback fields only in post-submission result schemas', () => {
    const resultSchema = JSON.stringify([
      spec.components?.schemas?.GetQuizResultResponse,
      spec.components?.schemas?.QuizResultQuestion,
      spec.components?.schemas?.QuizResultOption,
    ]);

    expect(resultSchema).toContain('isCorrect');
    expect(resultSchema).toContain('feedbackText');
  });
});
