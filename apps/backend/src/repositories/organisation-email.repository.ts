import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

const organisationEmailInclude = {
  redFlags: {
    orderBy: [
      { redFlagType: 'asc' },
      { label: 'asc' },
      { description: 'asc' },
      { severity: 'asc' },
      { id: 'asc' },
    ],
  },
} satisfies Prisma.OrganisationEmailInclude;

export type OrganisationEmailRecord = Prisma.OrganisationEmailGetPayload<{
  include: typeof organisationEmailInclude;
}>;

export type CanonicalOrganisationEmailPersistenceInput = {
  organisationId: string;
  createdByUserId: string;
  draft: OrganisationEmailDraftInput;
  contentHash: string;
};

function createData(input: CanonicalOrganisationEmailPersistenceInput) {
  return {
    organisationId: input.organisationId,
    createdByUserId: input.createdByUserId,
    senderLabel: input.draft.senderLabel,
    senderAddress: input.draft.senderAddress,
    subject: input.draft.subject,
    preview: input.draft.preview,
    bodyHtml: input.draft.bodyHtml,
    linkAnchorText: input.draft.link?.anchorText ?? null,
    expectedClassification: input.draft.expectedClassification,
    categories: input.draft.categories,
    difficultyLevel: input.draft.difficultyLevel,
    portalTemplateId: input.draft.portalTemplateId,
    contentHash: input.contentHash,
    status: 'DRAFT' as const,
    redFlags: {
      create: input.draft.redFlags.map((redFlag) => ({
        redFlagType: redFlag.redFlagType,
        label: redFlag.label,
        description: redFlag.description,
        severity: redFlag.severity,
      })),
    },
  };
}

async function acquireContentLock(
  tx: Prisma.TransactionClient,
  organisationId: string,
  contentHash: string,
) {
  const lockKey = `${organisationId}:${contentHash}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}

async function acquireOrganisationEmailLock(tx: Prisma.TransactionClient, emailId: string) {
  const lockKey = `ORGANISATION_EMAIL:${emailId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}

export async function listOrganisationEmails(input: {
  organisationId: string;
  page: number;
  limit: number;
  search?: string;
  status?: 'DRAFT' | 'ACTIVE';
}) {
  const where: Prisma.OrganisationEmailWhereInput = {
    organisationId: input.organisationId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { senderLabel: { contains: input.search, mode: 'insensitive' } },
            { senderAddress: { contains: input.search, mode: 'insensitive' } },
            { subject: { contains: input.search, mode: 'insensitive' } },
            { preview: { contains: input.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.organisationEmail.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.organisationEmail.count({ where }),
  ]);

  return { items, total };
}

export function findOrganisationEmail(organisationId: string, emailId: string) {
  return prisma.organisationEmail.findFirst({
    where: { id: emailId, organisationId },
    include: organisationEmailInclude,
  });
}

export async function registerOrganisationEmailDraft(
  input: CanonicalOrganisationEmailPersistenceInput,
  isEquivalent: (record: OrganisationEmailRecord) => boolean,
) {
  return prisma.$transaction((tx) =>
    registerOrganisationEmailDraftInTransaction(tx, input, isEquivalent),
  );
}

export async function registerOrganisationEmailDraftInTransaction(
  tx: Prisma.TransactionClient,
  input: CanonicalOrganisationEmailPersistenceInput,
  isEquivalent: (record: OrganisationEmailRecord) => boolean,
) {
  await acquireContentLock(tx, input.organisationId, input.contentHash);
  const candidates = await tx.organisationEmail.findMany({
    where: {
      organisationId: input.organisationId,
      contentHash: input.contentHash,
    },
    include: organisationEmailInclude,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const exactMatches = candidates.filter(isEquivalent);
  const existing =
    exactMatches.find((candidate) => candidate.status === 'ACTIVE') ?? exactMatches[0];

  if (existing) {
    return { record: existing, reused: true as const };
  }

  const record = await tx.organisationEmail.create({
    data: createData(input),
    include: organisationEmailInclude,
  });
  return { record, reused: false as const };
}

export async function updateOrganisationEmailDraft(
  input: CanonicalOrganisationEmailPersistenceInput & { emailId: string },
  isEquivalent: (record: OrganisationEmailRecord) => boolean,
) {
  return prisma.$transaction(async (tx) => {
    await acquireOrganisationEmailLock(tx, input.emailId);
    const current = await tx.organisationEmail.findFirst({
      where: { id: input.emailId, organisationId: input.organisationId },
      include: organisationEmailInclude,
    });
    if (!current) return { state: 'NOT_FOUND' as const };
    if (current.status !== 'DRAFT') return { state: 'ACTIVE' as const, record: current };

    await acquireContentLock(tx, input.organisationId, input.contentHash);
    const candidates = await tx.organisationEmail.findMany({
      where: {
        organisationId: input.organisationId,
        contentHash: input.contentHash,
        id: { not: input.emailId },
      },
      include: organisationEmailInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (candidates.some(isEquivalent)) return { state: 'CONFLICT' as const };

    const record = await tx.organisationEmail.update({
      where: {
        id: input.emailId,
        organisationId: input.organisationId,
        status: 'DRAFT',
      },
      data: {
        senderLabel: input.draft.senderLabel,
        senderAddress: input.draft.senderAddress,
        subject: input.draft.subject,
        preview: input.draft.preview,
        bodyHtml: input.draft.bodyHtml,
        linkAnchorText: input.draft.link?.anchorText ?? null,
        expectedClassification: input.draft.expectedClassification,
        categories: input.draft.categories,
        difficultyLevel: input.draft.difficultyLevel,
        portalTemplateId: input.draft.portalTemplateId,
        contentHash: input.contentHash,
        redFlags: {
          deleteMany: {},
          create: input.draft.redFlags.map((redFlag) => ({
            redFlagType: redFlag.redFlagType,
            label: redFlag.label,
            description: redFlag.description,
            severity: redFlag.severity,
          })),
        },
      },
      include: organisationEmailInclude,
    });
    return { state: 'UPDATED' as const, record };
  });
}

export async function activateOrganisationEmailDraft(
  organisationId: string,
  emailId: string,
  expectedContentHash: string,
) {
  return prisma.$transaction(async (tx) => {
    await acquireOrganisationEmailLock(tx, emailId);
    const updated = await tx.organisationEmail.updateMany({
      where: {
        id: emailId,
        organisationId,
        status: 'DRAFT',
        contentHash: expectedContentHash,
      },
      data: { status: 'ACTIVE' },
    });
    if (updated.count !== 1) return null;
    return tx.organisationEmail.findFirst({
      where: { id: emailId, organisationId },
      include: organisationEmailInclude,
    });
  });
}

export async function copyActiveOrganisationEmail(input: {
  organisationId: string;
  emailId: string;
  createdByUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.organisationEmail.findFirst({
      where: {
        id: input.emailId,
        organisationId: input.organisationId,
        status: 'ACTIVE',
      },
      include: organisationEmailInclude,
    });
    if (!source) return null;

    return tx.organisationEmail.create({
      data: {
        organisationId: source.organisationId,
        createdByUserId: input.createdByUserId,
        senderLabel: source.senderLabel,
        senderAddress: source.senderAddress,
        subject: source.subject,
        preview: source.preview,
        bodyHtml: source.bodyHtml,
        linkAnchorText: source.linkAnchorText,
        expectedClassification: source.expectedClassification,
        categories: source.categories,
        difficultyLevel: source.difficultyLevel,
        portalTemplateId: source.portalTemplateId,
        contentHash: source.contentHash,
        status: 'DRAFT',
        redFlags: {
          create: source.redFlags.map((redFlag) => ({
            redFlagType: redFlag.redFlagType,
            label: redFlag.label,
            description: redFlag.description,
            severity: redFlag.severity,
          })),
        },
      },
      include: organisationEmailInclude,
    });
  });
}
