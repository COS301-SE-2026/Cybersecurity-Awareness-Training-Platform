export type SessionMetadataSummary = {
  deviceSummary: string;
  locationSummary: null;
};

const UNKNOWN_DEVICE = 'Unknown device';
const UNKNOWN_BROWSER = 'Unknown browser';

function detectPlatform(userAgent: string): string {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return UNKNOWN_DEVICE;
}

function detectBrowser(userAgent: string): string {
  if (/EdgA?|EdgiOS|Edge/i.test(userAgent)) return 'Edge';
  if (/CriOS|Chrome/i.test(userAgent)) return 'Chrome';
  if (/FxiOS|Firefox/i.test(userAgent)) return 'Firefox';
  if (/Safari/i.test(userAgent)) return 'Safari';
  return UNKNOWN_BROWSER;
}

export function summariseAuthSessionMetadata(
  userAgent: string | null | undefined,
): SessionMetadataSummary {
  const normalizedUserAgent = userAgent?.trim();
  const device = normalizedUserAgent ? detectPlatform(normalizedUserAgent) : UNKNOWN_DEVICE;
  const browser = normalizedUserAgent ? detectBrowser(normalizedUserAgent) : UNKNOWN_BROWSER;

  return {
    deviceSummary: `${device} · ${browser}`,
    locationSummary: null,
  };
}
