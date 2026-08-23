import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import {
  createAuditLogEntry,
  sanitiseAuditValues,
  type CreateAuditLogEntryInput,
} from '../repositories/audit-log.repository.js';

type AuditPrismaClient = PrismaClient | Prisma.TransactionClient;

export type RecordAuditLogInput = CreateAuditLogEntryInput;

export function recordAuditLog(input: RecordAuditLogInput, client: AuditPrismaClient = prisma) {
  return createAuditLogEntry(input, client);
}

export function recordAuditFailure(
  input: Omit<RecordAuditLogInput, 'outcome'>,
  client: AuditPrismaClient = prisma,
) {
  return createAuditLogEntry({ ...input, outcome: 'FAILURE' }, client);
}

export function sanitiseValues(
  input: Prisma.InputJsonValue | null | undefined,
): Prisma.InputJsonValue | undefined {
  return sanitiseAuditValues(input);
}
