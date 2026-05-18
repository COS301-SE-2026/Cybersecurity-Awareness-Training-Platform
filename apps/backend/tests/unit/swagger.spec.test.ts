import { describe, expect, it } from 'vitest';
import { swaggerSpec } from '../../src/config/swagger.js';

interface SwaggerSpecShape {
  openapi?: string;
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

describe('swaggerSpec', () => {
  const spec = swaggerSpec as SwaggerSpecShape;

  function expectComponentSchemas(schemaNames: string[]) {
    for (const schemaName of schemaNames) {
      expect(spec.components?.schemas).toHaveProperty(schemaName);
    }
  }

  function expectPaths(paths: string[]) {
    for (const path of paths) {
      expect(spec.paths).toHaveProperty(path);
    }
  }

  function expectSchemaNotToContain(schemaName: string, forbiddenTerms: string[]) {
    const serializedSchema = JSON.stringify(spec.components?.schemas?.[schemaName]);

    for (const term of forbiddenTerms) {
      expect(serializedSchema).not.toContain(term);
    }
  }

  it('generates the base OpenAPI spec with health docs and shared components', () => {
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expectPaths(['/health']);
    expectComponentSchemas(['HealthStatus', 'ApiErrorResponse']);
    expect(spec.components?.securitySchemes).toHaveProperty('bearerAuth');
  });

  it('includes reusable auth schemas without exposing password hashes', () => {
    expectComponentSchemas([
      'AuthRegisterRequest',
      'AuthLoginRequest',
      'AuthRegisterResponse',
      'AuthLoginResponse',
      'AuthMeResponse',
      'AuthRateLimitErrorResponse',
      'UserType',
      'AuthStatus',
    ]);
    expectSchemaNotToContain('PublicUser', ['passwordHash']);
  });

  it('includes the mounted auth paths', () => {
    expectPaths(['/auth/register', '/auth/login', '/auth/me']);
  });

  it('includes reusable trainee training schemas', () => {
    expectComponentSchemas([
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
    ]);
    expectSchemaNotToContain('GetTrainingDocumentResponse', ['TrainingProgress', 'quiz']);
  });

  it('includes the mounted trainee training paths', () => {
    expectPaths([
      '/trainee/campaign-items/{campaignItemId}/training-document',
      '/trainee/campaign-items/{campaignItemId}/training-document/viewed',
      '/trainee/campaign-items/{campaignItemId}/training-document/completed',
    ]);
  });

  it('includes reusable trainee simulation schemas without leaking classification answers', () => {
    expectComponentSchemas([
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
    ]);
    expectSchemaNotToContain('SimulatedEmailDetail', ['expectedClassification', 'redFlags']);
  });

  it('includes the mounted trainee simulation paths', () => {
    expectPaths([
      '/trainee/campaign-items/{campaignItemId}/simulated-inbox',
      '/trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}',
      '/trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}/interactions',
      '/trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}/classification',
    ]);
  });

  it('includes reusable trainee quiz schemas without leaking pre-submission answers', () => {
    expectComponentSchemas([
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
    ]);
    expect(spec.components?.securitySchemes).toHaveProperty('bearerAuth');
    expectSchemaNotToContain('GetQuizResponse', ['isCorrect', 'feedbackText']);
  });

  it('includes the mounted trainee quiz paths', () => {
    expectPaths([
      '/trainee/campaign-items/{campaignItemId}/quiz',
      '/trainee/campaign-items/{campaignItemId}/quiz/attempts',
      '/quiz-attempts/{attemptId}/submit',
      '/quiz-attempts/{attemptId}/results',
    ]);
  });
});
