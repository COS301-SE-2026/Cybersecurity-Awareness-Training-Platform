import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OrganisationEmailServiceError,
  activateOrganisationEmail,
  copyOrganisationEmail,
  getOrganisationEmail,
  registerOrganisationEmail,
  updateOrganisationEmail,
} from '../../../src/services/organisation-email.service.js';

const repositoryMock = vi.hoisted(() => ({
  listOrganisationEmails: vi.fn(),
  findOrganisationEmail: vi.fn(),
  registerOrganisationEmailDraft: vi.fn(),
  updateOrganisationEmailDraft: vi.fn(),
  activateOrganisationEmailDraft: vi.fn(),
  copyActiveOrganisationEmail: vi.fn(),
}));

const scopeMock = vi.hoisted(() => {
  class MockOrganisationScopeServiceError extends Error {
    constructor(
      public readonly statusCode: 401 | 403 | 404,
      public readonly error: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    OrganisationScopeServiceError: MockOrganisationScopeServiceError,
    requireOrganisationAdminScope: vi.fn(),
  };
});

vi.mock('../../../src/repositories/organisation-email.repository.js', () => repositoryMock);
vi.mock('../../../src/services/organisation-scope.service.js', () => scopeMock);

const userId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';
const emailId = '33333333-3333-4333-8333-333333333333';

function draft(overrides: Partial<OrganisationEmailDraftInput> = {}): OrganisationEmailDraftInput {
  return {
    senderLabel: 'Security Team',
    senderAddress: 'security@example.test',
    subject: 'Account review',
    preview: 'Review your account',
    bodyHtml: '<p>Hello {{FIRST_NAME}}, {{SYSTEM_LINK}}</p>',
    link: { anchorText: 'review your account' },
    expectedClassification: 'PHISHING',
    redFlags: [
      {
        redFlagType: 'LINK',
        label: 'Link',
        description: 'Unexpected account link',
        severity: 'HIGH',
      },
    ],
    categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
    difficultyLevel: 'MEDIUM',
    ...overrides,
  };
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: emailId,
    organisationId,
    createdByUserId: userId,
    senderLabel: 'Security Team',
    senderAddress: 'security@example.test',
    subject: 'Account review',
    preview: 'Review your account',
    bodyHtml: '<p>Hello {{FIRST_NAME}}, {{SYSTEM_LINK}}</p>',
    linkAnchorText: 'review your account',
    portalTemplateId: null,
    expectedClassification: 'PHISHING' as const,
    categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'] as const,
    difficultyLevel: 'MEDIUM' as const,
    contentHash: 'a'.repeat(64),
    status: 'DRAFT' as const,
    createdAt: new Date('2026-09-15T08:00:00.000Z'),
    updatedAt: new Date('2026-09-15T08:00:00.000Z'),
    redFlags: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        simulatedEmailId: null,
        organisationEmailId: emailId,
        redFlagType: 'LINK' as const,
        label: 'Link',
        description: 'Unexpected account link',
        severity: 'HIGH' as const,
        createdAt: new Date('2026-09-15T08:00:00.000Z'),
        updatedAt: new Date('2026-09-15T08:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}

describe('organisation email service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    scopeMock.requireOrganisationAdminScope.mockResolvedValue({
      userId,
      organisationId,
      adminProfileId: 'admin-id',
      grantedPermissions: new Set(['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS']),
    });
  });

  it('registers canonical content and returns the reused library identity', async () => {
    repositoryMock.registerOrganisationEmailDraft.mockImplementation(
      async (input, isEquivalent) => {
        expect(input.organisationId).toBe(organisationId);
        expect(input.createdByUserId).toBe(userId);
        expect(input.contentHash).toMatch(/^[a-f0-9]{64}$/);
        expect(input.draft.senderLabel).toBe('Security Team');
        expect(isEquivalent(record())).toBe(true);
        return { record: record({ status: 'ACTIVE' }), reused: true };
      },
    );

    const result = await registerOrganisationEmail(userId, organisationId, draft());

    expect(result.reused).toBe(true);
    expect(result.email.id).toBe(emailId);
    expect(result.email.status).toBe('ACTIVE');
    expect(result.email).not.toHaveProperty('contentHash');
    expect(scopeMock.requireOrganisationAdminScope).toHaveBeenCalledWith({
      userId,
      organisationId,
      requiredPermission: 'MANAGE_CAMPAIGNS',
    });
  });

  it('round-trips a null preview without introducing a blank adapter value', async () => {
    repositoryMock.registerOrganisationEmailDraft.mockImplementation(async (input) => ({
      record: record({ preview: input.draft.preview }),
      reused: false,
    }));

    const result = await registerOrganisationEmail(
      userId,
      organisationId,
      draft({ preview: null }),
    );

    expect(repositoryMock.registerOrganisationEmailDraft).toHaveBeenCalledWith(
      expect.objectContaining({ draft: expect.objectContaining({ preview: null }) }),
      expect.any(Function),
    );
    expect(result.email.preview).toBeNull();
  });

  it.each([
    null,
    'GENERIC_ACCOUNT_LOGIN_V1',
    'GENERIC_DOCUMENT_ACCESS_V1',
    'GENERIC_BANKING_LOGIN_V1',
  ] as const)('maps the portal template snapshot %s', async (portalTemplateId) => {
    repositoryMock.findOrganisationEmail.mockResolvedValue(record({ portalTemplateId }));

    const result = await getOrganisationEmail(userId, organisationId, emailId);

    expect(result.portalTemplateId).toBe(portalTemplateId);
  });

  it('rejects an unsafe registration before repository persistence', async () => {
    await expect(
      registerOrganisationEmail(
        userId,
        organisationId,
        draft({ bodyHtml: '<script>alert(1)</script>', link: null }),
      ),
    ).rejects.toMatchObject({ statusCode: 422, error: 'INVALID_EMAIL_AUTHORING_INPUT' });
    expect(repositoryMock.registerOrganisationEmailDraft).not.toHaveBeenCalled();
  });

  it.each([
    ['ACTIVE', 'ORGANISATION_EMAIL_ACTIVE_IMMUTABLE'],
    ['CONFLICT', 'ORGANISATION_EMAIL_EQUIVALENT_CONFLICT'],
  ] as const)('maps a %s draft update state to a conflict', async (state, errorCode) => {
    repositoryMock.updateOrganisationEmailDraft.mockResolvedValue({ state });

    await expect(
      updateOrganisationEmail(userId, organisationId, emailId, draft()),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: errorCode,
    });
  });

  it('returns structured activation issues without activating an incomplete draft', async () => {
    repositoryMock.findOrganisationEmail.mockResolvedValue(
      record({
        senderLabel: '',
        senderAddress: '',
        subject: '',
        bodyHtml: '',
        linkAnchorText: null,
        categories: [],
        redFlags: [],
      }),
    );

    await expect(activateOrganisationEmail(userId, organisationId, emailId)).rejects.toMatchObject({
      statusCode: 422,
      error: 'ORGANISATION_EMAIL_ACTIVATION_INVALID',
      issues: expect.arrayContaining([
        expect.objectContaining({ emailId, position: null, field: 'senderLabel' }),
        expect.objectContaining({ emailId, position: null, field: 'redFlags' }),
      ]),
    });
    expect(repositoryMock.activateOrganisationEmailDraft).not.toHaveBeenCalled();
  });

  it('activates a complete draft', async () => {
    repositoryMock.findOrganisationEmail.mockResolvedValue(record());
    repositoryMock.activateOrganisationEmailDraft.mockResolvedValue(record({ status: 'ACTIVE' }));

    const result = await activateOrganisationEmail(userId, organisationId, emailId);

    expect(result.status).toBe('ACTIVE');
    expect(repositoryMock.activateOrganisationEmailDraft).toHaveBeenCalledWith(
      organisationId,
      emailId,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it('copies Active content to a new Draft without registration deduplication', async () => {
    const copiedId = '55555555-5555-4555-8555-555555555555';
    repositoryMock.findOrganisationEmail.mockResolvedValue(record({ status: 'ACTIVE' }));
    repositoryMock.copyActiveOrganisationEmail.mockResolvedValue(
      record({ id: copiedId, status: 'DRAFT' }),
    );

    const result = await copyOrganisationEmail(userId, organisationId, emailId);

    expect(result.id).toBe(copiedId);
    expect(result.status).toBe('DRAFT');
    expect(repositoryMock.registerOrganisationEmailDraft).not.toHaveBeenCalled();
  });

  it('prevents cross-organisation discovery when scope validation fails', async () => {
    scopeMock.requireOrganisationAdminScope.mockRejectedValue(
      new scopeMock.OrganisationScopeServiceError(
        404,
        'INACCESSIBLE_ORGANISATION',
        'Inaccessible organisation',
      ),
    );

    await expect(getOrganisationEmail(userId, organisationId, emailId)).rejects.toMatchObject({
      statusCode: 404,
      error: 'INACCESSIBLE_ORGANISATION',
    });
    expect(repositoryMock.findOrganisationEmail).not.toHaveBeenCalled();
  });

  it('uses VIEW_CAMPAIGNS or MANAGE_CAMPAIGNS for reads and returns a scoped miss as 404', async () => {
    repositoryMock.findOrganisationEmail.mockResolvedValue(null);

    await expect(getOrganisationEmail(userId, organisationId, emailId)).rejects.toBeInstanceOf(
      OrganisationEmailServiceError,
    );
    expect(scopeMock.requireOrganisationAdminScope).toHaveBeenCalledWith({
      userId,
      organisationId,
      requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
    });
    expect(repositoryMock.findOrganisationEmail).toHaveBeenCalledWith(organisationId, emailId);
  });
});
