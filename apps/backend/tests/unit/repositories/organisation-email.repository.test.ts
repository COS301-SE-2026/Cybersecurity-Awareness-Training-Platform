import {
  PORTAL_TEMPLATE_IDS,
  type OrganisationEmailDraftInput,
  type PortalTemplateId,
} from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as OrganisationEmailRepository from '../../../src/repositories/organisation-email.repository.js';

const prismaMock = vi.hoisted(() => {
  const transactionClient = {
    $executeRaw: vi.fn(),
    organisationEmail: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return {
    transactionClient,
    prisma: {
      organisationEmail: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn((callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient),
      ),
    },
  };
});

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: prismaMock.prisma }));

const organisationId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

const draft: OrganisationEmailDraftInput = {
  senderLabel: 'Security',
  senderAddress: 'security@example.test',
  subject: 'Review',
  preview: 'Review now',
  bodyHtml: '<p>{{SYSTEM_LINK}}</p>',
  link: { anchorText: 'Review' },
  expectedClassification: 'PHISHING',
  redFlags: [
    {
      redFlagType: 'LINK',
      label: 'Link',
      description: 'Unexpected destination',
      severity: 'HIGH',
    },
  ],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
  difficultyLevel: 'MEDIUM',
  portalTemplateId: null,
};

function record(
  id: string,
  status: 'DRAFT' | 'ACTIVE',
  createdAt: Date,
  portalTemplateId: PortalTemplateId | null = null,
) {
  return {
    id,
    organisationId,
    createdByUserId: userId,
    senderLabel: draft.senderLabel,
    senderAddress: draft.senderAddress,
    subject: draft.subject,
    preview: draft.preview,
    bodyHtml: draft.bodyHtml,
    linkAnchorText: draft.link?.anchorText ?? null,
    portalTemplateId,
    expectedClassification: draft.expectedClassification,
    categories: draft.categories,
    difficultyLevel: draft.difficultyLevel,
    contentHash: 'a'.repeat(64),
    status,
    createdAt,
    updatedAt: createdAt,
    redFlags: [] as Array<{
      id: string;
      simulatedEmailId: null;
      organisationEmailId: string;
      redFlagType: 'LINK';
      label: string;
      description: string;
      severity: 'HIGH';
      createdAt: Date;
      updatedAt: Date;
    }>,
  };
}

describe('organisation email repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock.transactionClient) => unknown) =>
        callback(prismaMock.transactionClient),
    );
  });

  it('takes an organisation-content advisory lock and prefers an ACTIVE exact match', async () => {
    const oldestDraft = record('draft-oldest', 'DRAFT', new Date('2026-01-01'));
    const active = record('active', 'ACTIVE', new Date('2026-02-01'));
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([
      oldestDraft,
      active,
    ]);

    const result = await OrganisationEmailRepository.registerOrganisationEmailDraft(
      {
        organisationId,
        createdByUserId: userId,
        draft,
        contentHash: 'a'.repeat(64),
      },
      () => true,
    );

    expect(result).toEqual({ record: active, reused: true });
    expect(prismaMock.transactionClient.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.transactionClient.$executeRaw.mock.calls[0]?.[1]).toBe(
      `${organisationId}:${'a'.repeat(64)}`,
    );
    expect(prismaMock.transactionClient.organisationEmail.create).not.toHaveBeenCalled();
  });

  it('prefers the oldest DRAFT when no ACTIVE exact match exists', async () => {
    const oldest = record('oldest', 'DRAFT', new Date('2026-01-01'));
    const newest = record('newest', 'DRAFT', new Date('2026-02-01'));
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([oldest, newest]);

    const result = await OrganisationEmailRepository.registerOrganisationEmailDraft(
      {
        organisationId,
        createdByUserId: userId,
        draft,
        contentHash: 'a'.repeat(64),
      },
      () => true,
    );

    expect(result.record).toBe(oldest);
    expect(result.reused).toBe(true);
  });

  it('persists a null preview without translating it to a blank string', async () => {
    const nullableDraft = { ...draft, preview: null };
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([]);
    prismaMock.transactionClient.organisationEmail.create.mockResolvedValue(
      record('created', 'DRAFT', new Date('2026-03-01')),
    );

    await OrganisationEmailRepository.registerOrganisationEmailDraft(
      {
        organisationId,
        createdByUserId: userId,
        draft: nullableDraft,
        contentHash: 'a'.repeat(64),
      },
      () => false,
    );

    expect(prismaMock.transactionClient.organisationEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ preview: null, portalTemplateId: null }),
      }),
    );
  });

  it.each(PORTAL_TEMPLATE_IDS)('persists the selected portal template %s', async (templateId) => {
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([]);
    prismaMock.transactionClient.organisationEmail.create.mockResolvedValue(
      record('created', 'DRAFT', new Date('2026-03-01'), templateId),
    );

    const result = await OrganisationEmailRepository.registerOrganisationEmailDraft(
      {
        organisationId,
        createdByUserId: userId,
        draft,
        contentHash: 'a'.repeat(64),
        portalTemplateId: templateId,
      },
      () => false,
    );

    expect(prismaMock.transactionClient.organisationEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ portalTemplateId: templateId }),
      }),
    );
    expect(result.record.portalTemplateId).toBe(templateId);
  });

  it('does not reuse equivalent authored content with a different portal snapshot', async () => {
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([
      record('different-template', 'ACTIVE', new Date('2026-02-01'), 'GENERIC_ACCOUNT_LOGIN_V1'),
    ]);
    prismaMock.transactionClient.organisationEmail.create.mockResolvedValue(
      record('created', 'DRAFT', new Date('2026-03-01'), 'GENERIC_DOCUMENT_ACCESS_V1'),
    );

    const result = await OrganisationEmailRepository.registerOrganisationEmailDraft(
      {
        organisationId,
        createdByUserId: userId,
        draft,
        contentHash: 'a'.repeat(64),
        portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1',
      },
      () => true,
    );

    expect(result.reused).toBe(false);
  });

  it('creates one Draft when concurrent registrations resolve under the transaction lock', async () => {
    let stored: ReturnType<typeof record> | null = null;
    let transactionTail = Promise.resolve();
    prismaMock.prisma.$transaction.mockImplementation(async (callback) => {
      let release: () => void = () => {};
      const previous = transactionTail;
      transactionTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback(prismaMock.transactionClient);
      } finally {
        release();
      }
    });
    prismaMock.transactionClient.organisationEmail.findMany.mockImplementation(async () =>
      stored ? [stored] : [],
    );
    prismaMock.transactionClient.organisationEmail.create.mockImplementation(async () => {
      stored = record('created', 'DRAFT', new Date('2026-03-01'));
      return stored;
    });

    const input = {
      organisationId,
      createdByUserId: userId,
      draft,
      contentHash: 'a'.repeat(64),
    };
    const [first, second] = await Promise.all([
      OrganisationEmailRepository.registerOrganisationEmailDraft(input, () => true),
      OrganisationEmailRepository.registerOrganisationEmailDraft(input, () => true),
    ]);

    expect(prismaMock.transactionClient.organisationEmail.create).toHaveBeenCalledTimes(1);
    expect([first.reused, second.reused].sort()).toEqual([false, true]);
  });

  it('returns a conflict without changing identity when a Draft matches another record', async () => {
    prismaMock.transactionClient.organisationEmail.findFirst.mockResolvedValue(
      record('target', 'DRAFT', new Date('2026-01-01')),
    );
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([
      record('equivalent', 'ACTIVE', new Date('2026-02-01')),
    ]);

    const result = await OrganisationEmailRepository.updateOrganisationEmailDraft(
      {
        organisationId,
        emailId: 'target',
        createdByUserId: userId,
      },
      () => ({
        draft,
        contentHash: 'a'.repeat(64),
        isEquivalent: () => true,
      }),
    );

    expect(result).toEqual({ state: 'CONFLICT' });
    expect(prismaMock.transactionClient.$executeRaw.mock.calls[0]?.[1]).toBe(
      'ORGANISATION_EMAIL:target',
    );
    expect(prismaMock.transactionClient.organisationEmail.update).not.toHaveBeenCalled();
  });

  it('preserves an existing portal snapshot when an update omits the field', async () => {
    prismaMock.transactionClient.organisationEmail.findFirst.mockResolvedValue(
      record('target', 'DRAFT', new Date('2026-01-01'), 'GENERIC_BANKING_LOGIN_V1'),
    );
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([]);
    prismaMock.transactionClient.organisationEmail.update.mockResolvedValue(
      record('target', 'DRAFT', new Date('2026-01-01'), 'GENERIC_BANKING_LOGIN_V1'),
    );

    await OrganisationEmailRepository.updateOrganisationEmailDraft(
      {
        organisationId,
        emailId: 'target',
        createdByUserId: userId,
      },
      (currentPortalTemplateId) => {
        expect(currentPortalTemplateId).toBe('GENERIC_BANKING_LOGIN_V1');
        return {
          draft: { ...draft, portalTemplateId: currentPortalTemplateId },
          contentHash: 'a'.repeat(64),
          isEquivalent: () => true,
        };
      },
    );

    const update = prismaMock.transactionClient.organisationEmail.update.mock.calls[0]?.[0];
    expect(update.data).not.toHaveProperty('portalTemplateId');
  });

  it('updates a portal snapshot when the field is supplied', async () => {
    prismaMock.transactionClient.organisationEmail.findFirst.mockResolvedValue(
      record('target', 'DRAFT', new Date('2026-01-01')),
    );
    prismaMock.transactionClient.organisationEmail.findMany.mockResolvedValue([]);
    prismaMock.transactionClient.organisationEmail.update.mockResolvedValue(
      record('target', 'DRAFT', new Date('2026-01-01'), 'GENERIC_ACCOUNT_LOGIN_V1'),
    );

    await OrganisationEmailRepository.updateOrganisationEmailDraft(
      {
        organisationId,
        emailId: 'target',
        createdByUserId: userId,
      },
      () => ({
        draft: { ...draft, portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1' },
        contentHash: 'a'.repeat(64),
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        isEquivalent: () => true,
      }),
    );

    expect(prismaMock.transactionClient.organisationEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1' }),
      }),
    );
  });

  it('activates only the validated content version', async () => {
    prismaMock.transactionClient.organisationEmail.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.transactionClient.organisationEmail.findFirst.mockResolvedValue(
      record('target', 'ACTIVE', new Date('2026-01-01')),
    );

    await OrganisationEmailRepository.activateOrganisationEmailDraft(
      organisationId,
      'target',
      'a'.repeat(64),
    );

    expect(prismaMock.transactionClient.$executeRaw.mock.calls[0]?.[1]).toBe(
      'ORGANISATION_EMAIL:target',
    );
    expect(prismaMock.transactionClient.organisationEmail.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'target',
        organisationId,
        status: 'DRAFT',
        contentHash: 'a'.repeat(64),
      },
      data: { status: 'ACTIVE' },
    });
  });

  it('copies an ACTIVE record with new red-flag identities and bypasses hash deduplication', async () => {
    const source = record('source', 'ACTIVE', new Date('2026-01-01'), 'GENERIC_DOCUMENT_ACCESS_V1');
    source.redFlags.push({
      id: 'source-red-flag',
      simulatedEmailId: null,
      organisationEmailId: 'source',
      redFlagType: 'LINK',
      label: 'Link',
      description: 'Unexpected destination',
      severity: 'HIGH',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });
    prismaMock.transactionClient.organisationEmail.findFirst.mockResolvedValue(source);
    prismaMock.transactionClient.organisationEmail.create.mockResolvedValue(
      record('copy', 'DRAFT', new Date('2026-02-01')),
    );

    await OrganisationEmailRepository.copyActiveOrganisationEmail({
      organisationId,
      emailId: source.id,
      createdByUserId: userId,
    });

    expect(prismaMock.transactionClient.organisationEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentHash: source.contentHash,
          status: 'DRAFT',
          portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1',
          redFlags: {
            create: [
              {
                redFlagType: 'LINK',
                label: 'Link',
                description: 'Unexpected destination',
                severity: 'HIGH',
              },
            ],
          },
        }),
      }),
    );
  });
});
