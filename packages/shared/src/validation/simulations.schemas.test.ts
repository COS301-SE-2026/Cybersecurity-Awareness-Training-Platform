import { describe, expect, it } from 'vitest';
import { recordSimulatedEmailInteractionRequestSchema } from './simulations.schemas.js';

describe('simulation validation schemas', () => {
  it('accepts supported simulated email interaction events', () => {
    expect(
      recordSimulatedEmailInteractionRequestSchema.safeParse({
        eventType: 'EMAIL_OPENED',
      }).success,
    ).toBe(true);

    expect(
      recordSimulatedEmailInteractionRequestSchema.safeParse({
        eventType: 'EMAIL_LINK_CLICKED',
      }).success,
    ).toBe(true);
  });

  it('rejects the old generic link-clicked event name', () => {
    const result = recordSimulatedEmailInteractionRequestSchema.safeParse({
      eventType: 'LINK_CLICKED',
    });

    expect(result.success).toBe(false);
  });
});
