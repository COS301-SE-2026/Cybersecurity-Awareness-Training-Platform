import { describe, expect, it } from 'vitest';
import {
  classifySimulatedEmailRequestSchema,
  recordSimulatedEmailInteractionRequestSchema,
} from './simulations.schemas.js';

describe('simulation validation schemas', () => {
  it('accepts supported simulated email interaction events', () => {
    expect(
      recordSimulatedEmailInteractionRequestSchema.safeParse({
        eventType: 'SIMULATED_EMAIL_OPENED',
      }).success,
    ).toBe(true);

    expect(
      recordSimulatedEmailInteractionRequestSchema.safeParse({
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      }).success,
    ).toBe(true);
  });

  it('accepts campaign-scoped email classifications', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'PHISHING',
      selectedRedFlagIds: ['11111111-1111-1111-1111-111111111111'],
      campaignAssignmentId: '22222222-2222-2222-2222-222222222222',
      campaignItemId: '33333333-3333-3333-3333-333333333333',
    });

    expect(result.success).toBe(true);
  });
});
