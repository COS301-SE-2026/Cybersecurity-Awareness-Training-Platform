import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createJsonResponse,
  setupHttpTest,
  teardownHttpTest,
} from '../../lib/testing/httpTestUtils';
import { recordPhishingPortalInteraction, resolvePhishingPortal } from './phishingPortalClient';

const fetchMock = vi.fn();
const token = 'opaque/token?';

describe('phishing portal client', () => {
  beforeEach(() => {
    setupHttpTest(fetchMock, { token: 'signed-in-token' });
  });

  afterEach(() => {
    teardownHttpTest();
  });

  it('resolves an encoded public token without authentication', async () => {
    const response = {
      state: 'ACTIVE',
      portal: {
        templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        heading: 'Sign in to your account',
        identifierLabel: 'Email address or username',
        credentialLabel: 'Password',
        submitLabel: 'Sign in',
      },
    } as const;
    fetchMock.mockResolvedValue(createJsonResponse(response));

    await expect(resolvePhishingPortal(token)).resolves.toEqual(response);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/public/phishing-portals/opaque%2Ftoken%3F',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(new Headers(request?.headers).has('authorization')).toBe(false);
  });

  it('posts only the approved interaction request without authentication', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ accepted: true, reveal: null }));

    await expect(
      recordPhishingPortalInteraction(token, {
        eventType: 'PORTAL_VISITED',
        clientEventId: 'event-1',
      }),
    ).resolves.toEqual({ accepted: true, reveal: null });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/public/phishing-portals/opaque%2Ftoken%3F/interactions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(request?.body).toBe(
      JSON.stringify({ eventType: 'PORTAL_VISITED', clientEventId: 'event-1' }),
    );
    expect(new Headers(request?.headers).has('authorization')).toBe(false);
  });

  it('rejects unexpected interaction fields before sending a request', async () => {
    await expect(
      recordPhishingPortalInteraction(token, {
        eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
        clientEventId: 'event-2',
        password: 'must-stay-local',
      } as never),
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a response outside the shared public contract', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        state: 'ACTIVE',
        portal: {
          templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
          heading: 'Sign in',
          identifierLabel: 'Username',
          credentialLabel: 'Password',
          submitLabel: 'Continue',
          destinationUrl: 'https://example.test',
        },
      }),
    );

    await expect(resolvePhishingPortal(token)).rejects.toThrow();
  });
});
