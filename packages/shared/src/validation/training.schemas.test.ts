import { describe, expect, it } from 'vitest';
import {
  getTrainingDocumentRequestParamsSchema,
  recordTrainingInteractionRequestSchema,
} from './training.schemas.js';

describe('training validation schemas', () => {
  it('accepts empty training interaction payloads', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('accepts omitted training interaction payloads', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse(undefined);

    expect(result.success).toBe(true);
  });

  it('rejects unknown fields in training interaction payloads', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      clientTime: '2026-05-16T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('accepts UUID campaign item ids', () => {
    const result = getTrainingDocumentRequestParamsSchema.safeParse({
      campaignItemId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.success).toBe(true);
  });

  it('rejects non-UUID campaign item ids', () => {
    const result = getTrainingDocumentRequestParamsSchema.safeParse({
      campaignItemId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });
});
