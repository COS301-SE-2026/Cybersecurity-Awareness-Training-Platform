import request from 'supertest';
import type { Request } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordPortalInteractionResponseSchema } from '@insightful-phish/shared';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { clearApiRateLimitStore } from '../../src/middleware/apiRateLimit.js';
import { resolveSimulationRequestHostname } from '../../src/services/simulation-public-origin.service.js';

const { phishingPortalServiceMock, portalRepositoryMock } = vi.hoisted(() => {
  class PhishingPortalInteractionUnavailableError extends Error {}

  return {
    phishingPortalServiceMock: {
      PhishingPortalInteractionUnavailableError,
      recordPhishingPortalInteraction: vi.fn(),
      resolvePhishingPortal: vi.fn(),
    },
    portalRepositoryMock: {
      createFirstPortalInteractionEvent: vi.fn(),
      createManagedPortalLink: vi.fn(),
      createPortalInteractionEvent: vi.fn(),
      findManagedPortalLinkResolutionByTokenHash: vi.fn(),
    },
  };
});

vi.mock('../../src/services/phishing-portal.service.js', () => phishingPortalServiceMock);
vi.mock('../../src/repositories/portal-persistence.repository.js', () => portalRepositoryMock);

const token = 'A'.repeat(43);
const path = `/api/public/phishing-portals/${token}`;
const interactionPath = `${path}/interactions`;

function activeResponse() {
  return {
    state: 'ACTIVE' as const,
    portal: {
      templateId: 'GENERIC_ACCOUNT_LOGIN_V1' as const,
      heading: 'Sign in to your account',
      identifierLabel: 'Email address or username',
      credentialLabel: 'Password',
      submitLabel: 'Sign in',
      warningSigns: [{ label: 'internal', description: 'internal' }],
    },
    managedPortalLinkId: 'link-1',
    traineeProfileId: 'trainee-1',
    organisationId: 'organisation-1',
    token,
    tokenHash: 'hashed-token',
  };
}

describe('public phishing portal resolver route', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearApiRateLimitStore();
    phishingPortalServiceMock.resolvePhishingPortal.mockResolvedValue(activeResponse());
    phishingPortalServiceMock.recordPhishingPortalInteraction.mockResolvedValue({
      accepted: true,
      reveal: null,
    });
  });

  it('registers the exact public GET route without requiring authentication', async () => {
    const response = await request(createApp()).get(path);

    expect(response.status).toBe(200);
    expect(phishingPortalServiceMock.resolvePhishingPortal).toHaveBeenCalledWith(token, {
      requestHostname: '127.0.0.1',
    });
    expect(await request(createApp()).get(`/public/phishing-portals/${token}`)).toMatchObject({
      status: 404,
    });
  });

  it('accepts same-origin portal interactions without reflecting the simulation origin in CORS', async () => {
    const response = await request(createApp())
      .post(interactionPath)
      .set('Host', 'simulation-one.test')
      .set('Origin', 'https://simulation-one.test')
      .send({ eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' });

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(env.FRONTEND_ORIGIN);
    expect(response.headers['access-control-allow-origin']).not.toBe('https://simulation-one.test');
    expect(phishingPortalServiceMock.recordPhishingPortalInteraction).toHaveBeenCalledWith(
      token,
      { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' },
      { requestHostname: 'simulation-one.test' },
    );
  });

  it('passes only the Express hostname as transport authority', async () => {
    await request(createApp())
      .get(`${path}?hostname=other.test&publicOrigin=https://other.test`)
      .set('Host', 'SIMULATION-ONE.TEST')
      .set('Origin', 'https://other.test');

    expect(phishingPortalServiceMock.resolvePhishingPortal).toHaveBeenCalledWith(token, {
      requestHostname: 'simulation-one.test',
    });
  });

  it('does not use an untrusted forwarded hostname when Express proxy trust is disabled', async () => {
    await request(createApp())
      .get(path)
      .set('Host', 'simulation-one.test')
      .set('X-Forwarded-Host', 'other.test');

    expect(phishingPortalServiceMock.resolvePhishingPortal).toHaveBeenCalledWith(token, {
      requestHostname: 'simulation-one.test',
    });
  });

  it('uses the trusted proxy hostname instead of a spoofed raw Host', async () => {
    const app = createApp();
    app.set('trust proxy', 1);

    await request(app)
      .get(path)
      .set('Host', 'other.test')
      .set('X-Forwarded-Host', 'simulation-one.test');

    expect(phishingPortalServiceMock.resolvePhishingPortal).toHaveBeenCalledWith(token, {
      requestHostname: 'simulation-one.test',
    });
  });

  it('rejects ambiguous trusted proxy host context for GET', async () => {
    const app = createApp();
    app.set('trust proxy', 1);

    const response = await request(app)
      .get(path)
      .set('Host', 'other.test')
      .set('X-Forwarded-Host', 'simulation-one.test, other.test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'UNAVAILABLE' });
    expect(phishingPortalServiceMock.resolvePhishingPortal).not.toHaveBeenCalled();
    expect(portalRepositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
  });

  it.each([
    [
      'forwarded host',
      [
        'Host',
        'other.test',
        'X-Forwarded-Host',
        'simulation-one.test',
        'X-Forwarded-Host',
        'other.test',
      ],
    ],
    ['host', ['Host', 'simulation-one.test', 'Host', 'other.test']],
  ])('rejects duplicate %s header fields', (_name, rawHeaders) => {
    const req = { rawHeaders, hostname: 'simulation-one.test' } as Request;

    expect(resolveSimulationRequestHostname(req)).toBeNull();
  });

  it('rejects a malformed effective hostname', async () => {
    const response = await request(createApp())
      .get(path)
      .set('Host', 'simulation-one.test@evil.test');

    expect(response.body).toEqual({ state: 'UNAVAILABLE' });
    expect(phishingPortalServiceMock.resolvePhishingPortal).not.toHaveBeenCalled();
  });

  it('returns only the canonical fixed presentation for an active link', async () => {
    const response = await request(createApp()).get(path);

    expect(response.body).toEqual({
      state: 'ACTIVE',
      portal: {
        templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        heading: 'Sign in to your account',
        identifierLabel: 'Email address or username',
        credentialLabel: 'Password',
        submitLabel: 'Sign in',
      },
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('warningSigns');
    expect(serialized).not.toContain('link-1');
    expect(serialized).not.toContain('trainee-1');
    expect(serialized).not.toContain('organisation-1');
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain('hashed-token');
    expect(portalRepositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    expect(portalRepositoryMock.findManagedPortalLinkResolutionByTokenHash).not.toHaveBeenCalled();
  });

  it.each(['UNAVAILABLE', 'INACTIVE'] as const)(
    'returns a detail-free %s response',
    async (state) => {
      phishingPortalServiceMock.resolvePhishingPortal.mockResolvedValue({
        state,
        reason: state === 'INACTIVE' ? 'REVOKED' : 'WRONG_PURPOSE',
        token,
        tokenHash: 'hashed-token',
        organisationId: 'organisation-1',
      });

      const response = await request(createApp()).get(path);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ state });
      expect(JSON.stringify(response.body)).not.toContain(token);
      expect(JSON.stringify(response.body)).not.toContain('hashed-token');
    },
  );

  it('keeps repeated active GET requests valid without controller-side consumption', async () => {
    const app = createApp();
    const first = await request(app).get(path);
    const second = await request(app).get(path);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(second.body);
    expect(phishingPortalServiceMock.resolvePhishingPortal).toHaveBeenCalledTimes(2);
    expect(portalRepositoryMock.createManagedPortalLink).not.toHaveBeenCalled();
  });

  it('maps malformed and unknown tokens to the same unavailable response', async () => {
    phishingPortalServiceMock.resolvePhishingPortal.mockResolvedValue({ state: 'UNAVAILABLE' });
    const malformedToken = 'malformed-token';
    const unknownToken = 'C'.repeat(42) + 'g';

    const malformed = await request(createApp()).get(
      `/api/public/phishing-portals/${malformedToken}`,
    );
    const unknown = await request(createApp()).get(`/api/public/phishing-portals/${unknownToken}`);

    expect(malformed.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(malformed.body).toEqual({ state: 'UNAVAILABLE' });
    expect(unknown.body).toEqual({ state: 'UNAVAILABLE' });
    expect(JSON.stringify(malformed.body)).not.toContain(malformedToken);
    expect(JSON.stringify(unknown.body)).not.toContain(unknownToken);
  });

  it('rejects oversized opaque values before invoking the service', async () => {
    const oversizedToken = 'A'.repeat(129);
    const response = await request(createApp()).get(
      `/api/public/phishing-portals/${oversizedToken}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'UNAVAILABLE' });
    expect(JSON.stringify(response.body)).not.toContain(oversizedToken);
    expect(phishingPortalServiceMock.resolvePhishingPortal).not.toHaveBeenCalled();
  });

  it('maps internal service failures through the generic safe error handler', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    phishingPortalServiceMock.resolvePhishingPortal.mockRejectedValue(
      new Error(`persistence failed for ${token} and hashed-token`),
    );

    const response = await request(createApp()).get(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(response.body)).not.toContain(token);
    expect(JSON.stringify(response.body)).not.toContain('hashed-token');
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(token);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('hashed-token');
    consoleError.mockRestore();
  });

  describe('POST interactions', () => {
    it('registers the exact public route without requiring authentication', async () => {
      const body = { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' };
      const response = await request(createApp()).post(interactionPath).send(body);

      expect(response.status).toBe(200);
      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).toHaveBeenCalledWith(
        token,
        body,
        { requestHostname: '127.0.0.1' },
      );
      expect(
        await request(createApp())
          .post(`/public/phishing-portals/${token}/interactions`)
          .send(body),
      ).toMatchObject({ status: 404 });
    });

    it.each([
      'PORTAL_VISITED',
      'PORTAL_IDENTIFIER_FIELD_INTERACTED',
      'PORTAL_CREDENTIAL_FIELD_INTERACTED',
      'CREDENTIAL_SUBMISSION_ATTEMPTED',
      'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
    ] as const)('accepts canonical browser event %s', async (eventType) => {
      const response = await request(createApp()).post(interactionPath).send({
        eventType,
        clientEventId: 'client-event-1',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ accepted: true, reveal: null });
      expect(recordPortalInteractionResponseSchema.safeParse(response.body).success).toBe(true);
      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).toHaveBeenCalledWith(
        token,
        {
          eventType,
          clientEventId: 'client-event-1',
        },
        { requestHostname: '127.0.0.1' },
      );
    });

    it.each([
      [{ eventType: 'MANAGED_LINK_REQUESTED', clientEventId: 'client-event-1' }],
      [{ eventType: 'PORTAL_VISITED' }],
      [{ eventType: 'PORTAL_VISITED', clientEventId: '' }],
      [{ eventType: 'PORTAL_VISITED', clientEventId: 'A'.repeat(201) }],
    ])('rejects invalid browser event input before service logic', async (body) => {
      const response = await request(createApp()).post(interactionPath).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
      });
      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).not.toHaveBeenCalled();
    });

    it.each([
      ['metadata', { captured: 'secret-metadata-value' }],
      ['formData', { password: 'secret-form-value' }],
      ['fields', ['secret-field-value']],
      ['fieldValues', ['secret-field-value']],
      ['value', 'secret-value'],
      ['identifier', 'secret-identifier'],
      ['username', 'secret-username'],
      ['email', 'secret@example.test'],
      ['password', 'secret-password'],
      ['credential', 'secret-credential'],
      ['credentials', ['secret-credential']],
      ['credentialHash', 'secret-credential-hash'],
      ['maskedCredential', 'masked-secret'],
      ['otp', '123456'],
      ['oneTimePin', '123456'],
      ['pin', '1234'],
      ['portalTemplateId', 'GENERIC_ACCOUNT_LOGIN_V1'],
      ['publicOrigin', 'https://other.test'],
      ['hostname', 'other.test'],
      ['host', 'other.test'],
      ['domain', 'other.test'],
      ['origin', 'https://other.test'],
      ['redirect', 'https://other.test'],
      ['redirectUrl', 'https://other.test'],
      ['destination', 'https://other.test'],
      ['organisationId', 'organisation-1'],
      ['tenantId', 'tenant-1'],
      ['traineeProfileId', 'trainee-1'],
      ['campaignId', 'campaign-1'],
      ['campaignAssignmentId', 'assignment-1'],
      ['campaignItemId', 'item-1'],
      ['simulatedEmailId', 'email-1'],
      ['phishingSimulationMessageId', 'message-1'],
      ['token', 'secret-body-token'],
      ['tokenHash', 'secret-body-token-hash'],
      ['source', { channel: 'SIMULATED_INBOX' }],
      ['context', { organisationId: 'organisation-1' }],
      ['unexpected', 'secret-unexpected-value'],
    ])('rejects unknown property %s without echoing its value', async (property, rejectedValue) => {
      const response = await request(createApp())
        .post(interactionPath)
        .send({
          eventType: 'PORTAL_VISITED',
          clientEventId: 'client-event-1',
          [property]: rejectedValue,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
      });
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(property);
      expect(serialized).not.toContain(JSON.stringify(rejectedValue));
      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).not.toHaveBeenCalled();
      expect(portalRepositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('passes only the two validated request fields to the service', async () => {
      await request(createApp()).post(interactionPath).send({
        eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
        clientEventId: ' client-event-1 ',
      });

      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).toHaveBeenCalledWith(
        token,
        {
          eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
          clientEventId: 'client-event-1',
        },
        { requestHostname: '127.0.0.1' },
      );
      expect(
        Object.keys(
          phishingPortalServiceMock.recordPhishingPortalInteraction.mock.calls[0]?.[1] ?? {},
        ).sort(),
      ).toEqual(['clientEventId', 'eventType']);
    });

    it('ignores query and Origin overrides when passing the POST transport hostname', async () => {
      await request(createApp())
        .post(`${interactionPath}?hostname=other.test`)
        .set('Host', 'SIMULATION-ONE.TEST')
        .set('Origin', 'https://other.test')
        .send({ eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' });

      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).toHaveBeenCalledWith(
        token,
        { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' },
        { requestHostname: 'simulation-one.test' },
      );
    });

    it('rejects ambiguous trusted proxy host context for POST', async () => {
      const app = createApp();
      app.set('trust proxy', 1);

      const response = await request(app)
        .post(interactionPath)
        .set('Host', 'other.test')
        .set('X-Forwarded-Host', 'simulation-one.test, other.test')
        .send({ eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'PHISHING_PORTAL_UNAVAILABLE',
        message: 'The phishing portal interaction is unavailable.',
      });
      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).not.toHaveBeenCalled();
      expect(portalRepositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('rejects a malformed POST hostname before calling the service', async () => {
      const response = await request(createApp())
        .post(interactionPath)
        .set('Host', 'simulation-one.test@evil.test')
        .send({ eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'PHISHING_PORTAL_UNAVAILABLE',
        message: 'The phishing portal interaction is unavailable.',
      });
      expect(phishingPortalServiceMock.recordPhishingPortalInteraction).not.toHaveBeenCalled();
    });

    it('maps the educational reveal to the canonical strict response', async () => {
      phishingPortalServiceMock.recordPhishingPortalInteraction.mockResolvedValue({
        accepted: true,
        reveal: {
          emailRedFlags: [{ label: 'Unexpected sender', description: null, id: 'red-flag-1' }],
          portalWarningSigns: [
            { label: 'Unexpected sign-in', description: 'Verify the request.', internal: true },
          ],
          trainingPath: null,
          token,
          tokenHash: 'hashed-token',
          organisationId: 'organisation-1',
        },
        managedPortalLinkId: 'link-1',
      });

      const response = await request(createApp()).post(interactionPath).send({
        eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
        clientEventId: 'attempt-1',
      });

      expect(response.body).toEqual({
        accepted: true,
        reveal: {
          emailRedFlags: [{ label: 'Unexpected sender', description: null }],
          portalWarningSigns: [{ label: 'Unexpected sign-in', description: 'Verify the request.' }],
          trainingPath: null,
        },
      });
      expect(recordPortalInteractionResponseSchema.safeParse(response.body).success).toBe(true);
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(token);
      expect(serialized).not.toContain('hashed-token');
      expect(serialized).not.toContain('organisation-1');
      expect(serialized).not.toContain('link-1');
      expect(serialized).not.toContain('red-flag-1');
    });

    it('returns indistinguishable safe failures for unusable tokens', async () => {
      phishingPortalServiceMock.recordPhishingPortalInteraction.mockRejectedValue(
        new phishingPortalServiceMock.PhishingPortalInteractionUnavailableError(),
      );
      const body = { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' };

      const unknown = await request(createApp()).post(interactionPath).send(body);
      const crossContext = await request(createApp()).post(interactionPath).send(body);
      const oversizedToken = 'Z'.repeat(129);
      const oversized = await request(createApp())
        .post(`/api/public/phishing-portals/${oversizedToken}/interactions`)
        .send(body);

      expect(unknown.body).toEqual(crossContext.body);
      expect(crossContext.body).toEqual(oversized.body);
      expect(unknown.status).toBe(404);
      expect(unknown.body).toEqual({
        error: 'PHISHING_PORTAL_UNAVAILABLE',
        message: 'The phishing portal interaction is unavailable.',
      });
      expect(JSON.stringify(unknown.body)).not.toContain(token);
      expect(JSON.stringify(oversized.body)).not.toContain(oversizedToken);
    });

    it('maps internal failures without logging token material or request bodies', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      phishingPortalServiceMock.recordPhishingPortalInteraction.mockRejectedValue(
        new Error(`failure for ${token} with hashed-token and secret-password`),
      );

      const response = await request(createApp()).post(interactionPath).send({
        eventType: 'PORTAL_VISITED',
        clientEventId: 'client-event-1',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
      const logs = JSON.stringify(consoleError.mock.calls);
      expect(logs).not.toContain(token);
      expect(logs).not.toContain('hashed-token');
      expect(logs).not.toContain('secret-password');
      expect(portalRepositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
