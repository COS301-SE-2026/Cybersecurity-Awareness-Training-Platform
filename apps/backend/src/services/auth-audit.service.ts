import { recordAuditFailure, recordAuditLog } from './audit-log.service.js';

export type AuthAuditRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function recordRefreshTokenReuseDetected(input: {
  userId?: string | null;
  authSessionId: string;
  refreshTokenId: string;
  metadata?: AuthAuditRequestMetadata;
}) {
  return recordAuditFailure({
    actorUserId: null,
    actorType: 'SYSTEM',
    targetType: 'REFRESH_TOKEN',
    targetId: input.refreshTokenId,
    actionType: 'TOKEN_REUSE_DETECTED',
    metadata: {
      authSessionId: input.authSessionId,
      userId: input.userId ?? null,
    },
    ipAddress: input.metadata?.ipAddress ?? null,
    userAgent: input.metadata?.userAgent ?? null,
  });
}

export function recordUserLogin(input: {
  userId: string;
  actorType: 'IP_ADMIN' | 'ORGANISATION_ADMIN' | 'ORGANISATION_TRAINEE' | 'GENERAL_TRAINEE';
  authSessionId: string;
  metadata?: AuthAuditRequestMetadata;
}) {
  return recordAuditLog({
    actorUserId: input.userId,
    actorType: input.actorType,
    targetType: 'AUTH_SESSION',
    targetId: input.authSessionId,
    actionType: 'LOGIN',
    outcome: 'SUCCESS',
    ipAddress: input.metadata?.ipAddress ?? null,
    userAgent: input.metadata?.userAgent ?? null,
  });
}

export function recordAuthSessionRevoked(input: {
  actorUserId?: string | null;
  actorType:
    | 'SYSTEM'
    | 'IP_ADMIN'
    | 'ORGANISATION_ADMIN'
    | 'ORGANISATION_TRAINEE'
    | 'GENERAL_TRAINEE';
  authSessionId: string;
  reason: string;
  metadata?: AuthAuditRequestMetadata;
}) {
  return recordAuditLog({
    actorUserId: input.actorType === 'SYSTEM' ? null : (input.actorUserId ?? null),
    actorType: input.actorType,
    targetType: 'AUTH_SESSION',
    targetId: input.authSessionId,
    actionType: 'REVOKED',
    metadata: { reason: input.reason },
    ipAddress: input.metadata?.ipAddress ?? null,
    userAgent: input.metadata?.userAgent ?? null,
  });
}
