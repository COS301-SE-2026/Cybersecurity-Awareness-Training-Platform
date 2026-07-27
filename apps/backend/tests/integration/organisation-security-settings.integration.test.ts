import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearOrganisationSecuritySettingsRateLimitStores } from '../../src/routes/organisation-security-settings.routes.js';
import { loginOrganisationAdmin, loginTestUser } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  OrganisationStatus,
  UserType,
  AuthStatus,
  AdminStatus,
} from '../../src/generated/prisma/enums.js';
import { createOrganisation, generateTestEmail } from '../helpers/factories.js';
import { randomUUID } from 'node:crypto';

const precalculatedHash = [
  'scrypt$16384$8$1$fe5b63f10eb85027cc0bb85210efc592$',
  '2b8c42c34456dc85c1cb018557067b2b1ea06e5a39e9a9a3a5892cc3e67899c34e7cf0ff478844589efff6c517d8fc08ca9f4ef12caf413b799d15978b0ce3ba',
].join('');

describe('Organisation Security Settings Integration', () => {
  beforeEach(async () => {
    await clearOrganisationSecuritySettingsRateLimitStores();
  });

  it('retrieves organisation security settings and capabilities for authenticated admin', async () => {
    const adminFixture = await loginOrganisationAdmin();
    const app = createApp();

    const response = await request(app)
      .get(`/organisations/${adminFixture.organisation.id}/security-settings`)
      .set('Authorization', `Bearer ${adminFixture.token}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      organisationId: adminFixture.organisation.id,
      settings: expect.objectContaining({
        organisationId: adminFixture.organisation.id,
        allowRememberMe: true,
      }),
      capabilities: expect.objectContaining({
        canView: true,
        canEdit: true,
        readOnlyReason: null,
      }),
      platformLimits: expect.objectContaining({
        rememberMe: expect.any(Object),
        regularSession: expect.any(Object),
        idleTimeout: expect.any(Object),
      }),
    });
  });

  it('updates security settings, creates audit log entry, and updates database state', async () => {
    const adminFixture = await loginOrganisationAdmin();
    const app = createApp();

    const updatePayload = {
      enforceRememberMePolicy: true,
      allowRememberMe: true,
      maxRememberedSessionHours: 168,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 8,
      enforceIdleTimeout: true,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowTraineeEmailChange: false,
    };

    const response = await request(app)
      .patch(`/organisations/${adminFixture.organisation.id}/security-settings`)
      .set('Authorization', `Bearer ${adminFixture.token}`)
      .send(updatePayload);
    expect(response.status).toBe(200);
    expect(response.body.settings).toMatchObject({
      enforceRememberMePolicy: true,
      allowRememberMe: true,
      maxRememberedSessionHours: 168,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 8,
      enforceIdleTimeout: true,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowTraineeEmailChange: false,
    });
    // verify DB update
    const dbSettings = await prisma.organisationSecuritySettings.findUnique({
      where: { organisationId: adminFixture.organisation.id },
    });
    expect(dbSettings?.enforceRememberMePolicy).toBe(true);
    expect(dbSettings?.maxRememberedSessionHours).toBe(168);
    // verify audit log entry
    const auditLogs = await prisma.auditLogEntry.findMany({
      where: {
        organisationId: adminFixture.organisation.id,
        actionType: 'SETTINGS_CHANGED',
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].actorUserId).toBe(adminFixture.user.id);
  });

  it('returns 403 when user lacks CHANGE_ORGANISATION_SECURITY_SETTINGS permission on PATCH', async () => {
    const organisation = await createOrganisation();
    const email = generateTestEmail('admin-noperm');

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        firstName: 'NoPerm',
        lastName: 'Admin',
        email,
        passwordHash: precalculatedHash,
        userType: UserType.ORGANISATION_ADMIN,
        authStatus: AuthStatus.ACTIVE,
      },
    });

    await prisma.organisationAdminProfile.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        organisationId: organisation.id,
        adminStatus: AdminStatus.ACTIVE,
        isInitialAdmin: false, // Nnt initil admin and no permission granted
        joinedAt: new Date(),
      },
    });

    const loginRes = await loginTestUser(email);
    const token = loginRes.body.token as string;
    const app = createApp();

    const getRes = await request(app)
      .get(`/organisations/${organisation.id}/security-settings`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.capabilities).toMatchObject({
      canEdit: false,
      readOnlyReason: 'MISSING_PERMISSION',
    });

    const patchRes = await request(app)
      .patch(`/organisations/${organisation.id}/security-settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        enforceRememberMePolicy: false,
        allowRememberMe: false,
        maxRememberedSessionHours: null,
        enforceRegularSessionLength: false,
        regularSessionLengthHours: null,
        enforceIdleTimeout: false,
        idleTimeoutMinutes: null,
        requireReauthenticationForSensitiveActions: false,
        allowTraineeEmailChange: true,
      });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body).toMatchObject({
      error: 'ORG_SECURITY_SETTINGS_PERMISSION_REQUIRED',
    });
  });

  it('returns 403 Forbidden with ORGANISATION_SUSPENDED when organisation is suspended', async () => {
    const adminFixture = await loginOrganisationAdmin();
    const app = createApp();
    await prisma.organisation.update({
      where: { id: adminFixture.organisation.id },
      data: { status: OrganisationStatus.SUSPENDED },
    });

    const getRes = await request(app)
      .get(`/organisations/${adminFixture.organisation.id}/security-settings`)
      .set('Authorization', `Bearer ${adminFixture.token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body).toMatchObject({
      error: 'ORGANISATION_SUSPENDED',
    });
  });

  it('returns 422 Unprocessable Entity when validation schema fails', async () => {
    const adminFixture = await loginOrganisationAdmin();
    const app = createApp();

    const patchRes = await request(app)
      .patch(`/organisations/${adminFixture.organisation.id}/security-settings`)
      .set('Authorization', `Bearer ${adminFixture.token}`)
      .send({
        enforceRememberMePolicy: true,
        allowRememberMe: true,
        maxRememberedSessionHours: null, // invalid req when remember me is allowed
        enforceRegularSessionLength: false,
        regularSessionLengthHours: null,
        enforceIdleTimeout: false,
        idleTimeoutMinutes: null,
        requireReauthenticationForSensitiveActions: false,
        allowTraineeEmailChange: true,
      });

    expect(patchRes.status).toBe(422);
    expect(patchRes.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'maxRememberedSessionHours',
        }),
      ]),
    });
  });
});
