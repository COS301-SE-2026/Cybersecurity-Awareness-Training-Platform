import { describe, expect, it } from 'vitest';
import { recordTrainingInteractionRequestSchema } from './training.schemas.js';

describe('training validation schemas', () => {
  it('accepts training interaction events with campaign context', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      eventType: 'TRAINING_VIEWED',
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects old progress-state payloads', () => {
    const result = recordTrainingInteractionRequestSchema.safeParse({
      status: 'IN_PROGRESS',
    });

    expect(result.success).toBe(false);
  });
});
