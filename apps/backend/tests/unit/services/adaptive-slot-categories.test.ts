import { describe, expect, it } from 'vitest';
import { sharedAdaptiveSlotCategories } from '../../../src/services/adaptive-slot-categories.js';

const phishing = 'PHISHING_AND_SUSPICIOUS_MESSAGES' as const;
const links = 'LINKS_DOMAINS_AND_SENDER_VERIFICATION' as const;
const passwords = 'PASSWORDS_AND_AUTHENTICATION' as const;

describe('adaptive slot category sets', () => {
  it('accepts equal non-empty sets regardless of order or duplicates', () => {
    expect(
      sharedAdaptiveSlotCategories([
        [phishing, links, phishing],
        [links, phishing],
        [phishing, links],
      ]),
    ).toEqual([phishing, links]);
  });

  it('rejects mismatched category sets', () => {
    expect(sharedAdaptiveSlotCategories([[phishing], [passwords], [phishing]])).toBeNull();
  });

  it('rejects empty category sets', () => {
    expect(sharedAdaptiveSlotCategories([[], [], []])).toBeNull();
  });
});
