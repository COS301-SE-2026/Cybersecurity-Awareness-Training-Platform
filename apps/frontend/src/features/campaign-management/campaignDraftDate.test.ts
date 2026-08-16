import { describe, expect, it, vi } from 'vitest';

import { toDateTimeLocal } from './campaignDraftDate';

describe('toDateTimeLocal', () => {
  it('converts a UTC instant to its browser-local datetime value', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-120);

    expect(toDateTimeLocal('2026-09-01T08:00:00.000Z')).toBe('2026-09-01T10:00');

    vi.restoreAllMocks();
  });

  it('returns blank for missing or invalid dates', () => {
    expect(toDateTimeLocal(null)).toBe('');
    expect(toDateTimeLocal('invalid')).toBe('');
  });
});
