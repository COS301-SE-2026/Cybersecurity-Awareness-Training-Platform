import type {
  BrowserPortalInteractionEventType,
  ManagedPortalLinkContext,
  PortalInteractionEventType,
  PortalTemplateId,
} from '@insightful-phish/shared';
import type {
  ManagedPortalLink,
  ManagedPortalLinkPurpose as DatabaseManagedPortalLinkPurpose,
  PortalInteractionEvent,
  PortalInteractionEventType as DatabasePortalInteractionEventType,
  PortalTemplateId as DatabasePortalTemplateId,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type PortalPersistenceClient = PrismaClient | Prisma.TransactionClient;

type SimulatedInboxManagedPortalLinkContext = Extract<
  ManagedPortalLinkContext,
  { channel: 'SIMULATED_INBOX' }
>;

export type ManagedPortalLinkPersistenceRecord = {
  id: string;
  tokenHash: string;
  purpose: 'PHISHING_PORTAL';
  portalTemplateId: PortalTemplateId;
  traineeProfileId: string;
  organisationId: string | null;
  context: SimulatedInboxManagedPortalLinkContext;
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
  portalTemplateId: PortalTemplateId;
  traineeProfileId: string;
  organisationId: string | null;
  context: SimulatedInboxManagedPortalLinkContext;
  expiresAt: Date;
  revokedAt?: Date | null;
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

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export async function createManagedPortalLink(
  input: CreateManagedPortalLinkInput,
  client: PortalPersistenceClient = prisma,
): Promise<ManagedPortalLinkPersistenceRecord> {
  const record = await client.managedPortalLink.create({
    data: {
      tokenHash: input.tokenHash,
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

  return mapManagedPortalLink(record);
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
