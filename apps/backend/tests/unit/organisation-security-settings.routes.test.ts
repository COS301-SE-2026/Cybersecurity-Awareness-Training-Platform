import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearOrganisationSecuritySettingsRateLimitStores } from '../../src/routes/organisation-security-settings.routes.js';

const actorUserId = '33333333-3333-4333-8333-333333333333';
const organisationId = '11111111-1111-4111-8111-111111111111';

const serviceMock = vi.hoisted(() => {
  class MockOrganisationSecuritySettingsServiceError extends Error {
    constructor(
      public readonly statusCode: 403 | 404 | 409 | 422,
      public readonly error: string,
      message: string,
      public readonly fieldErrors: Array<{ field: string; message: string }> = [],
    ) {
      super(message);
      this.name = 'OrganisationSecuritySettingsServiceError';
    }
  }

  return {
    OrganisationSecuritySettingsServiceError: MockOrganisationSecuritySettingsServiceError,
    getOrganisationSecuritySettings: vi.fn(),
    patchOrganisationSecuritySettings: vi.fn(),
  };
});

vi.mock('../../src/services/organisation-security-settings.service.js', () => serviceMock);

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, _res: Response, next: NextFunction) {
    req.auth = {
      userId: actorUserId,
      user: {
        id: actorUserId,
        firstName: 'Amina',
        lastName: 'Admin',
        email: 'amina@example.test',
        userType: 'ORGANISATION_ADMIN',
        authStatus: 'ACTIVE',
        createdAt: '2026-07-01T08:00:00.000Z',
      },
    };
    next();
  },
}));

function settingsResponse() {
  return {
    organisationId,
    settings: {
      id: '44444444-4444-4444-8444-444444444444',
      organisationId,
      enforceRememberMePolicy: true,
      allowRememberMe: true,
      maxRememberedSessionHours: 168,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 8,
      enforceIdleTimeout: true,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowTraineeEmailChange: false,
      updatedByOrganisationAdminId: null,
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-02T08:00:00.000Z',
    },
    effectivePolicy: {
      organisationId,
      rememberMeRequested: false,
      rememberMeAllowed: true,
      rememberMeApplied: false,
      regularSessionSeconds: 28800,
      rememberedSessionSeconds: 604800,
      effectiveSessionSeconds: 28800,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowEmailChange: false,
    },
    platformLimits: {
      rememberMe: {
        maxRememberedSessionHours: {
          min: 1,
          max: 720,
          default: 168,
          options: [24, 72, 168, 336, 720],
        },
      },
      regularSession: {
        regularSessionLengthHours: {
          min: 1,
          max: 24,
          default: 8,
          options: [4, 8, 12, 24],
        },
      },
      idleTimeout: {
        idleTimeoutMinutes: {
          min: 5,
          max: 480,
          default: 30,
          options: [15, 30, 60, 120, 240, 480],
        },
      },
    },
    capabilities: {
      canView: true,
      canEdit: true,
      readOnlyReason: null,
      changesApply: {
        rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN',
        regularSessionLength: 'NEXT_REFRESH_OR_LOGIN',
        idleTimeout: 'NEXT_REFRESH',
        requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS',
        allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS',
      },
    },
  };
}

function updatePayload() {
  return {
    enforceRememberMePolicy: true,
    allowRememberMe: true,
    maxRememberedSessionHours: 72,
    enforceRegularSessionLength: true,
    regularSessionLengthHours: 4,
    enforceIdleTimeout: true,
    idleTimeoutMinutes: 15,
    requireReauthenticationForSensitiveActions: false,
    allowTraineeEmailChange: true,
  };
}

describe('organisation security settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOrganisationSecuritySettingsRateLimitStores();
  });

  it('gets organisation security settings for the authenticated actor and organisation', async () => {
    serviceMock.getOrganisationSecuritySettings.mockResolvedValue(settingsResponse());

    const response = await request(createApp()).get(
      `/organisations/${organisationId}/security-settings`,
    );

    expect(response.status).toBe(200);
    expect(serviceMock.getOrganisationSecuritySettings).toHaveBeenCalledWith(
      actorUserId,
      organisationId,
    );
    expect(response.body).toMatchObject({
      organisationId,
      capabilities: {
        canView: true,
        canEdit: true,
      },
    });
  });

  it('updates organisation security settings with a validated request body', async () => {
    serviceMock.patchOrganisationSecuritySettings.mockResolvedValue(settingsResponse());
    const payload = updatePayload();

    const response = await request(createApp())
      .patch(`/organisations/${organisationId}/security-settings`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(serviceMock.patchOrganisationSecuritySettings).toHaveBeenCalledWith(
      actorUserId,
      organisationId,
      payload,
    );
  });

  it('rejects invalid update bodies before service work', async () => {
    const response = await request(createApp())
      .patch(`/organisations/${organisationId}/security-settings`)
      .send({
        ...updatePayload(),
        regularSessionLengthHours: 25,
      });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(serviceMock.patchOrganisationSecuritySettings).not.toHaveBeenCalled();
  });

  it('maps field-specific service errors to safe validation responses', async () => {
    serviceMock.patchOrganisationSecuritySettings.mockRejectedValue(
      new serviceMock.OrganisationSecuritySettingsServiceError(
        422,
        'ORG_SECURITY_SETTINGS_VALIDATION_FAILED',
        'Organisation security settings are invalid',
        [
          {
            field: 'idleTimeoutMinutes',
            message: 'Idle timeout minutes is required when idle timeout is enforced',
          },
        ],
      ),
    );

    const response = await request(createApp())
      .patch(`/organisations/${organisationId}/security-settings`)
      .send(updatePayload());

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: 'ORG_SECURITY_SETTINGS_VALIDATION_FAILED',
      message: 'Organisation security settings are invalid',
      details: [
        {
          field: 'idleTimeoutMinutes',
          message: 'Idle timeout minutes is required when idle timeout is enforced',
        },
      ],
    });
  });

  it('rejects invalid route params before service work', async () => {
    const response = await request(createApp()).get('/organisations/not-a-uuid/security-settings');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(serviceMock.getOrganisationSecuritySettings).not.toHaveBeenCalled();
  });

  it('rate limits organisation security settings reads before service work', async () => {
    serviceMock.getOrganisationSecuritySettings.mockResolvedValue(settingsResponse());

    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= 100; index += 1) {
      response = await request(app).get(`/organisations/${organisationId}/security-settings`);
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'ORGANISATION_SECURITY_SETTINGS_RATE_LIMITED',
      message: 'Too many organisation security settings requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
    expect(serviceMock.getOrganisationSecuritySettings).toHaveBeenCalledTimes(100);
  });

  it('rate limits organisation security settings updates before service work', async () => {
    serviceMock.patchOrganisationSecuritySettings.mockResolvedValue(settingsResponse());

    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= 20; index += 1) {
      response = await request(app)
        .patch(`/organisations/${organisationId}/security-settings`)
        .send(updatePayload());
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'ORGANISATION_SECURITY_SETTINGS_RATE_LIMITED',
      message: 'Too many organisation security settings requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
    expect(serviceMock.patchOrganisationSecuritySettings).toHaveBeenCalledTimes(20);
  });
});
