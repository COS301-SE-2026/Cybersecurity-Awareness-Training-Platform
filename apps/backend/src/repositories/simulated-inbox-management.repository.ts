import type {
  ActivationValidationIssue,
  OrganisationEmailDraftInput,
  PortalTemplateId,
  ReorderSimulatedInboxEmailsRequest,
} from '@insightful-phish/shared';
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  registerOrganisationEmailDraftInTransaction,
  type CanonicalOrganisationEmailPersistenceInput,
  type OrganisationEmailRecord,
} from './organisation-email.repository.js';

const snapshotInclude = {
  redFlags: {
    orderBy: [
      { redFlagType: 'asc' },
      { label: 'asc' },
      { description: 'asc' },
      { severity: 'asc' },
      { id: 'asc' },
    ],
  },
} satisfies Prisma.SimulatedEmailInclude;

const managementInclude = {
  simulatedInbox: {
    include: {
      emails: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        include: snapshotInclude,
      },
    },
  },
} satisfies Prisma.SimulationInclude;

export type SimulatedInboxManagementRecord = Prisma.SimulationGetPayload<{
  include: typeof managementInclude;
}>;

export type SimulatedInboxSnapshotRecord = Prisma.SimulatedEmailGetPayload<{
  include: typeof snapshotInclude;
}>;

export type SimulatedInboxRepositoryState = 'NOT_FOUND' | 'ACTIVE' | 'INVALID_ORDER';

function snapshotData(
  inboxId: string,
  position: number,
  sourceOrganisationEmailId: string | null,
  portalTemplateId: PortalTemplateId | null,
  draft: OrganisationEmailDraftInput,
) {
  return {
    inboxId,
    sourceOrganisationEmailId,
    position,
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
    redFlags: {
      create: draft.redFlags.map((redFlag) => ({
        redFlagType: redFlag.redFlagType,
        label: redFlag.label,
        description: redFlag.description,
        severity: redFlag.severity,
      })),
    },
  };
}

function libraryRecordToDraft(record: OrganisationEmailRecord): OrganisationEmailDraftInput {
  return {
    senderLabel: record.senderLabel,
    senderAddress: record.senderAddress,
    subject: record.subject,
    preview: record.preview,
    bodyHtml: record.bodyHtml,
    link: record.linkAnchorText === null ? null : { anchorText: record.linkAnchorText },
    expectedClassification: record.expectedClassification,
    redFlags: record.redFlags.map((redFlag) => ({
      redFlagType: redFlag.redFlagType,
      label: redFlag.label,
      description: redFlag.description,
      severity: redFlag.severity,
    })),
    categories: record.categories,
    difficultyLevel: record.difficultyLevel,
    portalTemplateId: record.portalTemplateId,
  };
}

async function acquireInboxLock(tx: Prisma.TransactionClient, simulationId: string) {
  const lockKey = `SIMULATED_INBOX:${simulationId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}

async function findDraftParent(
  tx: Prisma.TransactionClient,
  organisationId: string,
  simulationId: string,
) {
  const simulation = await tx.simulation.findFirst({
    where: {
      id: simulationId,
      organisationId,
      simulationType: 'SIMULATED_INBOX',
      OR: [
        { safetyStatus: 'DRAFT' },
        { safetyStatus: 'APPROVED', simulatedInbox: { status: 'ACTIVE' } },
      ],
    },
    include: {
      simulatedInbox: {
        include: {
          emails: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: { id: true, position: true },
          },
        },
      },
    },
  });
  if (!simulation?.simulatedInbox) return { state: 'NOT_FOUND' as const };
  if (simulation.safetyStatus !== 'DRAFT') return { state: 'ACTIVE' as const };
  return {
    state: 'DRAFT' as const,
    simulation: { ...simulation, simulatedInbox: simulation.simulatedInbox },
  };
}

function nextPosition(emails: Array<{ position: number }>) {
  return emails.reduce((maximum, email) => Math.max(maximum, email.position), -1) + 1;
}

export async function listSimulatedInboxes(input: {
  organisationId: string;
  page: number;
  limit: number;
  search?: string;
  lifecycleStatus?: 'DRAFT' | 'ACTIVE';
}) {
  let lifecycleWhere: Prisma.SimulationWhereInput = {
    OR: [
      { safetyStatus: 'DRAFT' },
      { safetyStatus: 'APPROVED', simulatedInbox: { status: 'ACTIVE' } },
    ],
  };
  if (input.lifecycleStatus === 'DRAFT') {
    lifecycleWhere = { safetyStatus: 'DRAFT' };
  } else if (input.lifecycleStatus === 'ACTIVE') {
    lifecycleWhere = { safetyStatus: 'APPROVED', simulatedInbox: { status: 'ACTIVE' } };
  }
  const where: Prisma.SimulationWhereInput = {
    organisationId: input.organisationId,
    simulationType: 'SIMULATED_INBOX',
    AND: [
      lifecycleWhere,
      input.search
        ? {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await prisma.$transaction([
    prisma.simulation.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: {
        simulatedInbox: {
          select: {
            status: true,
            _count: { select: { emails: true } },
          },
        },
      },
    }),
    prisma.simulation.count({ where }),
  ]);
  return { items, total };
}

export function findSimulatedInbox(organisationId: string, simulationId: string) {
  return prisma.simulation.findFirst({
    where: {
      id: simulationId,
      organisationId,
      simulationType: 'SIMULATED_INBOX',
      OR: [
        { safetyStatus: 'DRAFT' },
        { safetyStatus: 'APPROVED', simulatedInbox: { status: 'ACTIVE' } },
      ],
    },
    include: managementInclude,
  });
}

export function createSimulatedInboxDraft(input: {
  organisationId: string;
  createdByUserId: string;
  title: string;
  description: string;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
}) {
  return prisma.simulation.create({
    data: {
      organisationId: input.organisationId,
      createdByUserId: input.createdByUserId,
      simulationType: 'SIMULATED_INBOX',
      title: input.title,
      description: input.description,
      objective: null,
      difficultyLevel: input.difficultyLevel,
      safetyStatus: 'DRAFT',
      simulatedInbox: {
        create: {
          title: input.title,
          description: input.description,
          status: 'ARCHIVED',
        },
      },
    },
    include: managementInclude,
  });
}

export async function updateSimulatedInboxDraftMetadata(input: {
  organisationId: string;
  simulationId: string;
  title?: string;
  description?: string;
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const parent = await findDraftParent(tx, input.organisationId, input.simulationId);
    if (parent.state !== 'DRAFT') return parent;
    const title = input.title ?? parent.simulation.title;
    const description = input.description ?? parent.simulation.description ?? '';
    const record = await tx.simulation.update({
      where: {
        id: input.simulationId,
        organisationId: input.organisationId,
        simulationType: 'SIMULATED_INBOX',
        safetyStatus: 'DRAFT',
      },
      data: {
        title,
        description,
        ...(input.difficultyLevel ? { difficultyLevel: input.difficultyLevel } : {}),
        simulatedInbox: {
          update: { title, description },
        },
      },
      include: managementInclude,
    });
    return { state: 'UPDATED' as const, record };
  });
}

export async function addAuthoredEmailSnapshot(input: {
  organisationId: string;
  simulationId: string;
  registration: CanonicalOrganisationEmailPersistenceInput;
  isEquivalent: (record: OrganisationEmailRecord) => boolean;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const parent = await findDraftParent(tx, input.organisationId, input.simulationId);
    if (parent.state !== 'DRAFT') return parent;
    const registration = await registerOrganisationEmailDraftInTransaction(
      tx,
      input.registration,
      input.isEquivalent,
    );
    const email = await tx.simulatedEmail.create({
      data: snapshotData(
        parent.simulation.simulatedInbox.id,
        nextPosition(parent.simulation.simulatedInbox.emails),
        registration.record.id,
        registration.record.portalTemplateId,
        input.registration.draft,
      ),
      include: snapshotInclude,
    });
    return {
      state: 'CREATED' as const,
      email,
      sourceOrganisationEmailId: registration.record.id,
      libraryEmailReused: registration.reused,
    };
  });
}

export async function addActiveLibraryEmailSnapshot(input: {
  organisationId: string;
  simulationId: string;
  organisationEmailId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const parent = await findDraftParent(tx, input.organisationId, input.simulationId);
    if (parent.state !== 'DRAFT') return parent;
    const source = await tx.organisationEmail.findFirst({
      where: {
        id: input.organisationEmailId,
        organisationId: input.organisationId,
        status: 'ACTIVE',
      },
      include: {
        redFlags: {
          orderBy: [
            { redFlagType: 'asc' },
            { label: 'asc' },
            { description: 'asc' },
            { severity: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });
    if (!source) return { state: 'LIBRARY_EMAIL_NOT_FOUND' as const };
    const email = await tx.simulatedEmail.create({
      data: snapshotData(
        parent.simulation.simulatedInbox.id,
        nextPosition(parent.simulation.simulatedInbox.emails),
        source.id,
        source.portalTemplateId,
        libraryRecordToDraft(source),
      ),
      include: snapshotInclude,
    });
    return {
      state: 'CREATED' as const,
      email,
      sourceOrganisationEmailId: source.id,
      libraryEmailReused: true,
    };
  });
}

export async function updateSimulatedInboxSnapshot(input: {
  organisationId: string;
  simulationId: string;
  emailId: string;
  draft: OrganisationEmailDraftInput;
  portalTemplateId?: PortalTemplateId | null;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const parent = await findDraftParent(tx, input.organisationId, input.simulationId);
    if (parent.state !== 'DRAFT') return parent;
    const existing = await tx.simulatedEmail.findFirst({
      where: { id: input.emailId, inboxId: parent.simulation.simulatedInbox.id },
    });
    if (!existing) return { state: 'EMAIL_NOT_FOUND' as const };
    const email = await tx.simulatedEmail.update({
      where: { id: existing.id, inboxId: parent.simulation.simulatedInbox.id },
      data: {
        senderLabel: input.draft.senderLabel,
        senderAddress: input.draft.senderAddress,
        subject: input.draft.subject,
        preview: input.draft.preview,
        bodyHtml: input.draft.bodyHtml,
        linkAnchorText: input.draft.link?.anchorText ?? null,
        ...(input.portalTemplateId !== undefined
          ? { portalTemplateId: input.portalTemplateId }
          : {}),
        expectedClassification: input.draft.expectedClassification,
        categories: input.draft.categories,
        difficultyLevel: input.draft.difficultyLevel,
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
      include: snapshotInclude,
    });
    return { state: 'UPDATED' as const, email };
  });
}

export async function removeSimulatedInboxSnapshot(input: {
  organisationId: string;
  simulationId: string;
  emailId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const parent = await findDraftParent(tx, input.organisationId, input.simulationId);
    if (parent.state !== 'DRAFT') return parent;
    const existing = parent.simulation.simulatedInbox.emails.find(
      (email) => email.id === input.emailId,
    );
    if (!existing) return { state: 'EMAIL_NOT_FOUND' as const };
    await tx.simulatedEmail.delete({
      where: { id: existing.id, inboxId: parent.simulation.simulatedInbox.id },
    });
    const following = parent.simulation.simulatedInbox.emails.filter(
      (email) => email.position > existing.position,
    );
    if (following.length > 0) {
      const offset =
        Math.max(...parent.simulation.simulatedInbox.emails.map((email) => email.position)) +
        following.length +
        1;
      await tx.simulatedEmail.updateMany({
        where: {
          inboxId: parent.simulation.simulatedInbox.id,
          position: { gt: existing.position },
        },
        data: { position: { increment: offset } },
      });
      await tx.simulatedEmail.updateMany({
        where: {
          inboxId: parent.simulation.simulatedInbox.id,
          position: { gt: existing.position + offset },
        },
        data: { position: { decrement: offset + 1 } },
      });
    }
    return { state: 'REMOVED' as const };
  });
}

export async function reorderSimulatedInboxSnapshots(input: {
  organisationId: string;
  simulationId: string;
  order: ReorderSimulatedInboxEmailsRequest['emails'];
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const parent = await findDraftParent(tx, input.organisationId, input.simulationId);
    if (parent.state !== 'DRAFT') return parent;
    const currentIds = new Set(parent.simulation.simulatedInbox.emails.map((email) => email.id));
    const requestedIds = new Set(input.order.map((email) => email.emailId));
    const positions = [...input.order.map((email) => email.position)].sort((a, b) => a - b);
    if (
      input.order.length !== currentIds.size ||
      requestedIds.size !== currentIds.size ||
      [...requestedIds].some((id) => !currentIds.has(id)) ||
      positions.some((position, index) => position !== index)
    ) {
      return { state: 'INVALID_ORDER' as const };
    }
    if (input.order.length > 0) {
      const maximum = Math.max(
        ...parent.simulation.simulatedInbox.emails.map((email) => email.position),
      );
      const offset = maximum + input.order.length + 1;
      await tx.simulatedEmail.updateMany({
        where: { inboxId: parent.simulation.simulatedInbox.id },
        data: { position: { increment: offset } },
      });
      for (const item of input.order) {
        await tx.simulatedEmail.update({
          where: { id: item.emailId, inboxId: parent.simulation.simulatedInbox.id },
          data: { position: item.position },
        });
      }
    }
    const record = await tx.simulation.findUniqueOrThrow({
      where: { id: input.simulationId },
      include: managementInclude,
    });
    return { state: 'REORDERED' as const, record };
  });
}

export async function activateSimulatedInbox(input: {
  organisationId: string;
  simulationId: string;
  validate: (record: SimulatedInboxManagementRecord) => ActivationValidationIssue[];
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const record = await tx.simulation.findFirst({
      where: {
        id: input.simulationId,
        organisationId: input.organisationId,
        simulationType: 'SIMULATED_INBOX',
      },
      include: managementInclude,
    });
    if (!record?.simulatedInbox) return { state: 'NOT_FOUND' as const };
    if (record.safetyStatus !== 'DRAFT') return { state: 'ACTIVE' as const };
    const issues = input.validate(record);
    if (issues.length > 0) return { state: 'INVALID' as const, issues };
    await tx.simulation.update({
      where: {
        id: record.id,
        organisationId: input.organisationId,
        simulationType: 'SIMULATED_INBOX',
        safetyStatus: 'DRAFT',
      },
      data: { safetyStatus: 'APPROVED' },
    });
    await tx.simulatedInbox.update({
      where: { id: record.simulatedInbox.id, simulationId: record.id },
      data: { status: 'ACTIVE' },
    });
    const activated = await tx.simulation.findUniqueOrThrow({
      where: { id: record.id },
      include: managementInclude,
    });
    return { state: 'ACTIVATED' as const, record: activated };
  });
}

export async function copyActiveSimulatedInbox(input: {
  organisationId: string;
  simulationId: string;
  createdByUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireInboxLock(tx, input.simulationId);
    const source = await tx.simulation.findFirst({
      where: {
        id: input.simulationId,
        organisationId: input.organisationId,
        simulationType: 'SIMULATED_INBOX',
        safetyStatus: 'APPROVED',
        simulatedInbox: { status: 'ACTIVE' },
      },
      include: managementInclude,
    });
    if (!source?.simulatedInbox) return null;
    const title = `${source.title} (Copy)`;
    return tx.simulation.create({
      data: {
        organisationId: input.organisationId,
        createdByUserId: input.createdByUserId,
        simulationType: 'SIMULATED_INBOX',
        title,
        description: source.description,
        objective: source.objective,
        difficultyLevel: source.difficultyLevel,
        safetyStatus: 'DRAFT',
        simulatedInbox: {
          create: {
            title,
            description: source.description,
            status: 'ARCHIVED',
            emails: {
              create: source.simulatedInbox.emails.map((email) => ({
                sourceOrganisationEmailId: email.sourceOrganisationEmailId,
                position: email.position,
                senderLabel: email.senderLabel,
                senderAddress: email.senderAddress,
                subject: email.subject,
                preview: email.preview,
                bodyHtml: email.bodyHtml,
                linkAnchorText: email.linkAnchorText,
                portalTemplateId: email.portalTemplateId,
                receivedAt: email.receivedAt,
                expectedClassification: email.expectedClassification,
                categories: email.categories,
                difficultyLevel: email.difficultyLevel,
                redFlags: {
                  create: email.redFlags.map((redFlag) => ({
                    redFlagType: redFlag.redFlagType,
                    label: redFlag.label,
                    description: redFlag.description,
                    severity: redFlag.severity,
                  })),
                },
              })),
            },
          },
        },
      },
      include: managementInclude,
    });
  });
}
