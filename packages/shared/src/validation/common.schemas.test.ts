import { describe, expect, it } from 'vitest';
import { idParamSchema } from './common.schemas.js';

describe('common validation schemas', () => {
  it('accepts and trims UUID values', () => {
    const result = idParamSchema.parse(' 11111111-1111-4111-8111-111111111111 ');

    expect(result).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('rejects non-UUID values', () => {
    const result = idParamSchema.safeParse('not-a-uuid');

    expect(result.success).toBe(false);
  });
});
