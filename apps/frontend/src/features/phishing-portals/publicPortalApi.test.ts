import { getPortalTemplatePresentation } from '@insightful-phish/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordPublicPortalInteraction, resolvePublicPortal } from './publicPortalApi';

describe('public portal API', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses encoded relative paths without stored authentication or configured API origin', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://ordinary-api.example.test');
    const storageRead = vi.spyOn(Storage.prototype, 'getItem');
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          state: 'ACTIVE',
          portal: getPortalTemplatePresentation('GENERIC_ACCOUNT_LOGIN_V1'),
        }),
      )
      .mockResolvedValueOnce(Response.json({ accepted: true, reveal: null }));

    await resolvePublicPortal('part/with space');
    await recordPublicPortalInteraction('part/with space', {
      eventType: 'PORTAL_VISITED',
      clientEventId: 'event-1',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/public/phishing-portals/part%2Fwith%20space',
      expect.objectContaining({ method: 'GET', credentials: 'omit', redirect: 'error' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/public/phishing-portals/part%2Fwith%20space/interactions',
      expect.objectContaining({ method: 'POST', credentials: 'omit', redirect: 'error' }),
    );
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).has('Authorization')).toBe(false);
    }
    expect(storageRead).not.toHaveBeenCalled();
    storageRead.mockRestore();
  });

  it('serializes only the allowed interaction fields', async () => {
    fetchMock.mockResolvedValue(Response.json({ accepted: true, reveal: null }));
    const interaction = {
      eventType: 'PORTAL_VISITED' as const,
      clientEventId: 'event-2',
      identifier: 'private-identifier',
      credential: 'private-credential',
    };

    await recordPublicPortalInteraction('opaque-token', interaction);

    const options = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(options?.body))).toEqual({
      eventType: 'PORTAL_VISITED',
      clientEventId: 'event-2',
    });
    expect(Object.keys(JSON.parse(String(options?.body)))).toEqual(['eventType', 'clientEventId']);
  });
});
