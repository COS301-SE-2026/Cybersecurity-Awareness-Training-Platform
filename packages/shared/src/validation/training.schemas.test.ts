import { describe, expect, it } from 'vitest';
import { recordTrainingProgressRequestSchema } from './training.schemas.js';

describe('training validation schemas', () => {
  it('accepts progress states learners can record', () => {
    expect(
      recordTrainingProgressRequestSchema.safeParse({
        status: 'STARTED',
      }).success,
    ).toBe(true);

    expect(
      recordTrainingProgressRequestSchema.safeParse({
        status: 'VIEWED',
      }).success,
    ).toBe(true);

    expect(
      recordTrainingProgressRequestSchema.safeParse({
        status: 'COMPLETED',
      }).success,
    ).toBe(true);
  });

  it('rejects NOT_STARTED for progress recording', () => {
    const result = recordTrainingProgressRequestSchema.safeParse({
      status: 'NOT_STARTED',
    });

    expect(result.success).toBe(false);
  });

  it('rejects internal storage states for progress recording', () => {
    const result = recordTrainingProgressRequestSchema.safeParse({
      status: 'IN_PROGRESS',
    });

    expect(result.success).toBe(false);
  });
});
