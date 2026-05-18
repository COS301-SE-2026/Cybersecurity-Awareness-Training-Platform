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
});
