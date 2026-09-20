import {
  organisationEmailListResponseSchema,
  organisationEmailManagementDetailResponseSchema,
  organisationEmailRegistrationResponseSchema,
} from '@insightful-phish/shared';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearOrganisationEmailRateLimitStores } from '../../src/routes/organisation-email.routes.js';

const serviceMock = vi.hoisted(() => {
  class MockOrganisationEmailServiceError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
      public readonly issues: unknown[] = [],
    ) {
      super(message);
    }
  }
  class MockOrganisationScopeServiceError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    OrganisationEmailServiceError: MockOrganisationEmailServiceError,
    OrganisationScopeServiceError: MockOrganisationScopeServiceError,
    getOrganisationEmails: vi.fn(),
    getOrganisationEmail: vi.fn(),
    registerOrganisationEmail: vi.fn(),
    updateOrganisationEmail: vi.fn(),
    activateOrganisationEmail: vi.fn(),
    copyOrganisationEmail: vi.fn(),
  };
});

vi.mock('../../src/services/organisation-email.service.js', () => serviceMock);

const userId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';
const emailId = '33333333-3333-4333-8333-333333333333';
let authenticated = true;

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!authenticated) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication is required' });
      return;
    }
    req.auth = {
      userId,
      user: {
        id: userId,
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@example.test',
        userType: 'ORGANISATION_ADMIN',
        authStatus: 'ACTIVE',
        createdAt: '2026-09-15T08:00:00.000Z',
      },
    };
    next();
  },
}));

const draft = {
  senderLabel: 'Security Team',
  senderAddress: 'security@example.test',
  subject: 'Review your account',
  preview: 'Review waiting',
  bodyHtml: '<p>Hello {{FIRST_NAME}}, {{SYSTEM_LINK}}</p>',
  link: { anchorText: 'review your account' },
  expectedClassification: 'PHISHING' as const,
  redFlags: [
    {
      redFlagType: 'LINK' as const,
      label: 'Suspicious link',
      description: 'The link destination is hidden.',
      severity: 'HIGH' as const,
    },
  ],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'] as const,
  difficultyLevel: 'MEDIUM' as const,
  portalTemplateId: null,
};

const detail = {
  id: emailId,
  organisationId,
  createdByUserId: userId,
  ...draft,
  categories: [...draft.categories],
  status: 'DRAFT' as const,
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-15T08:00:00.000Z',
};

describe('organisation email library routes', () => {
  const app = createApp();

  beforeEach(async () => {
    vi.resetAllMocks();
    authenticated = true;
    await clearOrganisationEmailRateLimitStores();
  });

  it('requires authentication', async () => {
    authenticated = false;
    const response = await request(app).get(`/organisations/${organisationId}/email-library`);

    expect(response.status).toBe(401);
    expect(serviceMock.getOrganisationEmails).not.toHaveBeenCalled();
  });

  it('validates identifiers and strict list filters', async () => {
    const invalidId = await request(app).get('/organisations/not-a-uuid/email-library');
    const invalidQuery = await request(app).get(
      `/organisations/${organisationId}/email-library?status=ARCHIVED&unexpected=true`,
    );

    expect(invalidId.status).toBe(422);
    expect(invalidQuery.status).toBe(422);
  });

  it('returns a picker-friendly paginated list contract', async () => {
    serviceMock.getOrganisationEmails.mockResolvedValue({
      items: [
        {
          id: emailId,
          senderLabel: detail.senderLabel,
          senderAddress: detail.senderAddress,
          subject: detail.subject,
          preview: detail.preview,
          expectedClassification: detail.expectedClassification,
          categories: detail.categories,
          difficultyLevel: detail.difficultyLevel,
          status: detail.status,
          updatedAt: detail.updatedAt,
        },
      ],
      pagination: { page: 2, limit: 5, total: 6, totalPages: 2 },
    });

    const response = await request(app).get(
      `/organisations/${organisationId}/email-library?page=2&limit=5&search=payroll&status=DRAFT`,
    );

    expect(response.status).toBe(200);
    expect(organisationEmailListResponseSchema.safeParse(response.body).success).toBe(true);
    expect(serviceMock.getOrganisationEmails).toHaveBeenCalledWith(userId, organisationId, {
      page: 2,
      limit: 5,
      search: 'payroll',
      status: 'DRAFT',
    });
  });

  it.each([
    ['VIEW_CAMPAIGNS', 'getOrganisationEmails'],
    ['MANAGE_CAMPAIGNS', 'registerOrganisationEmail'],
  ] as const)('returns permission failures for %s operations', async (_permission, method) => {
    serviceMock[method].mockRejectedValue(
      new serviceMock.OrganisationScopeServiceError(
        403,
        'MISSING_REQUIRED_PERMISSION',
        'Required permission is missing',
      ),
    );

    const response =
      method === 'getOrganisationEmails'
        ? await request(app).get(`/organisations/${organisationId}/email-library`)
        : await request(app).post(`/organisations/${organisationId}/email-library`).send(draft);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('MISSING_REQUIRED_PERMISSION');
  });

  it('creates a Draft and reports whether registration reused an exact match', async () => {
    serviceMock.registerOrganisationEmail.mockResolvedValue({ email: detail, reused: false });

    const created = await request(app)
      .post(`/organisations/${organisationId}/email-library`)
      .send(draft);

    expect(created.status).toBe(201);
    expect(organisationEmailRegistrationResponseSchema.safeParse(created.body).success).toBe(true);

    serviceMock.registerOrganisationEmail.mockResolvedValue({ email: detail, reused: true });
    const reused = await request(app)
      .post(`/organisations/${organisationId}/email-library`)
      .send(draft);

    expect(reused.status).toBe(200);
    expect(reused.body.reused).toBe(true);
  });

  it('rejects arbitrary destination fields at the API boundary', async () => {
    const response = await request(app)
      .post(`/organisations/${organisationId}/email-library`)
      .send({ ...draft, link: { anchorText: 'Review', href: 'https://attacker.example' } });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('VALIDATION_ERROR');
    expect(serviceMock.registerOrganisationEmail).not.toHaveBeenCalled();
  });

  it('reads and updates only the organisation-scoped identity', async () => {
    serviceMock.getOrganisationEmail.mockResolvedValue(detail);
    serviceMock.updateOrganisationEmail.mockResolvedValue(detail);

    const read = await request(app).get(
      `/organisations/${organisationId}/email-library/${emailId}`,
    );
    const updated = await request(app)
      .patch(`/organisations/${organisationId}/email-library/${emailId}`)
      .send(draft);

    expect(read.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(organisationEmailManagementDetailResponseSchema.safeParse(read.body).success).toBe(true);
    expect(serviceMock.getOrganisationEmail).toHaveBeenCalledWith(userId, organisationId, emailId);
    expect(serviceMock.updateOrganisationEmail).toHaveBeenCalledWith(
      userId,
      organisationId,
      emailId,
      draft,
    );
  });

  it('does not reveal cross-organisation records', async () => {
    serviceMock.getOrganisationEmail.mockRejectedValue(
      new serviceMock.OrganisationEmailServiceError(
        404,
        'ORGANISATION_EMAIL_NOT_FOUND',
        'Organisation email not found',
      ),
    );

    const response = await request(app).get(
      `/organisations/${organisationId}/email-library/${emailId}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('ORGANISATION_EMAIL_NOT_FOUND');
  });

  it('returns structured activation validation issues', async () => {
    const issues = [
      {
        emailId,
        position: null,
        field: 'subject',
        code: 'REQUIRED',
        message: 'Subject is required.',
      },
    ];
    serviceMock.activateOrganisationEmail.mockRejectedValue(
      new serviceMock.OrganisationEmailServiceError(
        422,
        'ORGANISATION_EMAIL_ACTIVATION_INVALID',
        'Organisation email is incomplete and cannot be activated',
        issues,
      ),
    );

    const response = await request(app)
      .post(`/organisations/${organisationId}/email-library/${emailId}/activate`)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body.details).toEqual(issues);
  });

  it('activates and explicitly copies through separate operations', async () => {
    serviceMock.activateOrganisationEmail.mockResolvedValue({ ...detail, status: 'ACTIVE' });
    serviceMock.copyOrganisationEmail.mockResolvedValue({
      ...detail,
      id: '44444444-4444-4444-8444-444444444444',
    });

    const activated = await request(app)
      .post(`/organisations/${organisationId}/email-library/${emailId}/activate`)
      .send({});
    const copied = await request(app)
      .post(`/organisations/${organisationId}/email-library/${emailId}/copy`)
      .send({});

    expect(activated.status).toBe(200);
    expect(copied.status).toBe(201);
    expect(serviceMock.activateOrganisationEmail).toHaveBeenCalledWith(
      userId,
      organisationId,
      emailId,
    );
    expect(serviceMock.copyOrganisationEmail).toHaveBeenCalledWith(userId, organisationId, emailId);
  });

  it('rejects unknown mutation payload fields', async () => {
    const response = await request(app)
      .post(`/organisations/${organisationId}/email-library/${emailId}/activate`)
      .send({ force: true });

    expect(response.status).toBe(422);
    expect(serviceMock.activateOrganisationEmail).not.toHaveBeenCalled();
  });
});
