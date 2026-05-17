import { describe, expect, it } from 'vitest';
import { recordTrainingInteractionRequestSchema } from './training.schemas.js';

describe('training validation schemas', () => {
  it('accepts training interaction events with campaign context', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      eventType: 'TRAINING_VIEWED',
      campaignAssignmentId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.success).toBe(true);
  });

  it('rejects interaction payloads without an event type', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      campaignAssignmentId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.success).toBe(false);
  });
});
