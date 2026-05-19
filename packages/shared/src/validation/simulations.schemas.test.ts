import { describe, expect, it } from 'vitest';
import {
  classifySimulatedEmailRequestSchema,
  getSimulatedEmailRequestParamsSchema,
  getSimulatedInboxRequestParamsSchema,
  recordSimulatedEmailInteractionRequestSchema,
} from './simulations.schemas.js';

describe('simulation validation schemas', () => {
  const campaignItemId = '11111111-1111-4111-8111-111111111111';
  const emailId = '22222222-2222-4222-8222-222222222222';

  it('accepts UUID simulated inbox route params', () => {
    const result = getSimulatedInboxRequestParamsSchema.safeParse({
      campaignItemId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed simulated inbox route params', () => {
    const result = getSimulatedInboxRequestParamsSchema.safeParse({
      campaignItemId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unexpected simulated inbox route params', () => {
    const result = getSimulatedInboxRequestParamsSchema.safeParse({
      campaignItemId,
      emailId,
    });

    expect(result.success).toBe(false);
  });

  it('accepts UUID simulated email route params', () => {
    const result = getSimulatedEmailRequestParamsSchema.safeParse({
      campaignItemId,
      emailId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed simulated email route params', () => {
    const result = getSimulatedEmailRequestParamsSchema.safeParse({
      campaignItemId,
      emailId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

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

  it('rejects unsupported simulated email interaction events', () => {
    const result = recordSimulatedEmailInteractionRequestSchema.safeParse({
      eventType: 'TRAINING_VIEWED',
    });

    expect(result.success).toBe(false);
  });

  it('rejects simulated email interaction payloads with unexpected fields', () => {
    const result = recordSimulatedEmailInteractionRequestSchema.safeParse({
      eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      campaignItemId,
    });

    expect(result.success).toBe(false);
  });

  it('accepts campaign-scoped email classifications', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'PHISHING',
      selectedRedFlagIds: ['11111111-1111-1111-1111-111111111111'],
    });

    expect(result.success).toBe(true);
  });

  it('trims optional classification free text', () => {
    const result = classifySimulatedEmailRequestSchema.parse({
      selectedClassification: 'SUSPICIOUS',
      freeTextReason: '  Urgent tone and suspicious link  ',
    });

    expect(result.freeTextReason).toBe('Urgent tone and suspicious link');
  });

  it('rejects invalid classification values and red flag IDs', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'MAYBE',
      selectedRedFlagIds: ['not-a-uuid'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects classification payloads with unexpected fields', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'SAFE',
      expectedClassification: 'PHISHING',
    });

    expect(result.success).toBe(false);
  });
});
