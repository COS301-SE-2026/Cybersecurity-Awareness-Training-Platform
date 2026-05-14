import { describe, expect, it } from 'vitest';
import { recordTrainingInteractionRequestSchema } from './training.schemas.js';

describe('training validation schemas', () => {
  it('accepts training interaction events with campaign context', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      eventType: 'TRAINING_VIEWED',
      campaignAssignmentId: 'assignment-1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects interaction payloads without an event type', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      campaignAssignmentId: 'assignment-1',
    });

    expect(result.success).toBe(false);
  });
});
