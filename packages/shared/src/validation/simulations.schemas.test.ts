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
      selectedRedFlagIds: ['red-flag-1'],
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
    });

    expect(result.success).toBe(true);
  });
});
