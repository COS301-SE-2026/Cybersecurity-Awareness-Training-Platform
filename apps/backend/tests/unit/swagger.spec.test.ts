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

  it('generates the base OpenAPI spec with health docs and shared components', () => {
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.paths).toHaveProperty('/health');
    expect(spec.components?.schemas).toHaveProperty('HealthStatus');
    expect(spec.components?.schemas).toHaveProperty('ApiErrorResponse');
    expect(spec.components?.securitySchemes).toHaveProperty('bearerAuth');
  });

  it('includes reusable auth schemas without exposing password hashes', () => {
    expect(spec.components?.schemas).toHaveProperty('AuthRegisterRequest');
    expect(spec.components?.schemas).toHaveProperty('AuthLoginRequest');
    expect(spec.components?.schemas).toHaveProperty('AuthRegisterResponse');
    expect(spec.components?.schemas).toHaveProperty('AuthLoginResponse');
    expect(spec.components?.schemas).toHaveProperty('AuthMeResponse');
    expect(spec.components?.schemas).toHaveProperty('AuthRateLimitErrorResponse');
    expect(spec.components?.schemas).toHaveProperty('UserType');
    expect(spec.components?.schemas).toHaveProperty('AuthStatus');
    expect(JSON.stringify(spec.components?.schemas?.PublicUser)).not.toContain('passwordHash');
  });

  it('includes the mounted auth paths', () => {
    expect(spec.paths).toHaveProperty('/auth/register');
    expect(spec.paths).toHaveProperty('/auth/login');
    expect(spec.paths).toHaveProperty('/auth/me');
  });

  it('includes reusable trainee training schemas', () => {
    expect(spec.components?.schemas).toHaveProperty('TrainingDocument');
    expect(spec.components?.schemas).toHaveProperty('TrainingCampaignItemContext');
    expect(spec.components?.schemas).toHaveProperty('GetTrainingDocumentResponse');
    expect(spec.components?.schemas).toHaveProperty('RecordTrainingInteractionResponse');
    expect(spec.components?.schemas).toHaveProperty('TrainingInteractionEvent');
    expect(spec.components?.schemas).toHaveProperty('EmptyRequestBody');
    expect(spec.components?.schemas).toHaveProperty('TrainingContentType');
    expect(spec.components?.schemas).toHaveProperty('DifficultyLevel');
    expect(spec.components?.schemas).toHaveProperty('TrainingDocumentStatus');
    expect(spec.components?.schemas).toHaveProperty('TrainingInteractionEventType');
    expect(JSON.stringify(spec.components?.schemas?.GetTrainingDocumentResponse)).not.toContain(
      'TrainingProgress',
    );
    expect(JSON.stringify(spec.components?.schemas?.GetTrainingDocumentResponse)).not.toContain(
      'quiz',
    );
  });

  it('includes the mounted trainee training paths', () => {
    expect(spec.paths).toHaveProperty('/trainee/campaign-items/{campaignItemId}/training-document');
    expect(spec.paths).toHaveProperty(
      '/trainee/campaign-items/{campaignItemId}/training-document/viewed',
    );
    expect(spec.paths).toHaveProperty(
      '/trainee/campaign-items/{campaignItemId}/training-document/completed',
    );
  });
});
