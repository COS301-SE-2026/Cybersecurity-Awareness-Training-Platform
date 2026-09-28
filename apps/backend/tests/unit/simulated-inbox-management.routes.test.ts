import {
  simulatedInboxChildEmailSchema,
  simulatedInboxDetailSchema,
  simulatedInboxListResponseSchema,
  simulatedInboxSnapshotCreationResponseSchema,
} from '@insightful-phish/shared';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearSimulatedInboxManagementRateLimitStores } from '../../src/routes/simulated-inbox-management.routes.js';

const serviceMock = vi.hoisted(() => {
  class MockServiceError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
      public readonly issues: unknown[] = [],
    ) {
      super(message);
    }
  }
  class MockScopeError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    SimulatedInboxManagementServiceError: MockServiceError,
    OrganisationScopeServiceError: MockScopeError,
    listSimulatedInboxes: vi.fn(),
    createSimulatedInboxDraft: vi.fn(),
    getSimulatedInbox: vi.fn(),
    updateSimulatedInboxDraft: vi.fn(),
    addAuthoredEmailToSimulatedInbox: vi.fn(),
    addLibraryEmailToSimulatedInbox: vi.fn(),
    updateSimulatedInboxEmail: vi.fn(),
    removeSimulatedInboxEmail: vi.fn(),
    reorderSimulatedInboxEmails: vi.fn(),
    activateSimulatedInbox: vi.fn(),
    copySimulatedInbox: vi.fn(),
  };
});

vi.mock('../../src/services/simulated-inbox-management.service.js', () => serviceMock);

const userId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';
const simulationId = '33333333-3333-4333-8333-333333333333';
const inboxId = '44444444-4444-4444-8444-444444444444';
const emailId = '55555555-5555-4555-8555-555555555555';
const libraryId = '66666666-6666-4666-8666-666666666666';
let authenticated = true;

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!authenticated) {
      res.status(401).json({ error: 'AUTH_REQUIRED' });
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
  senderLabel: 'Security',
  senderAddress: 'security@example.test',
  subject: 'Review',
  preview: 'Review pending',
  bodyHtml: '<p>{{SYSTEM_LINK}}</p>',
  link: { anchorText: 'Review' },
  expectedClassification: 'PHISHING' as const,
  redFlags: [
    {
      redFlagType: 'LINK' as const,
      label: 'Link',
      description: 'Unexpected link',
      severity: 'HIGH' as const,
    },
  ],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'] as const,
  difficultyLevel: 'HARD' as const,
};

const email = {
  id: emailId,
  sourceOrganisationEmailId: libraryId,
  position: 0,
  ...draft,
  portalTemplateId: null,
  categories: [...draft.categories],
};

const detail = {
  id: simulationId,
  organisationId,
  createdByUserId: userId,
  title: 'Inbox exercise',
  description: 'Classify the messages',
  objective: null,
  difficultyLevel: 'MEDIUM' as const,
  safetyStatus: 'DRAFT' as const,
  lifecycleStatus: 'DRAFT' as const,
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-15T08:00:00.000Z',
  inboxId,
  inboxStatus: 'ARCHIVED' as const,
  emails: [email],
};

describe('simulated inbox management routes', () => {
  const app = createApp();
  const path = `/organisations/${organisationId}/simulated-inboxes/${simulationId}`;

  beforeEach(async () => {
    vi.resetAllMocks();
    authenticated = true;
    await clearSimulatedInboxManagementRateLimitStores();
  });

  it('requires authentication and validates organisation identifiers', async () => {
    authenticated = false;
    expect(
      (await request(app).get(`/organisations/${organisationId}/simulated-inboxes`)).status,
    ).toBe(401);
    authenticated = true;
    expect((await request(app).get('/organisations/invalid/simulated-inboxes')).status).toBe(422);
  });

  it('lists Draft and Active summaries with pagination and lifecycle search', async () => {
    serviceMock.listSimulatedInboxes.mockResolvedValue({
      items: [
        {
          id: simulationId,
          title: detail.title,
          description: detail.description,
          objective: null,
          difficultyLevel: 'MEDIUM',
          safetyStatus: 'DRAFT',
          lifecycleStatus: 'DRAFT',
          emailCount: 1,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const response = await request(app).get(
      `/organisations/${organisationId}/simulated-inboxes?limit=10&search=inbox&lifecycleStatus=DRAFT`,
    );

    expect(response.status).toBe(200);
    expect(simulatedInboxListResponseSchema.safeParse(response.body).success).toBe(true);
    expect(serviceMock.listSimulatedInboxes).toHaveBeenCalledWith(userId, organisationId, {
      page: 1,
      limit: 10,
      search: 'inbox',
      lifecycleStatus: 'DRAFT',
    });
  });

  it('creates and reads complete management details', async () => {
    serviceMock.createSimulatedInboxDraft.mockResolvedValue({ ...detail, emails: [] });
    serviceMock.getSimulatedInbox.mockResolvedValue(detail);

    const created = await request(app)
      .post(`/organisations/${organisationId}/simulated-inboxes`)
      .send({ title: '', description: '', difficultyLevel: 'EASY' });
    const read = await request(app).get(path);

    expect(created.status).toBe(201);
    expect(created.body.emails).toEqual([]);
    expect(read.status).toBe(200);
    expect(simulatedInboxDetailSchema.safeParse(read.body).success).toBe(true);
  });

  it('updates only canonical parent metadata', async () => {
    serviceMock.updateSimulatedInboxDraft.mockResolvedValue({
      ...detail,
      title: 'Updated',
      difficultyLevel: 'HARD',
    });

    const response = await request(app)
      .patch(path)
      .send({ title: 'Updated', difficultyLevel: 'HARD' });

    expect(response.status).toBe(200);
    expect(serviceMock.updateSimulatedInboxDraft).toHaveBeenCalledWith(
      userId,
      organisationId,
      simulationId,
      { title: 'Updated', difficultyLevel: 'HARD' },
    );
  });

  it('adds newly authored canonical email content and rejects destination URLs', async () => {
    serviceMock.addAuthoredEmailToSimulatedInbox.mockResolvedValue({
      email,
      sourceOrganisationEmailId: libraryId,
      libraryEmailReused: false,
    });

    const created = await request(app).post(`${path}/emails/authored`).send(draft);
    const rejected = await request(app)
      .post(`${path}/emails/authored`)
      .send({ ...draft, link: { anchorText: 'Review', href: 'https://attacker.example' } });

    expect(created.status).toBe(201);
    expect(simulatedInboxSnapshotCreationResponseSchema.safeParse(created.body).success).toBe(true);
    expect(rejected.status).toBe(422);
  });

  it('adds an Active library email', async () => {
    serviceMock.addLibraryEmailToSimulatedInbox.mockResolvedValue({
      email,
      sourceOrganisationEmailId: libraryId,
      libraryEmailReused: true,
    });

    const response = await request(app)
      .post(`${path}/emails/from-library`)
      .send({ organisationEmailId: libraryId });

    expect(response.status).toBe(201);
    expect(serviceMock.addLibraryEmailToSimulatedInbox).toHaveBeenCalledWith(
      userId,
      organisationId,
      simulationId,
      { organisationEmailId: libraryId },
    );
  });

  it('edits and removes a stable snapshot ID', async () => {
    serviceMock.updateSimulatedInboxEmail.mockResolvedValue({ ...email, subject: 'Changed' });
    serviceMock.removeSimulatedInboxEmail.mockResolvedValue(undefined);

    const updated = await request(app).patch(`${path}/emails/${emailId}`).send(draft);
    const removed = await request(app).delete(`${path}/emails/${emailId}`);

    expect(updated.status).toBe(200);
    expect(simulatedInboxChildEmailSchema.safeParse(updated.body).success).toBe(true);
    expect(removed.status).toBe(204);
    expect(serviceMock.removeSimulatedInboxEmail).toHaveBeenCalledWith(
      userId,
      organisationId,
      simulationId,
      emailId,
    );
  });

  it('forwards an omitted snapshot portal template without defaulting it to null', async () => {
    serviceMock.updateSimulatedInboxEmail.mockResolvedValue({
      ...email,
      portalTemplateId: 'GENERIC_BANKING_LOGIN_V1',
    });

    const response = await request(app).patch(`${path}/emails/${emailId}`).send(draft);

    expect(response.status).toBe(200);
    const forwarded = serviceMock.updateSimulatedInboxEmail.mock.calls[0]?.[4];
    expect(forwarded).not.toHaveProperty('portalTemplateId');
  });

  it('validates and forwards explicit snapshot ordering', async () => {
    serviceMock.reorderSimulatedInboxEmails.mockResolvedValue(detail);
    const order = { emails: [{ emailId, position: 0 }] };

    const response = await request(app).put(`${path}/emails/order`).send(order);
    const malformed = await request(app)
      .put(`${path}/emails/order`)
      .send({ emails: [{ emailId, position: -1 }] });

    expect(response.status).toBe(200);
    expect(serviceMock.reorderSimulatedInboxEmails).toHaveBeenCalledWith(
      userId,
      organisationId,
      simulationId,
      order,
    );
    expect(malformed.status).toBe(422);
  });

  it('returns email-addressable activation issues', async () => {
    const issues = [
      {
        emailId,
        position: 0,
        field: 'subject',
        code: 'REQUIRED',
        message: 'Subject is required.',
      },
    ];
    serviceMock.activateSimulatedInbox.mockRejectedValue(
      new serviceMock.SimulatedInboxManagementServiceError(
        422,
        'SIMULATED_INBOX_ACTIVATION_INVALID',
        'Invalid inbox',
        issues,
      ),
    );

    const response = await request(app).post(`${path}/activate`).send({});

    expect(response.status).toBe(422);
    expect(response.body.details).toEqual(issues);
  });

  it('activates and copies through explicit lifecycle operations', async () => {
    serviceMock.activateSimulatedInbox.mockResolvedValue({
      ...detail,
      safetyStatus: 'APPROVED',
      lifecycleStatus: 'ACTIVE',
      inboxStatus: 'ACTIVE',
    });
    serviceMock.copySimulatedInbox.mockResolvedValue({
      ...detail,
      id: '77777777-7777-4777-8777-777777777777',
      title: 'Inbox exercise (Copy)',
    });

    expect((await request(app).post(`${path}/activate`).send({})).status).toBe(200);
    expect((await request(app).post(`${path}/copy`).send({})).status).toBe(201);
  });

  it('passes permission, immutability and isolation failures without discovery', async () => {
    serviceMock.getSimulatedInbox.mockRejectedValue(
      new serviceMock.OrganisationScopeServiceError(
        404,
        'INACCESSIBLE_ORGANISATION',
        'Inaccessible organisation',
      ),
    );
    serviceMock.updateSimulatedInboxDraft.mockRejectedValue(
      new serviceMock.SimulatedInboxManagementServiceError(
        409,
        'SIMULATED_INBOX_ACTIVE_IMMUTABLE',
        'Active simulated inboxes cannot be modified',
      ),
    );

    expect((await request(app).get(path)).status).toBe(404);
    expect((await request(app).patch(path).send({ title: 'No' })).status).toBe(409);
  });

  it('rejects unknown fields and unsupported lifecycle values', async () => {
    expect(
      (
        await request(app).get(
          `/organisations/${organisationId}/simulated-inboxes?lifecycleStatus=BLOCKED`,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post(`/organisations/${organisationId}/simulated-inboxes`)
          .send({ title: '', description: '', difficultyLevel: 'EASY', objective: 'unexpected' })
      ).status,
    ).toBe(422);
  });
});
