import { prisma } from '../lib/prisma.js';
import type { PhishingSimulationStatus, Weekday, Prisma } from '../generated/prisma/client.js';
import type { OrganisationEmailRecord } from './organisation-email.repository.js';
export type CreatePhishingSimulationDraftInput = {
  organisationId: string;
  campaignId: string;
  status: PhishingSimulationStatus;
  name: string | null;
  emailCount: number | null;
  startAt: Date | null;
  endAt: Date | null;
  sendFrom: string | null;
  sendUntil: string | null;
  weekdays: Weekday[];
  providerProfileIds: string[];
};

export type UpdatePhishingSimultionDraftInput = {
  organisationId: string;
  campaignId: string;
  simulationId: string;
  name?: string | null;
  emailCount?: number | null;
  startAt?: Date | null;
  endAt?: Date | null;
  sendFrom?: string | null;
  sendUntil?: string | null;
  weekdays?: Weekday[];
  providerProfileIds?: string[];
};

const phishingSimulationInclude = {
  pool: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
  },
} satisfies Prisma.PhishingSimulationInclude;
export type PhishingSimulationRecord = Prisma.PhishingSimulationGetPayload<{
  include: typeof phishingSimulationInclude;
}>;
export type PhishingSimulationPoolRepositoryState =
  | 'NOT_FOUND'
  | 'POOL_EMAIL_NOT_FOUND'
  | 'LIFECYCLE_CONFLICT';

export function createPhishingSimulationDraft(input: CreatePhishingSimulationDraftInput) {
  return prisma.phishingSimulation.create({
    data: {
      organisationId: input.organisationId,
      campaignId: input.campaignId,
      status: input.status,
      name: input.name,
      emailCount: input.emailCount,
      startAt: input.startAt,
      endAt: input.endAt,
      sendFrom: input.sendFrom,
      sendUntil: input.sendUntil,
      weekdays: input.weekdays,
      providerProfileIds: input.providerProfileIds,
    },
    include: phishingSimulationInclude,
  });
}
export function findPhishingSimulationDrafts(input: {
  organisationId: string;
  campaignId: string;
}) {
  return prisma.phishingSimulation.findMany({
    where: { organisationId: input.organisationId, campaignId: input.campaignId },
    orderBy: { updatedAt: 'desc' },
    include: phishingSimulationInclude,
  });
}
export function findPhishingSimulationDraftById(input: {
  organisationId: string;
  campaignId: string;
  simulationId: string;
}) {
  return prisma.phishingSimulation.findFirst({
    where: {
      id: input.simulationId,
      organisationId: input.organisationId,
      campaignId: input.campaignId,
    },
    include: phishingSimulationInclude,
  });
}
function isRecordNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}

export async function updatePhishingSimulationDraft(input: UpdatePhishingSimultionDraftInput) {
  try {
    return await prisma.phishingSimulation.update({
      where: {
        id: input.simulationId,
        organisationId: input.organisationId,
        campaignId: input.campaignId,
        status: 'DRAFT',
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.emailCount !== undefined ? { emailCount: input.emailCount } : {}),
        ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
        ...(input.sendFrom !== undefined ? { sendFrom: input.sendFrom } : {}),
        ...(input.sendUntil !== undefined ? { sendUntil: input.sendUntil } : {}),
        ...(input.weekdays !== undefined ? { weekdays: input.weekdays } : {}),
        ...(input.providerProfileIds !== undefined
          ? { providerProfileIds: input.providerProfileIds }
          : {}),
      },
      include: phishingSimulationInclude,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

function phishingSimulationEmailData(
  phishingSimulationId: string,
  source: OrganisationEmailRecord,
) {
  return {
    phishingSimulationId,
    sourceOrganisationEmailId: source.id,
    senderLabel: source.senderLabel,
    senderAddress: source.senderAddress,
    subject: source.subject,
    preview: source.preview,
    bodyHtml: source.bodyHtml,
    linkAnchorText: source.linkAnchorText,
    expectedClassification: source.expectedClassification,
    categories: source.categories,
    difficultyLevel: source.difficultyLevel,
    redFlags: {
      create: source.redFlags.map((redFlag) => ({
        redFlagType: redFlag.redFlagType,
        label: redFlag.label,
        description: redFlag.description,
        severity: redFlag.severity,
      })),
    },
  };
}
async function acquirePhishingSimulationLock(tx: Prisma.TransactionClient, simulationId: string) {
  const lockKey = `PHISHING_SIMULATION:${simulationId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}
async function findDraftPhishingSimulation(
  tx: Prisma.TransactionClient,
  organisationId: string,
  campaignId: string,
  simulationId: string,
) {
  const simulation = await tx.phishingSimulation.findFirst({
    where: { id: simulationId, organisationId, campaignId },
    select: { id: true, status: true },
  });

  if (simulation === null) return { state: 'NOT_FOUND' as const };
  if (simulation.status !== 'DRAFT') return { state: 'LIFECYCLE_CONFLICT' as const };

  return { state: 'DRAFT' as const, simulation };
}
export async function addPhishingSimulationEmailSnapshot(input: {
  organisationId: string;
  campaignId: string;
  simulationId: string;
  source: OrganisationEmailRecord;
}) {
  return prisma.$transaction(async (tx) => {
    await acquirePhishingSimulationLock(tx, input.simulationId);
    const parent = await findDraftPhishingSimulation(
      tx,
      input.organisationId,
      input.campaignId,
      input.simulationId,
    );

    if (parent.state !== 'DRAFT') return parent;

    const email = await tx.phishingSimulationEmail.create({
      data: phishingSimulationEmailData(parent.simulation.id, input.source),
      include: phishingSimulationInclude.pool.include,
    });

    return { state: 'CREATED' as const, email };
  });
}
export async function removePhishingSimulationEmailSnapshot(input: {
  organisationId: string;
  campaignId: string;
  simulationId: string;
  poolEmailId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await acquirePhishingSimulationLock(tx, input.simulationId);
    const parent = await findDraftPhishingSimulation(
      tx,
      input.organisationId,
      input.campaignId,
      input.simulationId,
    );

    if (parent.state !== 'DRAFT') return parent;
    const removed = await tx.phishingSimulationEmail.deleteMany({
      where: { id: input.poolEmailId, phishingSimulationId: parent.simulation.id },
    });

    if (removed.count !== 1) return { state: 'POOL_EMAIL_NOT_FOUND' as const };
    return { state: 'REMOVED' as const };
  });
}
