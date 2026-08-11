import type { ActionTokenPurpose, EmailDeliveryType } from '../generated/prisma/enums.js';
import { ACTIVE_INVITATION_STATUSES } from './invitation-state-policy.js';
import { prisma } from '../lib/prisma.js';

import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { recordNotificationFailureEvent } from './notification-failure-event.service.js';
import type { ActionTokenModel } from '../generated/prisma/models/ActionToken.js';
import {
  createActionToken,
  findActionTokenByHash,
  markActionTokenUsed,
  revokeActionToken,
  type CreateActionTokenInput,
  withClaimedActionToken,
} from '../repositories/action-token.repository.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export type ActionTokenState =
  | 'VALID'
  | 'INVALID'
  | 'EXPIRED'
  | 'USED'
  | 'REVOKED'
  | 'WRONG_PURPOSE';

export type IssueActionTokenInput = Omit<CreateActionTokenInput, 'tokenHash'>;

export type IssueActionTokenResult = {
  rawToken: string;
  token: ActionTokenModel;
};

export type ValidateActionTokenResult =
  | { state: 'VALID'; token: ActionTokenModel }
  | { state: Exclude<ActionTokenState, 'VALID'>; token?: ActionTokenModel };

export async function issueActionToken(
  input: IssueActionTokenInput,
  client?: Prisma.TransactionClient,
): Promise<IssueActionTokenResult> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const tokenInput = {
    ...input,
    tokenHash,
  };
  const token = client
    ? await createActionToken(tokenInput, client)
    : await createActionToken(tokenInput);

  return { rawToken, token };
}

export async function validateActionToken(input: {
  rawToken: string;
  expectedPurpose: ActionTokenPurpose;
  now?: Date;
}): Promise<ValidateActionTokenResult> {
  const tokenHash = hashOpaqueToken(input.rawToken);
  const token = await findActionTokenByHash(tokenHash);

  if (!token) {
    return { state: 'INVALID' };
  }

  if (token.purpose !== input.expectedPurpose) {
    return { state: 'WRONG_PURPOSE', token };
  }

  if (token.revokedAt) {
    return { state: 'REVOKED', token };
  }

  if (token.usedAt) {
    return { state: 'USED', token };
  }

  const now = input.now ?? new Date();

  if (token.expiresAt.getTime() <= now.getTime()) {
    return { state: 'EXPIRED', token };
  }

  return {
    state: 'VALID',
    token,
  };
}

// Only call after intended action succeeds.
export type ConsumeActionTokenResult =
  | { consumed: true }
  | { consumed: false; state: 'USED_OR_REVOKED' };

export async function consumeActionToken(input: {
  tokenId: string;
}): Promise<ConsumeActionTokenResult> {
  const consumed = await markActionTokenUsed(input.tokenId);

  if (!consumed) {
    return { consumed: false, state: 'USED_OR_REVOKED' };
  }

  return { consumed: true };
}

export async function revokeActionTokenById(input: { tokenId: string; reason: string }) {
  return revokeActionToken({ id: input.tokenId, revokedReason: input.reason });
}
export function runWithConsumedActionToken<T>(
  input: { tokenId: string },
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return withClaimedActionToken(input, action);
}

export type TokenContextResponse = {
  tokenState: ActionTokenState;
  canResend: boolean;
  resendCooldownSeconds: number;
  messageCode: string;
  flow: ActionTokenPurpose | 'UNKNOWN';
};

function mapPurposeToEmailType(purpose: ActionTokenPurpose): EmailDeliveryType | null {
  switch (purpose) {
    case 'EMAIL_VERIFICATION':
      return 'EMAIL_VERIFICATION';
    case 'PASSWORD_RESET':
      return 'PASSWORD_RESET';
    case 'EMAIL_CHANGE_VERIFICATION':
      return 'EMAIL_CHANGE_CONFIRMATION';
    case 'INITIAL_ORGANISATION_ADMIN_SETUP':
      return 'INITIAL_ORGANISATION_ADMIN_SETUP';
    case 'ORGANISATION_TRAINEE_INVITE':
      return 'ORGANISATION_TRAINEE_INVITE';
    case 'ORGANISATION_ADMIN_PROMOTION':
      return 'ORGANISATION_ADMIN_PROMOTION_INVITE';
    case 'PLATFORM_ADMIN_INVITE':
      return 'PLATFORM_ADMIN_INVITE';
    case 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION':
      return 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION';
    default:
      return null;
  }
}

type ActionTokenWithRelations = Prisma.ActionTokenGetPayload<{
  include: {
    user: true;
    emailChangeRequest: true;
    invitation: {
      include: {
        organisation: true;
      };
    };
  };
}>;

function determineTokenState(
  token: ActionTokenModel | ActionTokenWithRelations,
  now = new Date(),
): ActionTokenState {
  if (token.revokedAt) return 'REVOKED';
  if (token.usedAt) return 'USED';
  if (token.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'VALID';
}

function canResendPasswordReset(token: ActionTokenWithRelations) {
  return token.user ? token.user.authStatus !== 'DISABLED' : false;
}

function canResendEmailVerification(token: ActionTokenWithRelations) {
  return token.user ? token.user.authStatus === 'PENDING_EMAIL_VERIFICATION' : false;
}

function canResendEmailChangeVerification(token: ActionTokenWithRelations) {
  return token.emailChangeRequest ? token.emailChangeRequest.status === 'PENDING' : false;
}

function canResendPlatformAdminUpgradeConfirmation(token: ActionTokenWithRelations) {
  return token.user ? token.user.authStatus !== 'DISABLED' : true;
}

function canResendInvitation(token: ActionTokenWithRelations) {
  return token.invitation
    ? token.invitation.status !== 'ACCEPTED' &&
        token.invitation.status !== 'REVOKED' &&
        token.invitation.status !== 'COMPLETED'
    : false;
}

function canResendByPurpose(token: ActionTokenWithRelations) {
  switch (token.purpose) {
    case 'PASSWORD_RESET':
      return canResendPasswordReset(token);
    case 'EMAIL_VERIFICATION':
      return canResendEmailVerification(token);
    case 'EMAIL_CHANGE_VERIFICATION':
      return canResendEmailChangeVerification(token);
    case 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION':
      return canResendPlatformAdminUpgradeConfirmation(token);
    case 'INITIAL_ORGANISATION_ADMIN_SETUP':
    case 'ORGANISATION_TRAINEE_INVITE':
    case 'ORGANISATION_ADMIN_PROMOTION':
    case 'PLATFORM_ADMIN_INVITE':
      return canResendInvitation(token);
    default:
      return false;
  }
}

function checkResendEligibility(token: ActionTokenWithRelations, state: ActionTokenState): boolean {
  if (state !== 'VALID' && state !== 'EXPIRED') {
    return false;
  }

  return canResendByPurpose(token);
}

function getRecipientEmail(token: ActionTokenWithRelations): string | null {
  return (
    token.targetEmail ??
    token.user?.email ??
    token.invitation?.recipientEmail ??
    token.emailChangeRequest?.RequestedEmail ??
    null
  );
}

async function computeResendCooldown(
  recipientEmail: string | null,
  emailType: EmailDeliveryType | null,
  now: Date,
): Promise<number> {
  if (!recipientEmail || !emailType) {
    return 0;
  }

  const lastLog = await prisma.emailDeliveryLog.findFirst({
    where: {
      recipientEmail,
      emailType,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!lastLog) {
    return 0;
  }

  const cooldownMs = 60000;
  const elapsed = now.getTime() - lastLog.createdAt.getTime();
  return elapsed < cooldownMs ? Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000)) : 0;
}

export async function getTokenContext(rawToken: string): Promise<TokenContextResponse> {
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await prisma.actionToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
      emailChangeRequest: true,
      invitation: {
        include: {
          organisation: true,
        },
      },
    },
  });

  if (!token) {
    return {
      tokenState: 'INVALID',
      canResend: false,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_INVALID',
      flow: 'UNKNOWN',
    };
  }

  const now = new Date();
  const state = determineTokenState(token, now);
  const canResend = checkResendEligibility(token, state);
  const recipientEmail = getRecipientEmail(token);
  const emailType = mapPurposeToEmailType(token.purpose);
  const resendCooldownSeconds = await computeResendCooldown(recipientEmail, emailType, now);

  return {
    tokenState: state,
    canResend,
    resendCooldownSeconds,
    messageCode: `TOKEN_${state}`,
    flow: token.purpose,
  };
}

export class TokenResendError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly cooldownSeconds?: number,
  ) {
    super(message);
    this.name = 'TokenResendError';
  }
}

export async function resendActionToken(rawToken: string): Promise<void> {
  const context = await getTokenContext(rawToken);

  if (!context.canResend || context.flow === 'UNKNOWN') {
    throw new TokenResendError(400, 'TOKEN_RESEND_INELIGIBLE', 'Token cannot be resent safely');
  }

  if (context.resendCooldownSeconds > 0) {
    throw new TokenResendError(
      429,
      'RESEND_COOLDOWN_ACTIVE',
      'Resend cooldown active. Please try again later.',
      context.resendCooldownSeconds,
    );
  }

  const tokenHash = hashOpaqueToken(rawToken);
  const originalToken = await prisma.actionToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
      emailChangeRequest: true,
      invitation: {
        include: {
          organisation: true,
        },
      },
    },
  });

  if (!originalToken) {
    throw new TokenResendError(400, 'TOKEN_RESEND_INELIGIBLE', 'Token cannot be resent safely');
  }

  const recipientEmail =
    originalToken.targetEmail ??
    originalToken.user?.email ??
    originalToken.invitation?.recipientEmail ??
    originalToken.emailChangeRequest?.RequestedEmail ??
    null;

  const emailType = mapPurposeToEmailType(originalToken.purpose);

  if (!recipientEmail || !emailType) {
    throw new TokenResendError(400, 'TOKEN_RESEND_INELIGIBLE', 'Token cannot be resent safely');
  }

  // Re-check token state immediately before the transaction
  const preTxState = determineTokenState(originalToken);
  if (preTxState !== 'VALID' && preTxState !== 'EXPIRED') {
    throw new TokenResendError(400, 'TOKEN_RESEND_INELIGIBLE', 'Token cannot be resent safely');
  }

  const newToken = await prisma.$transaction(async (tx) => {
    if (originalToken.invitationId) {
      const claimedInv = await tx.invitation.updateMany({
        where: {
          id: originalToken.invitationId,
          status: { in: [...ACTIVE_INVITATION_STATUSES] },
        },
        data: {
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      if (claimedInv.count === 0) {
        throw new TokenResendError(
          409,
          'TOKEN_RESEND_INELIGIBLE',
          'Associated invitation is no longer active.',
        );
      }
    }

    const claimedToken = await tx.actionToken.updateMany({
      where: {
        id: originalToken.id,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'REPLACED',
      },
    });
    if (claimedToken.count === 0) {
      const currentToken = await tx.actionToken.findUnique({
        where: { id: originalToken.id },
      });
      if (!currentToken || currentToken.usedAt || currentToken.revokedAt) {
        throw new TokenResendError(
          409,
          'TOKEN_RESEND_INELIGIBLE',
          'Token has already been used or replaced concurrently.',
        );
      }
      throw new TokenResendError(400, 'TOKEN_RESEND_INELIGIBLE', 'Token cannot be resent safely');
    }

    await tx.actionToken.updateMany({
      where: {
        purpose: originalToken.purpose,
        userId: originalToken.userId ?? null,
        invitationId: originalToken.invitationId ?? null,
        emailChangeRequestId: originalToken.emailChangeRequestId ?? null,
        targetEmail: originalToken.targetEmail ?? null,
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'REPLACED',
      },
    });

    const issued = await issueActionToken(
      {
        purpose: originalToken.purpose,
        userId: originalToken.userId,
        invitationId: originalToken.invitationId,
        emailChangeRequestId: originalToken.emailChangeRequestId,
        targetEmail: originalToken.targetEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      tx,
    );

    return issued;
  });

  let emailOutcome: Awaited<ReturnType<typeof requestAuthEmailSend>>;
  try {
    emailOutcome = await requestAuthEmailSend({
      emailType,
      recipientEmail,
      userId: originalToken.userId,
      actionTokenId: newToken.token.id,
      invitationId: originalToken.invitationId,
      relatedEntityType: originalToken.emailChangeRequestId ? 'EMAIL_CHANGE_REQUEST' : undefined,
      relatedEntityId: originalToken.emailChangeRequestId,
      templateData: {
        actionToken: newToken.rawToken,
        firstName:
          originalToken.user?.firstName ??
          originalToken.invitation?.recipientFirstName ??
          'Trainee',
        actionTokenExpiresAt: newToken.token.expiresAt,
        oldEmail: originalToken.emailChangeRequest?.currentEmail,
        newEmail: originalToken.emailChangeRequest?.RequestedEmail,
        organisationName: originalToken.invitation?.organisation?.name ?? 'Platform Admin',
      },
    });
  } catch {
    await recordNotificationFailureEvent('ACTION_TOKEN_RESEND_NOTIFICATION_FAILED');
    return;
  }

  if (emailOutcome.status === 'NOT_QUEUED') {
    await prisma.actionToken.updateMany({
      where: {
        id: newToken.token.id,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'EMAIL_SEND_FAILED',
      },
    });
  }
}
