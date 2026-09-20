import { prisma } from '../lib/prisma.js';
import type {
  PhishingSimulationStatus,
  Weekday,
  Prisma,
  CampaignStatus,
  EmailProviderProfileStatus,
  PhishingSimulationStopReason,
} from '../generated/prisma/client.js';
import type { OrganisationEmailRecord } from './organisation-email.repository.js';
import * as CampaignAssignmentRepository from './campaign-assignment.repository.js';
import * as EmailProviderProfileRepository from './email-provider-profile.repository.js';
import type { EmailDeliveryRepositoryClient } from './email-delivery.repository.js';
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
const phishingSimulationDetailInclude = {
  ...phishingSimulationInclude,
  recipients: { orderBy: [{ snapshottedAt: 'asc' }, { id: 'asc' }] },
  messages: { orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.PhishingSimulationInclude;
const phishingSimulationMessageQueueInclude = {
  recipient: true,
  phishingSimulation: { select: { id: true, organisationId: true, status: true, endAt: true } },
} satisfies Prisma.PhishingSimulationMessageInclude;
export type PhishingSimulationRecord = Prisma.PhishingSimulationGetPayload<{
  include: typeof phishingSimulationInclude;
}>;
export type PhishingSimulationPoolRepositoryState =
  | 'NOT_FOUND'
  | 'POOL_EMAIL_NOT_FOUND'
  | 'LIFECYCLE_CONFLICT';
export type PhishingSimulationLaunchState = {
  simulation: PhishingSimulationRecord;
  campaign: { id: string; status: CampaignStatus; startDate: Date | null; endDate: Date | null };
  hasEligibleRecipient: boolean;
  organisationProviderProfiles: Array<{ id: string; status: EmailProviderProfileStatus }>;
};
export type LaunchPhishingSimulationInput = {
  organisationId: string;
  campaignId: string;
  simulationId: string;
  platformProviderProfileId: string;
  validate: (state: PhishingSimulationLaunchState) => void;
};
export type PhishingSimulationPlannedMessageInput = {
  poolEmailId: string;
  providerProfileId: string;
  scheduledFor: Date;
  portalTemplateId: PhishingSimulationRecord['pool'][number]['portalTemplateId'];
};
export type PhishingSimulationPlannedRecipientInput = {
  campaignAssignmentId: string;
  traineeProfileId: string;
  recipientEmail: string;
  recipientFirstName: string;
  recipientLastName: string;
  messages: PhishingSimulationPlannedMessageInput[];
};
export type PhishingSimulationStartState = {
  simulation: PhishingSimulationRecord;
  campaign: { id: string; status: CampaignStatus; startDate: Date | null; endDate: Date | null };
  eligibleRecipients: Awaited<
    ReturnType<typeof CampaignAssignmentRepository.findEligibleCampaignRecipients>
  >;
  startedAt: Date;
};
export type PhishingSimulationStartPlan =
  | { state: 'STOPPED'; stopReason: PhishingSimulationStopReason }
  | { state: 'RUNNING'; recipients: PhishingSimulationPlannedRecipientInput[] };
export type StartPhishingSimulationInput = {
  simulationId: string;
  startedAt: Date;
  plan: (state: PhishingSimulationStartState) => PhishingSimulationStartPlan;
};
export type PhishingSimulationDetailRecord = Prisma.PhishingSimulationGetPayload<{
  include: typeof phishingSimulationDetailInclude;
}>;
export type PhishingSimulationMessageQueueRecord = Prisma.PhishingSimulationMessageGetPayload<{
  include: typeof phishingSimulationMessageQueueInclude;
}>;
export type PhishingSimulationMessageQueueState = {
  message: PhishingSimulationMessageQueueRecord;
  poolEmail: PhishingSimulationRecord['pool'][number];
};
export type QueuePhishingSimulationMessageInput = {
  phishingSimulationId: string;
  messageId: string;
  queuedAt: Date;
  enqueue: (
    state: PhishingSimulationMessageQueueState,
    client: EmailDeliveryRepositoryClient,
  ) => Promise<{
    deliveryLogId: string;
    trackingTokenHash: string | null;
    trackingTokenExpiresAt: Date | null;
  }>;
};
export type PhishingSimulationMessageAttemptState = {
  simulation: {
    status: PhishingSimulationStatus;
    endAt: Date | null;
    sendFrom: string | null;
    sendUntil: string | null;
    weekdays: Weekday[];
  };
  campaign: { status: CampaignStatus; startDate: Date | null; endDate: Date | null } | null;
  checkedAt: Date;
};
export type PhishingSimulationMessageAttemptDecision =
  | { state: 'READY' }
  | { state: 'RETRY_SCHEDULED'; nextAttemptAt: Date; reasonCode: string }
  | { state: 'CANCELLED'; reasonCode: string }
  | { state: 'FAILED'; reasonCode: string };
export type PreparePhishingSimulationMessageAttemptInput = {
  phishingSimulationId: string;
  messageId: string;
  providerProfileId: string;
  deliveryLogId: string;
  jobId: string;
  leaseOwner: string;
  checkedAt: Date;
  actualFromAddress: string;
  actualFromName: string | null;
  actualReplyTo: string | null;
  validate: (
    state: PhishingSimulationMessageAttemptState,
  ) => PhishingSimulationMessageAttemptDecision;
};

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
    include: phishingSimulationDetailInclude,
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
    portalTemplateId: source.portalTemplateId,
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

async function acquirePhishingSimulationLaunchLocks(
  tx: Prisma.TransactionClient,
  organisationId: string,
  campaignId: string,
  simulationId: string,
) {
  await acquirePhishingSimulationLock(tx, simulationId);
  await tx.$queryRaw`SELECT "id" FROM "Campaign" WHERE "id" = ${campaignId} AND "organisationId" = ${organisationId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "PhishingSimulation" WHERE "id" = ${simulationId} AND "organisationId" = ${organisationId} AND "campaignId" = ${campaignId} FOR UPDATE`;
}

export function launchPhishingSimulation(input: LaunchPhishingSimulationInput) {
  return prisma.$transaction(async (tx) => {
    await acquirePhishingSimulationLaunchLocks(
      tx,
      input.organisationId,
      input.campaignId,
      input.simulationId,
    );
    const simulation = await tx.phishingSimulation.findFirst({
      where: {
        id: input.simulationId,
        organisationId: input.organisationId,
        campaignId: input.campaignId,
      },
      include: phishingSimulationInclude,
    });

    if (simulation === null) return { state: 'NOT_FOUND' as const };
    if (simulation.status !== 'DRAFT') return { state: 'LIFECYCLE_CONFLICT' as const };

    const campaign = await tx.campaign.findFirst({
      where: { id: input.campaignId, organisationId: input.organisationId },
      select: { id: true, status: true, startDate: true, endDate: true },
    });
    if (campaign === null) return { state: 'CAMPAIGN_NOT_FOUND' as const };

    const eligibleRecipient = await CampaignAssignmentRepository.findEligibleCampaignRecipient(
      input.organisationId,
      input.campaignId,
      tx,
    );
    const organisationProviderProfileIds = Array.from(
      new Set(
        simulation.providerProfileIds.filter(
          (providerProfileId) => providerProfileId !== input.platformProviderProfileId,
        ),
      ),
    ).sort((leftProviderProfileId, rightProviderProfileId) =>
      leftProviderProfileId.localeCompare(rightProviderProfileId),
    );
    const organisationProviderProfiles: PhishingSimulationLaunchState['organisationProviderProfiles'] =
      [];

    for (const providerProfileId of organisationProviderProfileIds) {
      const profile = await EmailProviderProfileRepository.findEmailProviderProfileWithLock(
        tx,
        input.organisationId,
        providerProfileId,
      );
      if (profile !== null)
        organisationProviderProfiles.push({ id: profile.id, status: profile.status });
    }

    input.validate({
      simulation,
      campaign,
      hasEligibleRecipient: eligibleRecipient !== null,
      organisationProviderProfiles,
    });
    const scheduledSimulation = await tx.phishingSimulation.update({
      where: { id: simulation.id, status: 'DRAFT' },
      data: { status: 'SCHEDULED' },
      include: phishingSimulationInclude,
    });
    return { state: 'SCHEDULED' as const, simulation: scheduledSimulation };
  });
}

export function findDuePhishingSimulationIds(dueAt: Date) {
  return prisma.phishingSimulation.findMany({
    where: { status: 'SCHEDULED', startAt: { lte: dueAt } },
    select: { id: true },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
  });
}
export function startPhishingSimulation(input: StartPhishingSimulationInput) {
  return prisma.$transaction(async (tx) => {
    await acquirePhishingSimulationLock(tx, input.simulationId);
    const simulation = await tx.phishingSimulation.findUnique({
      where: { id: input.simulationId },
      include: phishingSimulationInclude,
    });
    if (simulation === null || simulation.status !== 'SCHEDULED')
      return { state: 'NO_OP' as const };

    await tx.$queryRaw`SELECT "id" FROM "Campaign" WHERE "id" = ${simulation.campaignId} AND "organisationId" = ${simulation.organisationId} FOR UPDATE`;
    const campaign = await tx.campaign.findFirst({
      where: { id: simulation.campaignId, organisationId: simulation.organisationId },
      select: { id: true, status: true, startDate: true, endDate: true },
    });
    if (campaign === null) return { state: 'NO_OP' as const };

    const eligibleRecipients = await CampaignAssignmentRepository.findEligibleCampaignRecipients(
      simulation.organisationId,
      simulation.campaignId,
      tx,
    );
    const plan = input.plan({
      simulation,
      campaign,
      eligibleRecipients,
      startedAt: input.startedAt,
    });
    if (plan.state === 'STOPPED') {
      await tx.phishingSimulation.update({
        where: { id: simulation.id, status: 'SCHEDULED' },
        data: { status: 'STOPPED', stopReason: plan.stopReason },
      });
      return { state: 'STOPPED' as const, stopReason: plan.stopReason };
    }

    for (const recipient of plan.recipients) {
      await tx.phishingSimulationRecipient.create({
        data: {
          phishingSimulationId: simulation.id,
          campaignAssignmentId: recipient.campaignAssignmentId,
          traineeProfileId: recipient.traineeProfileId,
          recipientEmail: recipient.recipientEmail,
          recipientFirstName: recipient.recipientFirstName,
          recipientLastName: recipient.recipientLastName,
          snapshottedAt: input.startedAt,
          messages: {
            createMany: {
              data: recipient.messages.map((message) => ({
                phishingSimulationId: simulation.id,
                poolEmailId: message.poolEmailId,
                providerProfileId: message.providerProfileId,
                scheduledFor: message.scheduledFor,
                portalTemplateId: message.portalTemplateId,
              })),
            },
          },
        },
      });
    }

    await tx.phishingSimulation.update({
      where: { id: simulation.id, status: 'SCHEDULED' },
      data: { status: 'RUNNING', stopReason: null },
    });
    return { state: 'RUNNING' as const };
  });
}

export function queuePhishingSimulationMessage(input: QueuePhishingSimulationMessageInput) {
  return prisma.$transaction(async (tx) => {
    await acquirePhishingSimulationLock(tx, input.phishingSimulationId);
    const message = await tx.phishingSimulationMessage.findFirst({
      where: {
        id: input.messageId,
        phishingSimulationId: input.phishingSimulationId,
        dispatchStatus: 'PENDING',
        emailDeliveryLogId: null,
        scheduledFor: { lte: input.queuedAt },
        phishingSimulation: { status: 'RUNNING', endAt: { gt: input.queuedAt } },
      },
      include: phishingSimulationMessageQueueInclude,
    });
    if (message === null) return { state: 'NO_OP' as const };

    const poolEmail = await tx.phishingSimulationEmail.findFirst({
      where: { id: message.poolEmailId, phishingSimulationId: message.phishingSimulationId },
      include: phishingSimulationInclude.pool.include,
    });
    if (poolEmail === null) {
      throw new Error('Planned phishing simulation message is missing its email snapshot');
    }

    const queuedDelivery = await input.enqueue({ message, poolEmail }, tx);
    const updatedMessage = await tx.phishingSimulationMessage.updateMany({
      where: { id: message.id, dispatchStatus: 'PENDING', emailDeliveryLogId: null },
      data: {
        dispatchStatus: 'QUEUED',
        emailDeliveryLogId: queuedDelivery.deliveryLogId,
        trackingTokenHash: queuedDelivery.trackingTokenHash,
        trackingTokenExpiresAt: queuedDelivery.trackingTokenExpiresAt,
      },
    });
    if (updatedMessage.count !== 1) {
      throw new Error('Planned phishing simulation message could not transition to Queued');
    }

    return { state: 'QUEUED' as const, emailDeliveryLogId: queuedDelivery.deliveryLogId };
  });
}

export function findPhishingSimulationMessageByTrackingTokenHash(trackingTokenHash: string) {
  return prisma.phishingSimulationMessage.findUnique({
    where: { trackingTokenHash },
    select: { trackingTokenExpiresAt: true },
  });
}

export function preparePhishingSimulationMessageAttempt(
  input: PreparePhishingSimulationMessageAttemptInput,
) {
  return prisma.$transaction(async (tx) => {
    await acquirePhishingSimulationLock(tx, input.phishingSimulationId);
    const simulation = await tx.phishingSimulation.findUnique({
      where: { id: input.phishingSimulationId },
      select: {
        id: true,
        organisationId: true,
        campaignId: true,
        status: true,
        endAt: true,
        sendFrom: true,
        sendUntil: true,
        weekdays: true,
      },
    });
    if (simulation === null) {
      return { state: 'NO_OP' as const };
    }
    await tx.$queryRaw`SELECT "id" FROM "Campaign" WHERE "id" = ${simulation.campaignId} AND "organisationId" = ${simulation.organisationId} FOR UPDATE`;
    const campaign = await tx.campaign.findFirst({
      where: { id: simulation.campaignId, organisationId: simulation.organisationId },
      select: { status: true, startDate: true, endDate: true },
    });
    const message = await tx.phishingSimulationMessage.findFirst({
      where: {
        id: input.messageId,
        phishingSimulationId: input.phishingSimulationId,
        providerProfileId: input.providerProfileId,
        emailDeliveryLogId: input.deliveryLogId,
        dispatchStatus: 'QUEUED',
      },
      select: { id: true },
    });
    if (message === null) {
      return { state: 'NO_OP' as const };
    }
    const deliveryJob = await tx.emailDeliveryJob.findFirst({
      where: {
        id: input.jobId,
        deliveryLogId: input.deliveryLogId,
        emailType: 'PHISHING_SIMULATION_MESSAGE',
        status: 'PROCESSING',
        leaseOwner: input.leaseOwner,
        leaseExpiresAt: { gt: input.checkedAt },
        terminalAt: null,
      },
      select: { id: true },
    });
    if (deliveryJob === null) {
      return { state: 'NO_OP' as const };
    }
    const decision = input.validate({ simulation, campaign, checkedAt: input.checkedAt });
    if (decision.state !== 'READY') {
      return decision;
    }
    const updatedMessage = await tx.phishingSimulationMessage.updateMany({
      where: {
        id: message.id,
        phishingSimulationId: input.phishingSimulationId,
        providerProfileId: input.providerProfileId,
        emailDeliveryLogId: input.deliveryLogId,
        dispatchStatus: 'QUEUED',
      },
      data: {
        actualFromAddress: input.actualFromAddress,
        actualFromName: input.actualFromName,
        actualReplyTo: input.actualReplyTo,
      },
    });
    if (updatedMessage.count !== 1) {
      return { state: 'NO_OP' as const };
    }
    return decision;
  });
}
