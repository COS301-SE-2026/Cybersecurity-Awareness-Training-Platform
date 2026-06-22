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

export type RecordAuditLogInput = {
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

export function recordAuditLog(input: RecordAuditLogInput, client: AuditPrismaClient = prisma) {
  if (input.actorType === 'SYSTEM' && input.actorUserId) {
    throw new Error('SYSTEM audit entries must now have an actorUserId');
  } //if
  if (input.actorType !== 'SYSTEM' && !input.actorUserId) {
    throw new Error('Audit entries not made by the SYSTEM actor must have an actorUserId');
  } //if
  if (!input.targetId && input.targetType !== 'OTHER') {
    throw new Error('Audit entries must have a tagetId unless the targetType is OTHER');
  } //if

  return client.auditLogEntry.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      organisationId: input.organisationId ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      actionType: input.actionType,
      outcome: input.outcome ?? 'SUCCESS',
      oldValues: sanitiseValues(input.oldValues),
      newValues: sanitiseValues(input.newValues),
      metadata: sanitiseValues(input.metadata),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  }); //return
} //recordAuditLog

export function recordAuditFailure(
  input: Omit<RecordAuditLogInput, 'outcome'>,
  client: AuditPrismaClient = prisma,
) {
  return recordAuditLog({ ...input, outcome: 'FAILURE' }, client);
}

//Call this function:
// await prisma.$transaction(async (tx) => {
//   //write and do actual action
//   await recordAutditLog( { ... }, tx);
// });

export function sanitiseValues(
  input: Prisma.InputJsonValue | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }
  if (Array.isArray(input)) {
    return input.map((value) => sanitiseValues(value) ?? null); //recursive call on each value of the array
  } //if

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, nestedValue]) => [
        key,
        SENSITIVE_AUDIT_KEYS.some((part) => key.toLowerCase().includes(part.toLowerCase()))
          ? REDACTED_VALUE
          : (sanitiseValues(nestedValue as Prisma.InputJsonValue) ?? null),
      ]),
    );
  } //if

  return input;
}
