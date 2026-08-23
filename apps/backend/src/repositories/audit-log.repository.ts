import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type {
  AuditActionType,
  AuditActorType,
  AuditOutcome,
  AuditTargetType,
} from '../generated/prisma/enums.js';

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_AUDIT_KEYS = ['password', 'token', 'secret'];

type AuditPrismaClient = PrismaClient | Prisma.TransactionClient;

export type CreateAuditLogEntryInput = {
  actorUserId?: string | null;
  actorType: AuditActorType;
  organisationId?: string | null;
  targetType: AuditTargetType;
  targetId?: string | null;
  actionType: AuditActionType;
  outcome?: AuditOutcome;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function sanitiseAuditValues(
  input: Prisma.InputJsonValue | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }
  if (Array.isArray(input)) {
    return input.map((value) => sanitiseAuditValues(value) ?? null);
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, nestedValue]) => [
        key,
        SENSITIVE_AUDIT_KEYS.some((part) => key.toLowerCase().includes(part.toLowerCase()))
          ? REDACTED_VALUE
          : (sanitiseAuditValues(nestedValue as Prisma.InputJsonValue) ?? null),
      ]),
    );
  }

  return input;
}

export function createAuditLogEntry(
  input: CreateAuditLogEntryInput,
  client: AuditPrismaClient = prisma,
) {
  if (input.actorType === 'SYSTEM' && input.actorUserId) {
    throw new Error('SYSTEM audit entries must not have an actorUserId');
  }
  if (!input.targetId && input.targetType !== 'OTHER') {
    throw new Error('Audit entries must have a targetId unless the targetType is OTHER');
  }

  return client.auditLogEntry.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      organisationId: input.organisationId ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      actionType: input.actionType,
      outcome: input.outcome ?? 'SUCCESS',
      oldValues: sanitiseAuditValues(input.oldValues),
      newValues: sanitiseAuditValues(input.newValues),
      metadata: sanitiseAuditValues(input.metadata),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
