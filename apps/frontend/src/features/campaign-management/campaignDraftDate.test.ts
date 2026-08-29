import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fromDateTimeLocal, toDateTimeLocal } from './campaignDraftDate';

describe('campaign Draft date conversion', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'Africa/Johannesburg');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('converts a UTC instant to its browser-local datetime value', () => {
    expect(toDateTimeLocal('2026-09-01T08:00:00.000Z')).toBe('2026-09-01T10:00');
  });

  it('returns blank for missing or invalid UTC dates', () => {
    expect(toDateTimeLocal(null)).toBe('');
    expect(toDateTimeLocal('invalid')).toBe('');
  });

  it('returns null for an empty local datetime', () => {
    expect(fromDateTimeLocal('')).toBeNull();
  });

  it('converts a valid browser-local datetime to UTC', () => {
    expect(fromDateTimeLocal('2026-09-01T10:00')).toBe('2026-09-01T08:00:00.000Z');
  });

  it('returns null for an invalid local datetime', () => {
    expect(fromDateTimeLocal('invalid')).toBeNull();
  });
});
