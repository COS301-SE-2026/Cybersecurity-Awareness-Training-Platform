import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearOrganisationAdminRateLimitStores } from '../../src/routes/organisation-admin.routes.js';

const actorUserId = '33333333-3333-4333-8333-333333333333';
const organisationId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
const removeConfirmationSecret = ['local', 'test', 'remove', 'confirmation'].join('-');

const serviceMock = vi.hoisted(() => {
  class MockOrganisationAdminServiceError extends Error {
    constructor(
      public readonly statusCode: 403 | 404 | 409 | 422,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'OrganisationAdminServiceError';
    }
  }

  return {
    OrganisationAdminServiceError: MockOrganisationAdminServiceError,
    getOrganisationAdmins: vi.fn(),
    createAdminPromotion: vi.fn(),
    changeAdminPermissions: vi.fn(),
    removeAdmin: vi.fn(),
  };
});

vi.mock('../../src/services/organisation-admin.service.js', () => serviceMock);

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

function promotionPayload() {
  return {
    traineeEmail: ' Trainee@Example.test ',
    permissionKeys: ['VIEW_ORGANISATION_ADMINS', 'VIEW_ORGANISATION_ADMINS'],
  };
}

describe('organisation admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOrganisationAdminRateLimitStores();
  });

  it('lists organisation admins for the authenticated actor and organisation', async () => {
    serviceMock.getOrganisationAdmins.mockResolvedValue({
      admins: [],
      availablePermissions: [],
      actorPermissions: ['VIEW_ORGANISATION_ADMINS'],
    });

    const response = await request(createApp()).get(`/organisations/${organisationId}/admins`);

    expect(response.status).toBe(200);
    expect(serviceMock.getOrganisationAdmins).toHaveBeenCalledWith(actorUserId, organisationId);
    expect(response.body).toEqual({
      admins: [],
      availablePermissions: [],
      actorPermissions: ['VIEW_ORGANISATION_ADMINS'],
    });
  });

  it('validates and normalises organisation admin promotion requests', async () => {
    serviceMock.createAdminPromotion.mockResolvedValue({
      invitationId: 'invitation-1',
      actionTokenId: 'action-token-1',
      status: 'SENT',
      expiresAt: '2026-07-08T08:00:00.000Z',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      emailQueued: true,
    });

    const response = await request(createApp())
      .post(`/organisations/${organisationId}/admin-promotions`)
      .send(promotionPayload());

    expect(response.status).toBe(201);
    expect(serviceMock.createAdminPromotion).toHaveBeenCalledWith(actorUserId, organisationId, {
      traineeEmail: 'trainee@example.test',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
    });
  });

  it('rejects invalid organisation admin promotion bodies before service work', async () => {
    const response = await request(createApp())
      .post(`/organisations/${organisationId}/admin-promotions`)
      .send({
        traineeEmail: 'not-an-email',
        permissionKeys: [],
      });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(serviceMock.createAdminPromotion).not.toHaveBeenCalled();
  });

  it('updates organisation admin permissions with validated route params and body', async () => {
    serviceMock.changeAdminPermissions.mockResolvedValue({
      adminId,
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
    });

    const response = await request(createApp())
      .patch(`/organisations/${organisationId}/admins/${adminId}/permissions`)
      .send({
        permissionKeys: ['VIEW_ORGANISATION_ADMINS', 'VIEW_ORGANISATION_ADMINS'],
      });

    expect(response.status).toBe(200);
    expect(serviceMock.changeAdminPermissions).toHaveBeenCalledWith(
      actorUserId,
      organisationId,
      adminId,
      {
        permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      },
    );
  });

  it('removes organisation admin privileges only with explicit confirmation', async () => {
    serviceMock.removeAdmin.mockResolvedValue({
      adminId,
      status: 'DISABLED',
    });

    const response = await request(createApp())
      .post(`/organisations/${organisationId}/admins/${adminId}/remove`)
      .send({
        password: removeConfirmationSecret,
        confirmation: 'REMOVE',
      });

    expect(response.status).toBe(200);
    expect(serviceMock.removeAdmin).toHaveBeenCalledWith(actorUserId, organisationId, adminId, {
      password: removeConfirmationSecret,
      confirmation: 'REMOVE',
    });
  });

  it('maps organisation admin service errors to safe responses', async () => {
    serviceMock.changeAdminPermissions.mockRejectedValue(
      new serviceMock.OrganisationAdminServiceError(
        409,
        'ORG_ADMIN_CRITICAL_PERMISSION_REQUIRED',
        'Organisation must retain an active admin with critical admin-management permissions',
      ),
    );

    const response = await request(createApp())
      .patch(`/organisations/${organisationId}/admins/${adminId}/permissions`)
      .send({
        permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'ORG_ADMIN_CRITICAL_PERMISSION_REQUIRED',
      message:
        'Organisation must retain an active admin with critical admin-management permissions',
    });
  });

  it('rejects invalid route params before service work', async () => {
    const response = await request(createApp()).get('/organisations/not-a-uuid/admins');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(serviceMock.getOrganisationAdmins).not.toHaveBeenCalled();
  });

  it('rate limits organisation admin list requests before service work', async () => {
    serviceMock.getOrganisationAdmins.mockResolvedValue({
      admins: [],
      availablePermissions: [],
      actorPermissions: ['VIEW_ORGANISATION_ADMINS'],
    });

    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= 100; index += 1) {
      response = await request(app).get(`/organisations/${organisationId}/admins`);
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'ORGANISATION_ADMIN_RATE_LIMITED',
      message: 'Too many organisation admin requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
    expect(serviceMock.getOrganisationAdmins).toHaveBeenCalledTimes(100);
  });

  it('rate limits organisation admin mutation requests before service work', async () => {
    serviceMock.removeAdmin.mockResolvedValue({
      adminId,
      status: 'DISABLED',
    });

    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= 10; index += 1) {
      response = await request(app)
        .post(`/organisations/${organisationId}/admins/${adminId}/remove`)
        .send({
          password: removeConfirmationSecret,
          confirmation: 'REMOVE',
        });
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'ORGANISATION_ADMIN_RATE_LIMITED',
      message: 'Too many organisation admin requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
    expect(serviceMock.removeAdmin).toHaveBeenCalledTimes(10);
  });
});
