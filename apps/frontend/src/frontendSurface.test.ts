import { describe, expect, it } from 'vitest';
import { isOrdinaryApplicationOrigin } from './frontendSurface';

describe('frontend origin selection', () => {
  it.each([
    ['https://insightfulphish.co.za/login', 'https://insightfulphish.co.za'],
    ['https://insightfulphish.co.za:443/campaigns', 'https://INSIGHTFULPHISH.CO.ZA/'],
    ['http://localhost:5173/login', 'http://localhost:5173'],
  ])('accepts the exact ordinary origin for %s', (browserHref, configuredOrigin) => {
    expect(isOrdinaryApplicationOrigin(browserHref, configuredOrigin)).toBe(true);
  });

  it.each([
    ['https://insightfulphish.co.za.attacker.example/login', 'https://insightfulphish.co.za'],
    ['https://phish.insightfulphish.co.za/login', 'https://insightfulphish.co.za'],
    ['http://insightfulphish.co.za/login', 'https://insightfulphish.co.za'],
    ['https://insightfulphish.co.za:8443/login', 'https://insightfulphish.co.za'],
    ['http://localhost:5174/login', 'http://localhost:5173'],
    ['https://insightfulphish.co.za/login', 'https://insightfulphish.co.za/app'],
    ['https://insightfulphish.co.za/login', 'https://user@insightfulphish.co.za'],
    ['https://insightfulphish.co.za/login', 'https://insightfulphish.co.za?surface=ordinary'],
  ])('rejects a noncanonical or invalid origin for %s', (browserHref, configuredOrigin) => {
    expect(isOrdinaryApplicationOrigin(browserHref, configuredOrigin)).toBe(false);
  });

  it('fails closed when the ordinary origin is missing or malformed', () => {
    expect(isOrdinaryApplicationOrigin('https://insightfulphish.co.za', undefined)).toBe(false);
    expect(isOrdinaryApplicationOrigin('https://insightfulphish.co.za', 'invalid')).toBe(false);
  });
});
