import type {
  BrowserPortalInteractionEventType,
  CampaignPortalReportingFact,
  PortalInteractionEventType,
  PortalTemplateId,
  SimulatedInboxPortalContext,
} from '@insightful-phish/shared';
import type {
  AssignmentStatus,
  AuthStatus,
  CampaignAccessType,
  CampaignComponentType,
  CampaignItemAvailabilityStatus,
  CampaignItemType,
  CampaignStatus,
  CampaignType,
  InboxStatus,
  ManagedPortalLink,
  ManagedPortalLinkPurpose as DatabaseManagedPortalLinkPurpose,
  OrganisationStatus,
  OrganisationUserStatus,
  PortalInteractionEvent,
  PortalInteractionEventType as DatabasePortalInteractionEventType,
  PortalTemplateId as DatabasePortalTemplateId,
  Prisma,
  PrismaClient,
  SafetyStatus,
  SimulationType,
  TraineeStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type PortalPersistenceClient = PrismaClient | Prisma.TransactionClient;

type FirstOccurrencePortalInteractionEventType = Exclude<
  BrowserPortalInteractionEventType,
  'CREDENTIAL_SUBMISSION_ATTEMPTED'
>;

export type ManagedPortalLinkPersistenceRecord = {
  id: string;
  tokenHash: string;
  purpose: 'PHISHING_PORTAL';
  portalTemplateId: PortalTemplateId;
  traineeProfileId: string;
  organisationId: string | null;
  context: SimulatedInboxPortalContext;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type PortalInteractionEventPersistenceRecord = {
  id: string;
  managedPortalLinkId: string;
  eventType: PortalInteractionEventType;
  clientEventId: string | null;
  occurredAt: string;
};

export type CreateManagedPortalLinkInput = {
  tokenHash: string;
  tokenCiphertext: string;
  portalTemplateId: PortalTemplateId;
  traineeProfileId: string;
  organisationId: string | null;
  context: SimulatedInboxPortalContext;
  expiresAt: Date;
  revokedAt?: Date | null;
};

export type ManagedPortalLinkOccurrenceRecord = {
  id: string;
  tokenHash: string;
  tokenCiphertext: string;
  purpose: 'PHISHING_PORTAL';
  portalTemplateId: PortalTemplateId;
  traineeProfileId: string;
  organisationId: string | null;
  context: SimulatedInboxPortalContext;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ManagedPortalLinkResolutionFacts = {
  id: string;
  purpose: string;
  portalTemplateId: string;
  traineeProfileId: string;
  organisationId: string | null;
  context: {
    channel: 'SIMULATED_INBOX';
    campaignAssignmentId: string;
    campaignItemId: string;
    simulatedEmailId: string;
  };
  expiresAt: Date;
  revokedAt: Date | null;
  traineeProfile: {
    id: string;
    traineeStatus: TraineeStatus;
    userAuthStatus: AuthStatus;
    organisationMembership: {
      organisationId: string;
      membershipStatus: OrganisationUserStatus;
    } | null;
    hasGeneralProfile: boolean;
  } | null;
  organisation: {
    id: string;
    status: OrganisationStatus;
  } | null;
  campaignAssignment: {
    id: string;
    campaignId: string;
    traineeProfileId: string;
    assignmentStatus: AssignmentStatus;
    accessType: CampaignAccessType;
    campaign: {
      id: string;
      organisationId: string | null;
      campaignType: CampaignType;
      status: CampaignStatus;
      startDate: Date | null;
      endDate: Date | null;
    };
  } | null;
  campaignItem: {
    id: string;
    campaignId: string;
    itemType: CampaignItemType;
    componentType: CampaignComponentType | null;
    availabilityStatus: CampaignItemAvailabilityStatus;
    simulationId: string | null;
  } | null;
  simulatedEmail: {
    id: string;
    inboxId: string;
    portalTemplateId: string | null;
    redFlags: Array<{
      label: string;
      description: string | null;
    }>;
    inbox: {
      id: string;
      simulationId: string;
      status: InboxStatus;
      simulation: {
        id: string;
        organisationId: string | null;
        simulationType: SimulationType;
        safetyStatus: SafetyStatus;
      };
    };
  } | null;
};

export type CreatePortalInteractionEventInput =
  | {
      managedPortalLinkId: string;
      eventType: 'MANAGED_LINK_REQUESTED';
      clientEventId: null;
      occurredAt?: Date;
    }
  | {
      managedPortalLinkId: string;
      eventType: BrowserPortalInteractionEventType;
      clientEventId: string;
      occurredAt?: Date;
    };

export class PortalInteractionEventIdempotencyConflictError extends Error {
  readonly code = 'PORTAL_EVENT_IDEMPOTENCY_CONFLICT';

  constructor() {
    super('The client event identifier is already associated with a different portal event.');
    this.name = 'PortalInteractionEventIdempotencyConflictError';
  }
}

export class ManagedPortalLinkTokenHashConflictError extends Error {
  constructor() {
    super('A managed portal link token hash collision occurred.');
    this.name = 'ManagedPortalLinkTokenHashConflictError';
  }
}

export class ManagedPortalLinkOccurrenceConflictError extends Error {
  constructor() {
    super('A managed portal link already exists for this occurrence.');
    this.name = 'ManagedPortalLinkOccurrenceConflictError';
  }
}

const managedPortalLinkResolutionSelect = {
  id: true,
  purpose: true,
  portalTemplateId: true,
  traineeProfileId: true,
  organisationId: true,
  campaignAssignmentId: true,
  campaignItemId: true,
  simulatedEmailId: true,
  expiresAt: true,
  revokedAt: true,
  traineeProfile: {
    select: {
      id: true,
      traineeStatus: true,
      user: { select: { authStatus: true } },
      organisationTraineeProfile: {
        select: { organisationId: true, membershipStatus: true },
      },
      generalTraineeProfile: { select: { id: true } },
    },
  },
  organisation: { select: { id: true, status: true } },
  campaignAssignment: {
    select: {
      id: true,
      campaignId: true,
      traineeProfileId: true,
      assignmentStatus: true,
      accessType: true,
      campaign: {
        select: {
          id: true,
          organisationId: true,
          campaignType: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  },
  campaignItem: {
    select: {
      id: true,
      campaignId: true,
      itemType: true,
      componentType: true,
      availabilityStatus: true,
      simulationId: true,
    },
  },
  simulatedEmail: {
    select: {
      id: true,
      inboxId: true,
      portalTemplateId: true,
      redFlags: {
        orderBy: [
          { redFlagType: 'asc' },
          { label: 'asc' },
          { description: 'asc' },
          { severity: 'asc' },
          { id: 'asc' },
        ],
        select: { label: true, description: true },
      },
      inbox: {
        select: {
          id: true,
          simulationId: true,
          status: true,
          simulation: {
            select: {
              id: true,
              organisationId: true,
              simulationType: true,
              safetyStatus: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ManagedPortalLinkSelect;

const managedPortalLinkOccurrenceSelect = {
  id: true,
  tokenHash: true,
  tokenCiphertext: true,
  purpose: true,
  portalTemplateId: true,
  traineeProfileId: true,
  organisationId: true,
  campaignAssignmentId: true,
  campaignItemId: true,
  simulatedEmailId: true,
  expiresAt: true,
  revokedAt: true,
} satisfies Prisma.ManagedPortalLinkSelect;

type ManagedPortalLinkResolutionRow = Prisma.ManagedPortalLinkGetPayload<{
  select: typeof managedPortalLinkResolutionSelect;
}>;

type ManagedPortalLinkOccurrenceRow = Prisma.ManagedPortalLinkGetPayload<{
  select: typeof managedPortalLinkOccurrenceSelect;
}>;

type CampaignPortalReportingRow = {
  managedPortalLinkId: string;
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  simulatedEmailId: string;
  eventType: DatabasePortalInteractionEventType;
  occurredAt: Date;
};

const canonicalPortalTemplateByDatabaseValue = {
  GENERIC_ACCOUNT_LOGIN_V1: 'GENERIC_ACCOUNT_LOGIN_V1',
  GENERIC_DOCUMENT_ACCESS_V1: 'GENERIC_DOCUMENT_ACCESS_V1',
  GENERIC_BANKING_LOGIN_V1: 'GENERIC_BANKING_LOGIN_V1',
} satisfies Record<DatabasePortalTemplateId, PortalTemplateId>;

const databasePortalTemplateByCanonicalValue = {
  GENERIC_ACCOUNT_LOGIN_V1: 'GENERIC_ACCOUNT_LOGIN_V1',
  GENERIC_DOCUMENT_ACCESS_V1: 'GENERIC_DOCUMENT_ACCESS_V1',
  GENERIC_BANKING_LOGIN_V1: 'GENERIC_BANKING_LOGIN_V1',
} satisfies Record<PortalTemplateId, DatabasePortalTemplateId>;

const canonicalPurposeByDatabaseValue = {
  PHISHING_PORTAL: 'PHISHING_PORTAL',
} satisfies Record<DatabaseManagedPortalLinkPurpose, 'PHISHING_PORTAL'>;

const canonicalEventTypeByDatabaseValue = {
  MANAGED_LINK_REQUESTED: 'MANAGED_LINK_REQUESTED',
  PORTAL_VISITED: 'PORTAL_VISITED',
  PORTAL_IDENTIFIER_FIELD_INTERACTED: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
  PORTAL_CREDENTIAL_FIELD_INTERACTED: 'PORTAL_CREDENTIAL_FIELD_INTERACTED',
  CREDENTIAL_SUBMISSION_ATTEMPTED: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
  PORTAL_EDUCATIONAL_REVEAL_VIEWED: 'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
} satisfies Record<DatabasePortalInteractionEventType, PortalInteractionEventType>;

const databaseEventTypeByCanonicalValue = {
  MANAGED_LINK_REQUESTED: 'MANAGED_LINK_REQUESTED',
  PORTAL_VISITED: 'PORTAL_VISITED',
  PORTAL_IDENTIFIER_FIELD_INTERACTED: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
  PORTAL_CREDENTIAL_FIELD_INTERACTED: 'PORTAL_CREDENTIAL_FIELD_INTERACTED',
  CREDENTIAL_SUBMISSION_ATTEMPTED: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
  PORTAL_EDUCATIONAL_REVEAL_VIEWED: 'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
} satisfies Record<PortalInteractionEventType, DatabasePortalInteractionEventType>;

function mapManagedPortalLink(record: ManagedPortalLink): ManagedPortalLinkPersistenceRecord {
  return {
    id: record.id,
    tokenHash: record.tokenHash,
    purpose: canonicalPurposeByDatabaseValue[record.purpose],
    portalTemplateId: canonicalPortalTemplateByDatabaseValue[record.portalTemplateId],
    traineeProfileId: record.traineeProfileId,
    organisationId: record.organisationId,
    context: {
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: record.campaignAssignmentId,
      campaignItemId: record.campaignItemId,
      simulatedEmailId: record.simulatedEmailId,
    },
    expiresAt: record.expiresAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapPortalInteractionEvent(
  record: PortalInteractionEvent,
): PortalInteractionEventPersistenceRecord {
  return {
    id: record.id,
    managedPortalLinkId: record.managedPortalLinkId,
    eventType: canonicalEventTypeByDatabaseValue[record.eventType],
    clientEventId: record.clientEventId,
    occurredAt: record.occurredAt.toISOString(),
  };
}

function mapCampaignPortalReportingFact(
  record: CampaignPortalReportingRow,
): CampaignPortalReportingFact {
  const eventType = canonicalEventTypeByDatabaseValue[record.eventType];
  if (eventType === undefined) {
    throw new Error('Unsupported portal interaction event type.');
  }

  return {
    managedPortalLinkId: record.managedPortalLinkId,
    traineeProfileId: record.traineeProfileId,
    context: {
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: record.campaignAssignmentId,
      campaignItemId: record.campaignItemId,
      simulatedEmailId: record.simulatedEmailId,
    },
    eventType,
    occurredAt: record.occurredAt.toISOString(),
  };
}

function isUniqueConstraintError(error: unknown): error is { code: 'P2002'; meta?: unknown } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function isTokenHashUniqueConstraintError(error: unknown): boolean {
  if (!isUniqueConstraintError(error) || !('meta' in error)) return false;
  const meta = error.meta;
  if (typeof meta !== 'object' || meta === null || !('target' in meta)) return false;
  const target = meta.target;
  return Array.isArray(target)
    ? target.some((field) => field === 'tokenHash')
    : typeof target === 'string' && target.includes('tokenHash');
}

function isOccurrenceUniqueConstraintError(error: unknown): boolean {
  if (!isUniqueConstraintError(error) || !('meta' in error)) return false;
  const meta = error.meta;
  if (typeof meta !== 'object' || meta === null || !('target' in meta)) return false;
  const target = meta.target;
  if (Array.isArray(target)) {
    return (
      target.includes('campaignAssignmentId') &&
      target.includes('campaignItemId') &&
      target.includes('simulatedEmailId')
    );
  }
  return (
    typeof target === 'string' &&
    (target.includes('ManagedPortalLink_occurrence_key') ||
      (target.includes('campaignAssignmentId') &&
        target.includes('campaignItemId') &&
        target.includes('simulatedEmailId')))
  );
}

function mapManagedPortalLinkOccurrence(
  record: ManagedPortalLinkOccurrenceRow,
): ManagedPortalLinkOccurrenceRecord {
  return {
    id: record.id,
    tokenHash: record.tokenHash,
    tokenCiphertext: record.tokenCiphertext,
    purpose: canonicalPurposeByDatabaseValue[record.purpose],
    portalTemplateId: canonicalPortalTemplateByDatabaseValue[record.portalTemplateId],
    traineeProfileId: record.traineeProfileId,
    organisationId: record.organisationId,
    context: {
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: record.campaignAssignmentId,
      campaignItemId: record.campaignItemId,
      simulatedEmailId: record.simulatedEmailId,
    },
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
  };
}

function mapManagedPortalLinkResolution(
  record: ManagedPortalLinkResolutionRow,
): ManagedPortalLinkResolutionFacts {
  return {
    id: record.id,
    purpose: record.purpose,
    portalTemplateId: record.portalTemplateId,
    traineeProfileId: record.traineeProfileId,
    organisationId: record.organisationId,
    context: {
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: record.campaignAssignmentId,
      campaignItemId: record.campaignItemId,
      simulatedEmailId: record.simulatedEmailId,
    },
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    traineeProfile: {
      id: record.traineeProfile.id,
      traineeStatus: record.traineeProfile.traineeStatus,
      userAuthStatus: record.traineeProfile.user.authStatus,
      organisationMembership: record.traineeProfile.organisationTraineeProfile,
      hasGeneralProfile: record.traineeProfile.generalTraineeProfile !== null,
    },
    organisation: record.organisation,
    campaignAssignment: {
      id: record.campaignAssignment.id,
      campaignId: record.campaignAssignment.campaignId,
      traineeProfileId: record.campaignAssignment.traineeProfileId,
      assignmentStatus: record.campaignAssignment.assignmentStatus,
      accessType: record.campaignAssignment.accessType,
      campaign: record.campaignAssignment.campaign,
    },
    campaignItem: record.campaignItem,
    simulatedEmail: {
      id: record.simulatedEmail.id,
      inboxId: record.simulatedEmail.inboxId,
      portalTemplateId: record.simulatedEmail.portalTemplateId,
      redFlags: record.simulatedEmail.redFlags,
      inbox: record.simulatedEmail.inbox,
    },
  };
}

export async function createManagedPortalLink(
  input: CreateManagedPortalLinkInput,
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkPersistenceRecord> {
  let record: ManagedPortalLink;
  try {
    record = await client.managedPortalLink.create({
      data: {
        tokenHash: input.tokenHash,
        tokenCiphertext: input.tokenCiphertext,
        purpose: 'PHISHING_PORTAL',
        portalTemplateId: databasePortalTemplateByCanonicalValue[input.portalTemplateId],
        traineeProfileId: input.traineeProfileId,
        organisationId: input.organisationId,
        campaignAssignmentId: input.context.campaignAssignmentId,
        campaignItemId: input.context.campaignItemId,
        simulatedEmailId: input.context.simulatedEmailId,
        expiresAt: input.expiresAt,
        revokedAt: input.revokedAt ?? null,
      },
    });
  } catch (error) {
    if (isTokenHashUniqueConstraintError(error)) {
      throw new ManagedPortalLinkTokenHashConflictError();
    }
    if (isOccurrenceUniqueConstraintError(error)) {
      throw new ManagedPortalLinkOccurrenceConflictError();
    }
    throw error;
  }

  return mapManagedPortalLink(record);
}

export async function findManagedPortalLinkByOccurrence(
  context: SimulatedInboxPortalContext,
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkOccurrenceRecord | null> {
  const record = await client.managedPortalLink.findUnique({
    where: {
      campaignAssignmentId_campaignItemId_simulatedEmailId: {
        campaignAssignmentId: context.campaignAssignmentId,
        campaignItemId: context.campaignItemId,
        simulatedEmailId: context.simulatedEmailId,
      },
    },
    select: managedPortalLinkOccurrenceSelect,
  });
  return record === null ? null : mapManagedPortalLinkOccurrence(record);
}

export async function findManagedPortalLinkResolutionByTokenHash(
  tokenHash: string,
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkResolutionFacts | null> {
  const record = await client.managedPortalLink.findUnique({
    where: { tokenHash },
    select: managedPortalLinkResolutionSelect,
  });
  return record === null ? null : mapManagedPortalLinkResolution(record);
}

export async function findManagedPortalLinkByTokenHash(
  tokenHash: string,
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkPersistenceRecord | null> {
  const record = await client.managedPortalLink.findUnique({ where: { tokenHash } });
  return record === null ? null : mapManagedPortalLink(record);
}

export async function findManagedPortalLinkById(
  id: string,
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkPersistenceRecord | null> {
  const record = await client.managedPortalLink.findUnique({ where: { id } });
  return record === null ? null : mapManagedPortalLink(record);
}

export async function setManagedPortalLinkRevokedAt(
  input: { id: string; revokedAt: Date },
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkPersistenceRecord> {
  const record = await client.managedPortalLink.update({
    where: { id: input.id },
    data: { revokedAt: input.revokedAt },
  });
  return mapManagedPortalLink(record);
}

export async function createPortalInteractionEvent(
  input: CreatePortalInteractionEventInput,
  client: PortalPersistenceClient = prisma,
): Promise<{ record: PortalInteractionEventPersistenceRecord; created: boolean }> {
  try {
    const record = await client.portalInteractionEvent.create({
      data: {
        managedPortalLinkId: input.managedPortalLinkId,
        eventType: databaseEventTypeByCanonicalValue[input.eventType],
        clientEventId: input.clientEventId,
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
      },
    });
    return { record: mapPortalInteractionEvent(record), created: true };
  } catch (error) {
    if (input.clientEventId !== null && isUniqueConstraintError(error)) {
      const existing = await client.portalInteractionEvent.findUnique({
        where: {
          managedPortalLinkId_clientEventId: {
            managedPortalLinkId: input.managedPortalLinkId,
            clientEventId: input.clientEventId,
          },
        },
      });
      if (existing !== null) {
        const record = mapPortalInteractionEvent(existing);
        if (record.eventType !== input.eventType) {
          throw new PortalInteractionEventIdempotencyConflictError();
        }
        return { record, created: false };
      }
    }
    throw error;
  }
}

export async function createFirstPortalInteractionEvent(
  input: {
    managedPortalLinkId: string;
    eventType: FirstOccurrencePortalInteractionEventType;
    clientEventId: string;
    occurredAt?: Date;
  },
  client: PrismaClient = prisma,
): Promise<{ record: PortalInteractionEventPersistenceRecord; created: boolean }> {
  return client.$transaction(async (tx) => {
    const lockKey = `PORTAL_EVENT_FIRST:${input.managedPortalLinkId}:${input.eventType}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

    const existing = await tx.portalInteractionEvent.findFirst({
      where: {
        managedPortalLinkId: input.managedPortalLinkId,
        eventType: databaseEventTypeByCanonicalValue[input.eventType],
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    if (existing !== null) {
      return { record: mapPortalInteractionEvent(existing), created: false };
    }

    return createPortalInteractionEvent(input, tx);
  });
}

export async function findPortalInteractionEvents(
  managedPortalLinkId: string,
  client: PortalPersistenceClient = prisma,
): Promise<PortalInteractionEventPersistenceRecord[]> {
  const records = await client.portalInteractionEvent.findMany({
    where: { managedPortalLinkId },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  });
  return records.map(mapPortalInteractionEvent);
}

export async function readCampaignPortalReportingFacts(
  input: { organisationId: string; campaignId: string },
  client: PortalPersistenceClient = prisma,
): Promise<CampaignPortalReportingFact[]> {
  const records = await client.$queryRaw<CampaignPortalReportingRow[]>`
    SELECT
      pie."managedPortalLinkId" AS "managedPortalLinkId",
      mpl."traineeProfileId" AS "traineeProfileId",
      mpl."campaignAssignmentId" AS "campaignAssignmentId",
      mpl."campaignItemId" AS "campaignItemId",
      mpl."simulatedEmailId" AS "simulatedEmailId",
      pie."eventType" AS "eventType",
      pie."occurredAt" AS "occurredAt"
    FROM "PortalInteractionEvent" pie
    INNER JOIN "ManagedPortalLink" mpl
      ON mpl."id" = pie."managedPortalLinkId"
    INNER JOIN "CampaignAssignment" ca
      ON ca."id" = mpl."campaignAssignmentId"
      AND ca."traineeProfileId" = mpl."traineeProfileId"
    INNER JOIN "TraineeProfile" tp
      ON tp."id" = mpl."traineeProfileId"
      AND tp."id" = ca."traineeProfileId"
    INNER JOIN "Campaign" c
      ON c."id" = ca."campaignId"
      AND c."id" = ${input.campaignId}
      AND c."organisationId" = ${input.organisationId}
    INNER JOIN "Organisation" o
      ON o."id" = c."organisationId"
      AND o."id" = mpl."organisationId"
    INNER JOIN "CampaignItem" ci
      ON ci."id" = mpl."campaignItemId"
      AND ci."campaignId" = c."id"
      AND ci."itemType" = 'COMPONENT'
      AND ci."componentType" = 'SIMULATED_INBOX'
    INNER JOIN "SimulatedEmail" se
      ON se."id" = mpl."simulatedEmailId"
    INNER JOIN "SimulatedInbox" si
      ON si."id" = se."inboxId"
    INNER JOIN "Simulation" s
      ON s."id" = si."simulationId"
      AND s."id" = ci."simulationId"
      AND s."organisationId" = o."id"
      AND s."simulationType" = 'SIMULATED_INBOX'
    WHERE mpl."organisationId" = ${input.organisationId}
      AND mpl."purpose" = 'PHISHING_PORTAL'
    ORDER BY pie."occurredAt" ASC, pie."id" ASC
  `;

  return records.map(mapCampaignPortalReportingFact);
}

export async function findOrganisationCampaignForPortalReporting(
  input: { organisationId: string; campaignId: string },
  client: PortalPersistenceClient = prisma,
): Promise<{ id: string } | null> {
  return client.campaign.findFirst({
    where: {
      id: input.campaignId,
      organisationId: input.organisationId,
    },
    select: { id: true },
  });
}
