import { describe, expect, it } from 'vitest';
import { recordTrainingInteractionRequestSchema } from './training.schemas.js';

describe('training validation schemas', () => {
  it('accepts empty training interaction payloads', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('ignores unknown safe fields in training interaction payloads', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      clientTime: '2026-05-16T10:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });
});
