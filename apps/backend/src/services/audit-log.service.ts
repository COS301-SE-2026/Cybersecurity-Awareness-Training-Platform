import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type AuditPrismaClient = PrismaClient | Prisma.TransactionClient;

export type RecordAuditLogInput = {
  actorUserId?: string | null;
  actorType:
    | 'IP_ADMIN'
    | 'ORGANISATION_ADMIN'
    | 'ORGANISATION_TRAINEE'
    | 'GENERAL_TRAINEE'
    | 'SYSTEM';
  organisationId?: string | null;
  targetType:
    | 'USER'
    | 'ORGANISATION'
    | 'ORGANISATION_REGISTRATION_REQUEST'
    | 'INVITATION'
    | 'ORGANISATION_ADMIN_PERMISSION'
    | 'ORGANISATION_SECURITY_SETTINGS'
    | 'PLATFORM_ADMIN_ROLE'
    | 'AUTH_SESSION'
    | 'CAMPAIGN'
    | 'OTHER';
  targetId?: string | null;
  actionType:
    | 'CREATED'
    | 'UPDATED'
    | 'DISABLED'
    | 'ENABLED'
    | 'APPROVED'
    | 'REJECTED'
    | 'CONTACTED'
    | 'INVITED'
    | 'RESENT'
    | 'REVOKED'
    | 'ACCEPTED'
    | 'COMPLETED'
    | 'PROMOTED'
    | 'DEMOTED'
    | 'PERMISSIONS_CHANGED'
    | 'SETTINGS_CHANGED'
    | 'SUSPENDED'
    | 'REACTIVATED'
    | 'LOGIN'
    | 'LOGOUT'
    | 'TOKEN_REUSE_DETECTED';
  outcome?: 'SUCCESS' | 'FAILURE';
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function recordAuditLog(input: RecordAuditLogInput, client: AuditPrismaClient = prisma) {
  return client.auditLogEntry.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      organisationId: input.organisationId ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      actionType: input.actionType,
      outcome: input.outcome ?? 'SUCCESS',
      oldValues: input.oldValues ?? undefined,
      newValues: input.newValues ?? undefined,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

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
