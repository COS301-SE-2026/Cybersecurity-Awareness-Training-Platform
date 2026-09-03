import { describe, expect, it } from 'vitest';
import { toTitleCase } from '../text.utils';

describe('toTitleCase', () => {
  it('title-cases ordinary words', () => {
    expect(toTitleCase('using multi-factor authentication in daily work')).toBe(
      'Using Multi-factor Authentication In Daily Work',
    );
  });

  it('preserves fully uppercase words and acronym sequences', () => {
    expect(toTitleCase("use MFA safely with MFA-enabled tools and MFA's settings")).toBe(
      "Use MFA Safely With MFA-enabled Tools And MFA's Settings",
    );
  });
});
