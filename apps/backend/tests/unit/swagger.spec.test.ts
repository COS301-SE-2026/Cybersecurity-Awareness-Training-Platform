import { describe, expect, it } from 'vitest';
import { swaggerSpec } from '../../src/config/swagger.js';

type HttpMethod = 'get' | 'patch' | 'post' | 'delete';

interface SwaggerOperationShape {
  responses?: Record<string, unknown>;
  requestBody?: Record<string, unknown>;
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
  'AuthVerifyEmailRequest',
  'AuthVerifyEmailResponse',
  'AccountProfileUpdateRequest',
  'AccountChangeEmailRequest',
  'AccountChangeEmailResponse',
  'AccountChangePasswordRequest',
  'AccountChangePasswordResponse',
  'AccountProfile',
  'AccountSecurityPreferences',
  'AccountSecurityPreferencesRequest',
  'AccountPolicy',
  'AccountCapabilities',
  'AccountResponse',
  'AccountSession',
  'AccountSessionsResponse',
  'AccountSessionRevocationResponse',
  'AccountLogoutOthersResponse',
  'AccountVerifyEmailChangeRequest',
  'AccountVerifyEmailChangeResponse',
  'AuthForgotPasswordRequest',
  'AuthForgotPasswordResponse',
  'AuthResetPasswordRequest',
  'AuthResetPasswordResponse',
  'AuthRateLimitErrorResponse',
  'TokenContextResponse',
  'SetupTokenState',
  'SetupTokenContextResponse',
  'SetupCompleteRequest',
  'SetupCompleteResponse',
  'CreateOrganisationRegistrationRequest',
  'PlatformOrganisationRequest',
  'PlatformOrganisationRequestsListResponse',
  'ApproveOrganisationRequest',
  'RejectOrganisationRequest',
  'OrganisationInformation',
  'PlatformOrganisationDetail',
  'PlatformOrganisationRequestDetailsResponse',
  'OrganisationInitialSetupStatus',
  'OrganisationResendEligibility',
  'PlatformTimelineEntry',
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
  'OrganisationSecuritySettings',
  'OrganisationSecuritySettingsEffectivePolicy',
  'OrganisationSecuritySettingsLimits',
  'OrganisationSecuritySettingsChangesApply',
  'OrganisationSecuritySettingsCapabilities',
  'OrganisationSecuritySettingsResponse',
  'OrganisationSecuritySettingsUpdateRequest',
  'QuestionType',
  'QuizAttemptStatus',
  'QuizStatus',
  'InvitationStatus',
  'InvitationType',
  'InvitationRoleGranted',
  'InvitationContextResponse',
  'InvitationAcceptRequest',
  'InvitationAcceptResponse',
  'InvitationRejectRequest',
  'InvitationRejectResponse',
  'TraineeListItem',
  'TraineeListResponse',
  'CreateTraineeInvitationRequest',
  'CreateTraineeInvitationResponse',
  'InvitationResendResponse',
  'InvitationRevokeResponse',
  'DisableTraineeRequest',
  'DisableTraineeResponse',
  'CreateCampaignAssignmentsRequest',
  'CampaignAssignmentResultRow',
  'CampaignAssignmentSummary',
  'CreateCampaignAssignmentsResponse',
  'CampaignAssignmentReadRow',
  'GetCampaignAssignmentsResponse',
  'PlatformCampaignSummary',
  'GetPlatformCampaignsResponse',
  'PaginationMetadata',
  'PlatformAdminRole',
  'PlatformAdminStatus',
  'PlatformAdminInvitationStatus',
  'PlatformAdminAllowedActions',
  'PlatformAdmin',
  'PlatformAdminsListResponse',
  'InvitePlatformAdminRequest',
  'InvitePlatformAdminResponse',
  'ResendPlatformAdminInviteResponse',
  'TransferSuperAdminRequest',
  'DemotePlatformAdminRequest',
  'DemotePlatformAdminResponse',
  'CampaignStatisticsCampaign',
  'CampaignStatisticsSummary',
  'CampaignStatisticsTraineeProgress',
  'CampaignStatisticsTraineeActions',
  'CampaignStatisticsTraineeRow',
  'GetCampaignStatisticsResponse',
  'CampaignManagementRateLimitErrorResponse',
] as const;

const expectedResponses = [
  'BadRequest',
  'Unauthorized',
  'Forbidden',
  'NotFound',
  'Conflict',
  'UnprocessableEntity',
  'TooManyRequests',
  'CampaignManagementRateLimited',
  'InternalServerError',
  'GetAssignableCampaignsOk',
  'GetCampaignAssignmentCandidatesOk',
  'GetPlatformCampaignsOk',
  'EnrolPlatformCampaignOk',
  'PlatformAdminsListOk',
  'InvitePlatformAdminCreated',
  'ResendPlatformAdminInviteOk',
  'TransferSuperAdminOk',
  'DemotePlatformAdminOk',
  'CreateCampaignAssignmentsOk',
  'GetCampaignAssignmentsOk',
  'GetCampaignStatisticsOk',
  'InvitationContextOk',
  'InvitationAcceptOk',
  'InvitationRejectOk',
  'AccountOk',
  'AccountChangeEmailRequested',
  'AccountPasswordChanged',
  'AccountSessionsOk',
  'AccountSessionRevoked',
  'AccountOtherSessionsLoggedOut',
  'OrganisationTraineesOk',
  'OrganisationTraineeInvitationCreated',
  'OrganisationTraineeInvitationResent',
  'OrganisationTraineeInvitationRevoked',
  'OrganisationTraineeDisabled',
  'OrganisationInformationOk',
] as const;

const expectedParameters = [
  'OrganisationIdPathParam',
  'CampaignIdPathParam',
  'CampaignItemIdPathParam',
  'EmailIdPathParam',
  'AttemptIdPathParam',
  'SetupTokenPathParam',
  'InvitationTokenPathParam',
  'AccountSessionIdPathParam',
  'TraineeIdPathParam',
  'InvitationIdPathParam',
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
  'ApproveOrganisationRequest',
  'RejectOrganisationRequest',
  'AuthVerifyEmail',
  'AccountVerifyEmailChange',
  'AccountProfileUpdate',
  'AccountChangeEmail',
  'AccountChangePassword',
  'AccountSecurityPreferences',
  'AuthForgotPassword',
  'AuthResetPassword',
  'OrganisationSecuritySettingsUpdate',
  'InvitationAccept',
  'InvitationReject',
  'CreateTraineeInvitation',
  'DisableTrainee',
  'CreateCampaignAssignments',
  'InvitePlatformAdmin',
  'TransferSuperAdmin',
  'DemotePlatformAdmin',
] as const;

const expectedRouteDocs: Array<[HttpMethod, string, string[]]> = [
  ['get', '/health', ['200', '500']],
  ['post', '/auth/register', ['201', '400', '429', '500']],
  ['post', '/auth/login', ['200', '400', '401', '403', '429', '500']],
  ['get', '/auth/me', ['200', '401', '403', '429', '500']],
  ['post', '/auth/logout', ['200', '500']],
  ['post', '/auth/refresh', ['200', '401', '403', '429', '500']],
  ['post', '/auth/resend-verification', ['200', '400', '429', '500']],
  ['post', '/auth/verify-email', ['200', '400', '429', '500']],
  ['get', '/account', ['200', '401', '403', '404', '429', '500']],
  ['patch', '/account/profile', ['200', '401', '403', '404', '422', '429', '500']],
  ['post', '/account/change-email', ['200', '401', '403', '409', '422', '429', '500']],
  ['post', '/account/change-password', ['200', '401', '403', '404', '422', '429', '500']],
  ['get', '/account/sessions', ['200', '401', '429', '500']],
  ['delete', '/account/sessions/{sessionId}', ['200', '400', '401', '404', '409', '429', '500']],
  ['post', '/account/sessions/logout-others', ['200', '401', '429', '500']],
  ['patch', '/account/security-preferences', ['200', '401', '403', '404', '422', '429', '500']],
  ['post', '/account/verify-email-change', ['200', '400', '409', '429', '500']],
  ['post', '/auth/forgot-password', ['200', '400', '429', '500']],
  ['post', '/auth/reset-password', ['200', '400', '401', '403', '409', '422', '429', '500']],
  ['get', '/auth/tokens/{token}/context', ['200', '400', '429', '500']],
  ['post', '/auth/tokens/{token}/resend', ['200', '400', '429', '500']],
  ['get', '/setup/token/{token}/context', ['200', '400', '401', '409', '429', '500']],
  ['post', '/setup/token/{token}/complete', ['201', '400', '401', '409', '429', '500']],
  ['get', '/invitations/token/{token}/context', ['200', '400', '401', '403', '409', '429', '500']],
  ['post', '/invitations/token/{token}/accept', ['200', '400', '401', '403', '409', '429', '500']],
  ['post', '/invitations/token/{token}/reject', ['200', '400', '401', '403', '409', '429', '500']],
  ['post', '/organisation-registration-requests', ['201', '409', '422', '429', '500']],
  ['get', '/platform/organisation-requests', ['200', '400', '401', '403', '429', '500']],
  [
    'get',
    '/platform/organisation-requests/{requestId}',
    ['200', '401', '403', '404', '429', '500'],
  ],
  [
    'patch',
    '/platform/organisation-requests/{requestId}/contacted',
    ['200', '401', '403', '404', '409', '429', '500'],
  ],
  [
    'post',
    '/platform/organisation-requests/{requestId}/approve',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  [
    'post',
    '/platform/organisation-requests/{requestId}/reject',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  [
    'delete',
    '/platform/organisation-requests/{requestId}',
    ['200', '401', '403', '404', '409', '429', '500'],
  ],
  ['get', '/platform/organisations/{organisationId}', ['200', '401', '403', '404', '429', '500']],
  [
    'get',
    '/platform/organisation-requests/{requestId}/details',
    ['200', '401', '403', '404', '429', '500'],
  ],
  [
    'post',
    '/platform/organisations/{organisationId}/resend-initial-admin-setup',
    ['200', '401', '403', '404', '409', '429', '500'],
  ],
  ['get', '/platform/admins', ['200', '401', '403', '429', '500']],
  ['post', '/platform/admin-invitations', ['201', '400', '401', '403', '409', '422', '429', '500']],
  [
    'post',
    '/platform/admin-invitations/{id}/resend',
    ['200', '400', '401', '403', '404', '409', '429', '500'],
  ],
  [
    'post',
    '/platform/admins/transfer-super-admin',
    ['200', '400', '401', '403', '409', '422', '429', '500'],
  ],
  [
    'post',
    '/platform/admins/{userId}/demote',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  ['get', '/organisations/{organisationId}', ['200', '400', '401', '403', '404', '429', '500']],
  ['get', '/organisations/{organisationId}/admins', ['200', '400', '401', '403', '429', '500']],
  [
    'post',
    '/organisations/{organisationId}/admin-promotions',
    ['201', '400', '401', '403', '409', '422', '429', '500'],
  ],
  [
    'patch',
    '/organisations/{organisationId}/admins/{adminId}/permissions',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  [
    'post',
    '/organisations/{organisationId}/admins/{adminId}/remove',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  [
    'get',
    '/organisations/{organisationId}/security-settings',
    ['200', '400', '401', '403', '404', '429', '500'],
  ],
  [
    'patch',
    '/organisations/{organisationId}/security-settings',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  ['get', '/organisations/{organisationId}/trainees', ['200', '400', '401', '403', '429', '500']],
  [
    'post',
    '/organisations/{organisationId}/trainee-invitations',
    ['201', '400', '401', '403', '409', '422', '429', '500'],
  ],
  [
    'post',
    '/organisations/{organisationId}/trainee-invitations/{invitationId}/resend',
    ['200', '400', '401', '403', '404', '409', '429', '500'],
  ],
  [
    'post',
    '/organisations/{organisationId}/trainee-invitations/{invitationId}/revoke',
    ['200', '400', '401', '403', '404', '409', '429', '500'],
  ],
  [
    'patch',
    '/organisations/{organisationId}/trainees/{traineeId}/disable',
    ['200', '400', '401', '403', '404', '409', '422', '429', '500'],
  ],
  [
    'get',
    '/organisations/{organisationId}/campaigns/{campaignId}/statistics',
    ['200', '401', '403', '404', '422', '429', '500'],
  ],
  ['get', '/trainee/campaigns', ['200', '401', '429', '500']],
  ['get', '/trainee/campaigns/{campaignId}', ['200', '400', '401', '404', '429', '500']],
  ['get', '/trainee/platform-campaigns', ['200', '400', '401', '403', '429', '500']],
  [
    'post',
    '/trainee/platform-campaigns/{campaignId}/enrol',
    ['200', '400', '401', '403', '404', '409', '429', '500'],
  ],
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
    if (parameterName !== 'SetupTokenPathParam' && parameterName !== 'InvitationTokenPathParam') {
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
    expectPathExists('/trainee/platform-campaigns', 'get');
    expectPathExists('/trainee/platform-campaigns/{campaignId}/enrol', 'post');
    expectBearerAuth('/trainee/campaigns', 'get');
    expectBearerAuth('/trainee/campaigns/{campaignId}', 'get');
    expectBearerAuth('/trainee/platform-campaigns', 'get');
    expectBearerAuth('/trainee/platform-campaigns/{campaignId}/enrol', 'post');
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

  it('documents invitation endpoints as public or token-authorized flows with full error shapes', () => {
    expectPathExists('/invitations/token/{token}/context', 'get');
    expectPathExists('/invitations/token/{token}/accept', 'post');
    expectPathExists('/invitations/token/{token}/reject', 'post');

    expect(JSON.stringify(getPath('/invitations/token/{token}/context', 'get'))).toContain(
      '"security":[]',
    );
    expect(JSON.stringify(getPath('/invitations/token/{token}/accept', 'post'))).toContain(
      '"security":[{"bearerAuth":[]}]',
    );
    expect(JSON.stringify(getPath('/invitations/token/{token}/reject', 'post'))).toContain(
      '"security":[]',
    );
  });

  it('documents organisation registration request submission as public', () => {
    expectPathExists('/organisation-registration-requests', 'post');

    expect(JSON.stringify(getPath('/organisation-registration-requests', 'post'))).toContain(
      '"security":[]',
    );
  });

  it('documents organisation security settings contract details', () => {
    expectBearerAuth('/organisations/{organisationId}/security-settings', 'get');
    expectBearerAuth('/organisations/{organisationId}/security-settings', 'patch');

    const responseSchema = JSON.stringify(
      spec.components?.schemas?.OrganisationSecuritySettingsResponse,
    );
    const updateRequest = JSON.stringify(
      spec.components?.requestBodies?.OrganisationSecuritySettingsUpdate,
    );

    expect(responseSchema).toContain('settings');
    expect(responseSchema).toContain('effectivePolicy');
    expect(responseSchema).toContain('platformLimits');
    expect(responseSchema).toContain('capabilities');
    expect(updateRequest).toContain('OrganisationSecuritySettingsUpdateRequest');
  });

  it('documents organisation trainee routes with bearer auth and schemas', () => {
    expectBearerAuth('/organisations/{organisationId}/trainees', 'get');
    expectBearerAuth('/organisations/{organisationId}/trainee-invitations', 'post');
    expectBearerAuth(
      '/organisations/{organisationId}/trainee-invitations/{invitationId}/resend',
      'post',
    );
    expectBearerAuth(
      '/organisations/{organisationId}/trainee-invitations/{invitationId}/revoke',
      'post',
    );
    expectBearerAuth('/organisations/{organisationId}/trainees/{traineeId}/disable', 'patch');
  });

  it('documents the discriminated trainee row variants with their required lifecycle fields', () => {
    const traineeListItem = spec.components?.schemas?.TraineeListItem as {
      required?: string[];
      properties?: Record<string, { enum?: string[]; nullable?: boolean; type?: string }>;
    };

    expect(traineeListItem).toBeDefined();
    expect(traineeListItem.required).toEqual(
      expect.arrayContaining(['id', 'rowType', 'type', 'email', 'status', 'eligibility']),
    );
    expect(traineeListItem.properties?.rowType?.enum).toEqual(['ACTIVE_TRAINEE', 'INVITATION']);
    expect(traineeListItem.properties?.invitationStatus?.enum).toEqual([
      'PENDING',
      'SENT',
      'FAILED_TO_SEND',
      'ACCEPTED',
      'COMPLETED',
      'EXPIRED',
      'REVOKED',
      'REJECTED',
    ]);
    expect(traineeListItem.properties?.status?.enum).toEqual([
      'ACTIVE',
      'DISABLED',
      'INVITE_PENDING',
      'INVITE_FAILED',
      'INVITE_EXPIRED',
      'INVITE_REJECTED',
      'INVITE_REVOKED',
      'INVITE_ACCEPTED',
      'INVITE_COMPLETED',
    ]);
    expect(traineeListItem.properties?.emailDeliveryStatus?.enum).toEqual([
      'PENDING',
      'SENT',
      'FAILED',
      'UNKNOWN',
    ]);
  });

  it('documents trainee list and invitation responses using the same row component', () => {
    const listResponse = JSON.stringify(spec.components?.schemas?.TraineeListResponse);
    const createResponse = JSON.stringify(
      spec.components?.schemas?.CreateTraineeInvitationResponse,
    );
    const resendResponse = JSON.stringify(spec.components?.schemas?.InvitationResendResponse);

    expect(listResponse).toContain('invitations');
    expect(listResponse).toContain('TraineeListItem');
    expect(createResponse).toContain('TraineeListItem');
    expect(resendResponse).toContain('TraineeListItem');
  });

  it('documents pending organisation admin promotion responses', () => {
    const promotionResponse = JSON.stringify(
      spec.components?.schemas?.OrganisationAdminPromotionResponse,
    );

    expect(promotionResponse).toContain('PENDING');
    expect(promotionResponse).toContain('SENT');
    expect(promotionResponse).toContain('FAILED_TO_SEND');
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

    expect(schema).toContain('Optional. Must use http or https when provided.');
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

  it('enforces that token fields are returned on login/refresh schemas but not on /auth/me schema', () => {
    const loginSchema = spec.components?.schemas?.AuthLoginResponse as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined;
    const meSchema = spec.components?.schemas?.AuthMeResponse as
      | { properties?: Record<string, unknown> }
      | undefined;

    expect(loginSchema).toBeDefined();
    expect(loginSchema?.properties).toHaveProperty('accessToken');
    expect(loginSchema?.properties).toHaveProperty('idleTimeoutMinutes');
    expect(loginSchema?.required).toContain('idleTimeoutMinutes');

    expect(meSchema).toBeDefined();
    expect(meSchema?.properties).not.toHaveProperty('accessToken');
    expect(meSchema?.properties).not.toHaveProperty('token');
    expect(meSchema?.properties).not.toHaveProperty('tokenType');
    expect(meSchema?.properties).not.toHaveProperty('expiresAt');
    expect(meSchema?.properties).not.toHaveProperty('idleTimeoutMinutes');
  });

  it('documents account-security lifecycle contracts without exposing sensitive session or token fields', () => {
    for (const [method, path] of [
      ['get', '/account'] as const,
      ['post', '/account/change-email'] as const,
      ['post', '/account/change-password'] as const,
      ['get', '/account/sessions'] as const,
      ['delete', '/account/sessions/{sessionId}'] as const,
      ['post', '/account/sessions/logout-others'] as const,
      ['patch', '/account/security-preferences'] as const,
    ]) {
      expectBearerAuth(path, method);
    }

    expect(JSON.stringify(getPath('/account/verify-email-change', 'post'))).toContain(
      '"security":[]',
    );

    const accountSessionSchema = spec.components?.schemas?.AccountSession as
      | {
          properties?: Record<
            string,
            { description?: string; example?: unknown; nullable?: boolean }
          >;
        }
      | undefined;
    expect(accountSessionSchema?.properties).toHaveProperty('deviceSummary');
    expect(accountSessionSchema?.properties).toHaveProperty('locationSummary');
    expect(accountSessionSchema?.properties?.deviceSummary?.description).toContain(
      'raw user-agent strings are never returned',
    );
    expect(accountSessionSchema?.properties?.deviceSummary?.example).toBe('Windows · Chrome');
    expect(accountSessionSchema?.properties?.locationSummary).toMatchObject({
      nullable: true,
      example: null,
    });
    expect(accountSessionSchema?.properties?.locationSummary?.description).toContain(
      'IP addresses are not presented as physical locations',
    );
    expectSchemaNotToContain('AccountSession', [
      'refreshToken',
      'tokenHash',
      'ipAddress',
      'userAgent',
    ]);
    expectSchemaNotToContain('AccountSessionsResponse', [
      'refreshToken',
      'tokenHash',
      'ipAddress',
      'userAgent',
    ]);

    const emailChangeResponse = JSON.stringify(
      spec.components?.schemas?.AccountChangeEmailResponse,
    );
    const passwordChangeResponse = JSON.stringify(
      spec.components?.schemas?.AccountChangePasswordResponse,
    );
    const sessionRevocationResponse = JSON.stringify(
      spec.components?.schemas?.AccountSessionRevocationResponse,
    );
    const logoutOthersResponse = JSON.stringify(
      spec.components?.schemas?.AccountLogoutOthersResponse,
    );
    const verifyEmailChangeResponse = JSON.stringify(
      spec.components?.schemas?.AccountVerifyEmailChangeResponse,
    );
    const emailChangeRequest = spec.components?.schemas?.AccountChangeEmailRequest as
      | { properties?: Record<string, Record<string, unknown>> }
      | undefined;
    const passwordChangeRequest = spec.components?.schemas?.AccountChangePasswordRequest as
      | { properties?: Record<string, Record<string, unknown>> }
      | undefined;

    expect(emailChangeResponse).toContain('durably queued');
    expect(emailChangeResponse).toContain('not that the provider has delivered');
    expect(passwordChangeResponse).toContain('durably queued');
    expect(passwordChangeResponse).toContain('not that the provider has delivered');
    expect(sessionRevocationResponse).toContain('current session is permitted');
    expect(logoutOthersResponse).toContain('except the current session');
    expect(verifyEmailChangeResponse).toContain('active sessions/refresh tokens were revoked');
    expect(emailChangeRequest?.properties?.newEmail?.maxLength).toBe(254);
    expect(emailChangeRequest?.properties?.confirmNewEmail?.maxLength).toBe(254);
    expect(passwordChangeRequest?.properties?.newPassword).toEqual(
      expect.objectContaining({
        minLength: 12,
        maxLength: 128,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\sA-Za-z0-9]).+$',
      }),
    );
    expect(passwordChangeRequest?.properties?.confirmNewPassword).toEqual(
      expect.objectContaining({
        minLength: 12,
        maxLength: 128,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\sA-Za-z0-9]).+$',
      }),
    );
  });

  it('documents approve and reject requests with proper request body refs', () => {
    const approveDoc = getPath('/platform/organisation-requests/{requestId}/approve', 'post');
    expect(approveDoc).toBeDefined();
    expect(approveDoc?.requestBody).toBeDefined();
    expect(approveDoc?.requestBody).toHaveProperty(
      '$ref',
      '#/components/requestBodies/ApproveOrganisationRequest',
    );

    const rejectDoc = getPath('/platform/organisation-requests/{requestId}/reject', 'post');
    expect(rejectDoc).toBeDefined();
    expect(rejectDoc?.requestBody).toBeDefined();
    expect(rejectDoc?.requestBody).toHaveProperty(
      '$ref',
      '#/components/requestBodies/RejectOrganisationRequest',
    );
  });

  it('verifies property parity for InvitationContextResponse, InvitationAcceptResponse, and TraineeListItem schemas', () => {
    const contextSchema = spec.components?.schemas?.InvitationContextResponse as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(contextSchema?.properties).toHaveProperty('requiredAction');
    expect(contextSchema?.properties).toHaveProperty('rejectAllowed');
    expect(contextSchema?.properties).toHaveProperty('status');
    expect(contextSchema?.properties).toHaveProperty('permissions');

    const acceptSchema = spec.components?.schemas?.InvitationAcceptResponse as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(acceptSchema?.properties).toHaveProperty('roleGranted');
    expect(acceptSchema?.properties).toHaveProperty('organisationId');
    expect(acceptSchema?.properties).toHaveProperty('sessionOutcome');

    const traineeSchema = spec.components?.schemas?.TraineeListItem as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(traineeSchema?.properties).toHaveProperty('id');
    expect(traineeSchema?.properties).toHaveProperty('traineeProfileId');
    expect(traineeSchema?.properties).toHaveProperty('userId');
    expect(traineeSchema?.properties).toHaveProperty('invitationId');
    expect(traineeSchema?.properties).toHaveProperty('createdAt');
    expect(traineeSchema?.properties).toHaveProperty('eligibility');
  });

  it('verifies platform organisation lifecycle contracts in OpenAPI components', () => {
    const resendEligibility = spec.components?.schemas?.OrganisationResendEligibility as {
      required?: string[];
      properties?: {
        reason?: {
          type?: string;
          nullable?: boolean;
          enum?: Array<string | null>;
        };
      };
    };
    expect(resendEligibility).toBeDefined();
    expect(resendEligibility.properties?.reason?.nullable).toBe(true);
    expect(resendEligibility.properties?.reason?.enum).toEqual([
      'ORGANISATION_NOT_ONBOARDING',
      'INVITATION_NOT_ELIGIBLE',
      'SETUP_ALREADY_COMPLETED',
      'ACTIVE_SETUP_TOKEN_EXISTS',
      'SETUP_TOKEN_EXPIRED',
      'SETUP_EMAIL_FAILED',
      'CONCURRENT_RESEND_IN_PROGRESS',
      null,
    ]);

    const timelineEntry = spec.components?.schemas?.PlatformTimelineEntry as {
      required?: string[];
      properties?: {
        metadata?: {
          type?: string;
          nullable?: boolean;
          enum?: Array<null | string>;
        };
      };
    };
    expect(timelineEntry).toBeDefined();
    expect(timelineEntry.properties?.metadata?.nullable).toBe(true);
    expect(timelineEntry.properties?.metadata?.enum).toEqual([null]);

    const setupStatus = spec.components?.schemas?.OrganisationInitialSetupStatus as {
      required?: string[];
      properties?: {
        latestActionToken?: {
          required?: string[];
        };
        latestEmailDelivery?: {
          required?: string[];
        };
      };
    };
    expect(setupStatus).toBeDefined();
    expect(setupStatus.required).toEqual(
      expect.arrayContaining([
        'id',
        'status',
        'recipientEmail',
        'expiresAt',
        'latestActionToken',
        'latestEmailDelivery',
      ]),
    );
    expect(setupStatus.properties?.latestActionToken?.required).toEqual(
      expect.arrayContaining(['id', 'expiresAt', 'usedAt', 'revokedAt', 'status']),
    );
    expect(setupStatus.properties?.latestEmailDelivery?.required).toEqual(
      expect.arrayContaining(['id', 'deliveryStatus', 'sentAt', 'failedAt', 'failureReason']),
    );
  });

  it('documents campaign assignment OpenAPI schemas with page maximum, non-negative constraints, strict additionalProperties: false, and active true constraint', () => {
    const pageParamDoc = JSON.stringify(
      spec.paths?.['/organisations/{organisationId}/campaigns/assignable']?.get,
    );
    expect(pageParamDoc).toContain('"maximum":100000');

    const candidatePageParamDoc = JSON.stringify(
      spec.paths?.['/organisations/{organisationId}/campaign-assignment-candidates']?.get,
    );
    expect(candidatePageParamDoc).toContain('"maximum":100000');

    const paginationMeta = spec.components?.schemas?.PaginationMeta as {
      additionalProperties?: boolean;
      properties?: Record<string, { minimum?: number }>;
    };
    expect(paginationMeta).toBeDefined();
    expect(paginationMeta.additionalProperties).toBe(false);
    expect(paginationMeta.properties?.page?.minimum).toBe(1);
    expect(paginationMeta.properties?.limit?.minimum).toBe(1);
    expect(paginationMeta.properties?.total?.minimum).toBe(0);
    expect(paginationMeta.properties?.totalPages?.minimum).toBe(0);

    const assignableOption = spec.components?.schemas?.AssignableCampaignOption as {
      additionalProperties?: boolean;
      properties?: Record<string, { minimum?: number }>;
    };
    expect(assignableOption).toBeDefined();
    expect(assignableOption.additionalProperties).toBe(false);
    expect(assignableOption.properties?.itemCount?.minimum).toBe(0);
    expect(assignableOption.properties?.assignmentCount?.minimum).toBe(0);

    const assignableResponse = spec.components?.schemas?.GetAssignableCampaignsResponse as {
      additionalProperties?: boolean;
    };
    expect(assignableResponse?.additionalProperties).toBe(false);

    const candidateOption = spec.components?.schemas?.CampaignAssignmentCandidateOption as {
      additionalProperties?: boolean;
      properties?: Record<string, { enum?: boolean[] }>;
    };
    expect(candidateOption).toBeDefined();
    expect(candidateOption.additionalProperties).toBe(false);
    expect(candidateOption.properties?.active?.enum).toEqual([true]);

    const candidatesResponse = spec.components?.schemas
      ?.GetCampaignAssignmentCandidatesResponse as {
      additionalProperties?: boolean;
    };
    expect(candidatesResponse?.additionalProperties).toBe(false);
  });

  it('documents platform administrator OpenAPI contracts with full required, nullable, enum, capability, and auth parity', () => {
    for (const [method, path] of [
      ['get', '/platform/admins'] as const,
      ['post', '/platform/admin-invitations'] as const,
      ['post', '/platform/admin-invitations/{id}/resend'] as const,
      ['post', '/platform/admins/transfer-super-admin'] as const,
      ['post', '/platform/admins/{userId}/demote'] as const,
    ]) {
      expectPathExists(path, method);
      expectBearerAuth(path, method);
    }

    const listResponse = spec.components?.schemas?.PlatformAdminsListResponse as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(listResponse).toBeDefined();
    expect(listResponse.required).toEqual(
      expect.arrayContaining([
        'admins',
        'allowedToInvite',
        'allowedToTransfer',
        'allowedToDemote',
        'allowedToResendInvites',
      ]),
    );

    const platformAdmin = spec.components?.schemas?.PlatformAdmin as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<
        string,
        { nullable?: boolean; type?: string; format?: string; $ref?: string }
      >;
    };
    expect(platformAdmin).toBeDefined();
    expect(platformAdmin.additionalProperties).toBe(false);
    expect(platformAdmin.properties?.authStatus?.$ref).toBe('#/components/schemas/AuthStatus');
    expect(platformAdmin.required).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(platformAdmin.properties?.inviteId?.nullable).toBe(true);
    expect(platformAdmin.properties?.invitationStatus?.nullable).toBe(true);

    const allowedActions = spec.components?.schemas?.PlatformAdminAllowedActions as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<string, unknown>;
    };
    expect(allowedActions).toBeDefined();
    expect(allowedActions.additionalProperties).toBe(false);
    expect(allowedActions.required).toEqual(
      expect.arrayContaining(['canTransferSuperAdmin', 'canDemote', 'canResendInvite']),
    );

    const roleEnum = spec.components?.schemas?.PlatformAdminRole as { enum?: string[] };
    expect(roleEnum?.enum).toEqual(['SUPER_ADMIN', 'NORMAL_ADMIN']);

    const statusEnum = spec.components?.schemas?.PlatformAdminStatus as { enum?: string[] };
    expect(statusEnum?.enum).toEqual(['ACTIVE', 'DISABLED']);

    const invitationStatusEnum = spec.components?.schemas?.PlatformAdminInvitationStatus as {
      enum?: string[];
    };
    expect(invitationStatusEnum?.enum).toEqual([
      'PENDING',
      'SENT',
      'FAILED_TO_SEND',
      'ACCEPTED',
      'COMPLETED',
      'EXPIRED',
      'REVOKED',
      'REJECTED',
      'PENDING_UPGRADE',
    ]);

    const platformAdminsList = spec.components?.schemas?.PlatformAdminsListResponse as {
      additionalProperties?: boolean;
    };
    expect(platformAdminsList?.additionalProperties).toBe(false);

    const inviteRequest = spec.components?.schemas?.InvitePlatformAdminRequest as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: {
        email?: { minLength?: number; maxLength?: number };
        firstName?: { minLength?: number; maxLength?: number };
        lastName?: { minLength?: number; maxLength?: number };
        confirmUpgrade?: unknown;
      };
    };
    expect(inviteRequest).toBeDefined();
    expect(inviteRequest.required).toEqual(['email']);
    expect(inviteRequest.additionalProperties).toBe(false);
    expect(inviteRequest.properties?.email?.minLength).toBe(1);
    expect(inviteRequest.properties?.email?.maxLength).toBe(254);
    expect(inviteRequest.properties?.firstName?.minLength).toBe(1);
    expect(inviteRequest.properties?.firstName?.maxLength).toBe(100);
    expect(inviteRequest.properties?.lastName?.minLength).toBe(1);
    expect(inviteRequest.properties?.lastName?.maxLength).toBe(100);
    expect(inviteRequest.properties).toHaveProperty('confirmUpgrade');

    const inviteResponse = spec.components?.schemas?.InvitePlatformAdminResponse as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: { type?: { enum?: string[] } };
    };
    expect(inviteResponse).toBeDefined();
    expect(inviteResponse.required).toEqual(['type', 'userId', 'email']);
    expect(inviteResponse.additionalProperties).toBe(false);
    expect(inviteResponse.properties?.type?.enum).toEqual(['new-invite', 'upgrade-confirmation']);

    const resendResponse = spec.components?.schemas?.ResendPlatformAdminInviteResponse as {
      required?: string[];
      additionalProperties?: boolean;
    };
    expect(resendResponse).toBeDefined();
    expect(resendResponse.required).toEqual(['success', 'emailQueued']);
    expect(resendResponse.additionalProperties).toBe(false);

    const transferRequest = spec.components?.schemas?.TransferSuperAdminRequest as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: {
        password?: { minLength?: number };
        confirmation?: { enum?: string[] };
      };
    };
    expect(transferRequest).toBeDefined();
    expect(transferRequest.required).toEqual(['targetUserId', 'password', 'confirmation']);
    expect(transferRequest.additionalProperties).toBe(false);
    expect(transferRequest.properties?.password?.minLength).toBe(1);
    expect(transferRequest.properties?.confirmation?.enum).toEqual(['TRANSFER']);

    const demoteRequest = spec.components?.schemas?.DemotePlatformAdminRequest as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: {
        password?: { minLength?: number };
        confirmation?: { enum?: string[] };
      };
    };
    expect(demoteRequest).toBeDefined();
    expect(demoteRequest.required).toEqual(['password', 'confirmation']);
    expect(demoteRequest.additionalProperties).toBe(false);
    expect(demoteRequest.properties?.password?.minLength).toBe(1);
    expect(demoteRequest.properties?.confirmation?.enum).toEqual(['DEMOTE']);

    const demoteResponse = spec.components?.schemas?.DemotePlatformAdminResponse as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: {
        adminStatus?: { enum?: string[] };
        authStatus?: { $ref?: string };
      };
    };
    expect(demoteResponse).toBeDefined();
    expect(demoteResponse.required).toEqual(['userId', 'email', 'adminStatus', 'authStatus']);
    expect(demoteResponse.additionalProperties).toBe(false);
    expect(demoteResponse.properties?.adminStatus?.enum).toEqual(['DISABLED']);
    expect(demoteResponse.properties?.authStatus?.$ref).toBe('#/components/schemas/AuthStatus');

    expect(spec.components?.requestBodies).toHaveProperty('InvitePlatformAdmin');
    expect(spec.components?.requestBodies).toHaveProperty('TransferSuperAdmin');
    expect(spec.components?.requestBodies).toHaveProperty('DemotePlatformAdmin');

    expect(spec.components?.responses).toHaveProperty('PlatformAdminsListOk');
    expect(spec.components?.responses).toHaveProperty('InvitePlatformAdminCreated');
    expect(spec.components?.responses).toHaveProperty('ResendPlatformAdminInviteOk');
    expect(spec.components?.responses).toHaveProperty('TransferSuperAdminOk');
    expect(spec.components?.responses).toHaveProperty('DemotePlatformAdminOk');

    const inviteCreatedResponse = spec.components?.responses?.InvitePlatformAdminCreated as {
      description?: string;
    };
    expect(inviteCreatedResponse?.description).toContain(
      'invitation or upgrade request created successfully',
    );

    const resendOkResponse = spec.components?.responses?.ResendPlatformAdminInviteOk as {
      description?: string;
    };
    expect(resendOkResponse?.description).toContain('emailQueued');

    expectSchemaNotToContain('PlatformAdmin', ['passwordHash', 'password', 'tokenHash']);
    expectSchemaNotToContain('InvitePlatformAdminResponse', [
      'passwordHash',
      'password',
      'tokenHash',
    ]);
    expectSchemaNotToContain('DemotePlatformAdminResponse', [
      'passwordHash',
      'password',
      'tokenHash',
    ]);
  });

  it('documents organisation campaign statistics OpenAPI contracts with full required, nullable, integer percentage, and capability parity', () => {
    const routePath = '/organisations/{organisationId}/campaigns/{campaignId}/statistics';
    expectPathExists(routePath, 'get');
    expectBearerAuth(routePath, 'get');

    const routeDoc = getPath(routePath, 'get');
    expect(routeDoc).toBeDefined();

    const responseSchema = spec.components?.schemas?.GetCampaignStatisticsResponse as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<string, unknown>;
    };
    expect(responseSchema).toBeDefined();
    expect(responseSchema.additionalProperties).toBe(false);
    expect(responseSchema.required).toEqual(
      expect.arrayContaining(['campaign', 'summary', 'trainees', 'pagination']),
    );

    const campaignSchema = spec.components?.schemas?.CampaignStatisticsCampaign as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<
        string,
        {
          type?: string;
          format?: string;
          nullable?: boolean;
          enum?: string[];
          minimum?: number;
        }
      >;
    };
    expect(campaignSchema).toBeDefined();
    expect(campaignSchema.additionalProperties).toBe(false);
    expect(campaignSchema.required).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'description',
        'campaignType',
        'status',
        'startDate',
        'endDate',
        'itemCount',
        'quizCount',
      ]),
    );
    expect(campaignSchema.properties?.description?.nullable).toBe(true);
    expect(campaignSchema.properties?.startDate?.nullable).toBe(true);
    expect(campaignSchema.properties?.endDate?.nullable).toBe(true);
    expect(campaignSchema.properties?.itemCount?.minimum).toBe(0);
    expect(campaignSchema.properties?.quizCount?.minimum).toBe(0);
    expect(campaignSchema.properties?.campaignType?.enum).toEqual([
      'PREMADE_GENERAL',
      'ORGANISATION_CUSTOM',
    ]);
    expect(campaignSchema.properties?.status?.enum).toEqual([
      'DRAFT',
      'ACTIVE',
      'PAUSED',
      'COMPLETED',
      'ARCHIVED',
    ]);

    const summarySchema = spec.components?.schemas?.CampaignStatisticsSummary as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<
        string,
        {
          type?: string;
          nullable?: boolean;
          minimum?: number;
          maximum?: number;
        }
      >;
    };
    expect(summarySchema).toBeDefined();
    expect(summarySchema.additionalProperties).toBe(false);
    expect(summarySchema.required).toEqual(
      expect.arrayContaining([
        'assignedTraineeCount',
        'startedTraineeCount',
        'completedTraineeCount',
        'overallProgressPercentage',
        'averageQuizScorePercentage',
      ]),
    );
    expect(summarySchema.properties?.assignedTraineeCount?.minimum).toBe(0);
    expect(summarySchema.properties?.startedTraineeCount?.minimum).toBe(0);
    expect(summarySchema.properties?.completedTraineeCount?.minimum).toBe(0);
    expect(summarySchema.properties?.overallProgressPercentage?.nullable).toBe(true);
    expect(summarySchema.properties?.overallProgressPercentage?.minimum).toBe(0);
    expect(summarySchema.properties?.overallProgressPercentage?.maximum).toBe(100);
    expect(summarySchema.properties?.averageQuizScorePercentage?.nullable).toBe(true);
    expect(summarySchema.properties?.averageQuizScorePercentage?.minimum).toBe(0);
    expect(summarySchema.properties?.averageQuizScorePercentage?.maximum).toBe(100);

    const progressSchema = spec.components?.schemas?.CampaignStatisticsTraineeProgress as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<
        string,
        {
          type?: string;
          minimum?: number;
          maximum?: number;
        }
      >;
    };
    expect(progressSchema).toBeDefined();
    expect(progressSchema.additionalProperties).toBe(false);
    expect(progressSchema.required).toEqual(
      expect.arrayContaining(['completedItemCount', 'totalItemCount', 'progressPercentage']),
    );
    expect(progressSchema.properties?.completedItemCount?.minimum).toBe(0);
    expect(progressSchema.properties?.totalItemCount?.minimum).toBe(0);
    expect(progressSchema.properties?.progressPercentage?.minimum).toBe(0);
    expect(progressSchema.properties?.progressPercentage?.maximum).toBe(100);

    const actionsSchema = spec.components?.schemas?.CampaignStatisticsTraineeActions as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<string, { type?: string }>;
    };
    expect(actionsSchema).toBeDefined();
    expect(actionsSchema.additionalProperties).toBe(false);
    expect(actionsSchema.required).toEqual(expect.arrayContaining(['canUnassign']));
    expect(actionsSchema.properties?.canUnassign?.type).toBe('boolean');

    const traineeRowSchema = spec.components?.schemas?.CampaignStatisticsTraineeRow as {
      required?: string[];
      additionalProperties?: boolean;
      properties?: Record<
        string,
        {
          type?: string;
          format?: string;
          nullable?: boolean;
          enum?: string[];
          minimum?: number;
          maximum?: number;
        }
      >;
    };
    expect(traineeRowSchema).toBeDefined();
    expect(traineeRowSchema.additionalProperties).toBe(false);
    expect(traineeRowSchema.required).toEqual(
      expect.arrayContaining([
        'assignmentId',
        'traineeProfileId',
        'displayName',
        'email',
        'traineeStatus',
        'assignmentStatus',
        'accessType',
        'assignedAt',
        'progress',
        'completedQuizCount',
        'totalQuizCount',
        'averageQuizScorePercentage',
        'allowedActions',
      ]),
    );
    expect(traineeRowSchema.properties?.traineeStatus?.enum).toEqual([
      'ACTIVE',
      'INACTIVE',
      'DISABLED',
    ]);
    expect(traineeRowSchema.properties?.assignmentStatus?.enum).toEqual([
      'AVAILABLE',
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
    ]);
    expect(traineeRowSchema.properties?.accessType?.enum).toEqual(['ASSIGNED', 'SELF_SELECTED']);
    expect(traineeRowSchema.properties?.averageQuizScorePercentage?.nullable).toBe(true);
    expect(traineeRowSchema.properties?.averageQuizScorePercentage?.minimum).toBe(0);
    expect(traineeRowSchema.properties?.averageQuizScorePercentage?.maximum).toBe(100);

    expect(spec.components?.responses).toHaveProperty('GetCampaignStatisticsOk');

    expectSchemaNotToContain('CampaignStatisticsCampaign', ['password', 'passwordHash', 'prisma']);
    expectSchemaNotToContain('CampaignStatisticsTraineeRow', [
      'password',
      'passwordHash',
      'answers',
      'selectedClassification',
    ]);
  });
});
