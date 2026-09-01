import { describe, expect, it } from 'vitest';
import { summariseAuthSessionMetadata } from '../../src/services/auth-session-metadata.service.js';

const userAgents = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile Safari/604.1',
} as const;

describe('summariseAuthSessionMetadata', () => {
  it.each([
    ['Chrome on Windows', userAgents.chromeWindows, 'Windows · Chrome'],
    ['Edge on Windows', userAgents.edgeWindows, 'Windows · Edge'],
    ['Safari on macOS', userAgents.safariMac, 'macOS · Safari'],
    ['Firefox on Linux', userAgents.firefoxLinux, 'Linux · Firefox'],
    ['Chrome on Android', userAgents.chromeAndroid, 'Android · Chrome'],
    ['Safari on iOS', userAgents.safariIos, 'iOS · Safari'],
  ])('classifies %s conservatively', (_name, userAgent, expected) => {
    expect(summariseAuthSessionMetadata(userAgent)).toEqual({
      deviceSummary: expected,
      locationSummary: null,
    });
  });

  it.each([undefined, null, '', '   ', 'custom-client/private-build'])(
    'uses fixed fallback labels for missing or unknown input',
    (userAgent) => {
      expect(summariseAuthSessionMetadata(userAgent)).toEqual({
        deviceSummary: 'Unknown device · Unknown browser',
        locationSummary: null,
      });
    },
  );

  it('does not include raw unknown user-agent content in the summary', () => {
    const rawUserAgent = 'private-client-name/42.7 confidential-fragment';
    const result = summariseAuthSessionMetadata(rawUserAgent);

    expect(result.deviceSummary).not.toContain(rawUserAgent);
    expect(JSON.stringify(result)).not.toContain('confidential-fragment');
  });
});
