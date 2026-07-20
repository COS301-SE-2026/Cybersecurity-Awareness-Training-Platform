export const ACTIVE_INVITATION_STATUSES = ['PENDING', 'SENT', 'FAILED_TO_SEND'] as const;
export const TERMINAL_INVITATION_STATUSES = [
  'ACCEPTED',
  'COMPLETED',
  'EXPIRED',
  'REVOKED',
  'REJECTED',
] as const;
export const ALL_INVITATION_STATUSES = [
  ...ACTIVE_INVITATION_STATUSES,
  ...TERMINAL_INVITATION_STATUSES,
] as const;

export const INVITATION_MANAGEMENT_STATUSES = [
  'INVITE_PENDING',
  'INVITE_FAILED',
  'INVITE_EXPIRED',
  'INVITE_REVOKED',
  'INVITE_REJECTED',
  'INVITE_ACCEPTED',
  'INVITE_COMPLETED',
] as const;

export const INVITATION_ACTION_UNAVAILABLE_REASON_CODES = [
  'COOLDOWN_ACTIVE',
  'INVITATION_NOT_ACTIVE',
  'INVITATION_REVOKED',
  'INVITATION_ACCEPTED',
  'INVITATION_REJECTED',
  'INVITATION_EXPIRED',
  'INVITATION_COMPLETED',
  'INVITATION_NOT_RESENDABLE',
  'NOT_APPLICABLE',
] as const;

export type ActiveInvitationStatus = (typeof ACTIVE_INVITATION_STATUSES)[number];
export type TerminalInvitationStatus = (typeof TERMINAL_INVITATION_STATUSES)[number];
export type InvitationStatusType = (typeof ALL_INVITATION_STATUSES)[number];
export type InvitationManagementStatus = (typeof INVITATION_MANAGEMENT_STATUSES)[number];
export type InvitationActionUnavailableReasonCode =
  (typeof INVITATION_ACTION_UNAVAILABLE_REASON_CODES)[number];

export type InvitationActionPolicy = {
  lifecycleState: InvitationStatusType;
  managementStatus: InvitationManagementStatus;
  canAccept: boolean;
  canReject: boolean;
  canResend: boolean;
  canRevoke: boolean;
  resendDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
  revokeDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
  rejectDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
};

export function isTerminalInvitationStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return TERMINAL_INVITATION_STATUSES.includes(status as TerminalInvitationStatus);
}

export function isActiveInvitationStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_INVITATION_STATUSES.includes(status as ActiveInvitationStatus);
}

export function canAcceptInvitation(status: string | null | undefined): boolean {
  return isActiveInvitationStatus(status);
}

export function canRejectInvitation(status: string | null | undefined): boolean {
  return isActiveInvitationStatus(status);
}

export function canResendInvitation(status: string | null | undefined): boolean {
  return isActiveInvitationStatus(status);
}

export function canRevokeInvitation(status: string | null | undefined): boolean {
  return isActiveInvitationStatus(status);
}

export function deriveInvitationLifecycleState(
  invitation: {
    status: string | null | undefined;
    expiresAt?: Date | string | null;
    acceptedAt?: Date | string | null;
    revokedAt?: Date | string | null;
  },
  now = new Date(),
): InvitationStatusType {
  if (
    invitation.acceptedAt ||
    invitation.status === 'ACCEPTED' ||
    invitation.status === 'COMPLETED'
  ) {
    return invitation.status === 'COMPLETED' ? 'COMPLETED' : 'ACCEPTED';
  }
  if (invitation.revokedAt || invitation.status === 'REVOKED') {
    return 'REVOKED';
  }
  if (invitation.status === 'REJECTED') {
    return 'REJECTED';
  }
  if (invitation.status === 'EXPIRED') {
    return 'EXPIRED';
  }
  if (invitation.expiresAt) {
    const exp =
      typeof invitation.expiresAt === 'string'
        ? new Date(invitation.expiresAt)
        : invitation.expiresAt;
    if (exp.getTime() <= now.getTime()) {
      return 'EXPIRED';
    }
  }
  if (invitation.status === 'FAILED_TO_SEND') {
    return 'FAILED_TO_SEND';
  }
  if (invitation.status === 'SENT') {
    return 'SENT';
  }
  return 'PENDING';
}

export function deriveInvitationManagementStatus(
  invitation: {
    status: string | null | undefined;
    expiresAt?: Date | string | null;
    acceptedAt?: Date | string | null;
    revokedAt?: Date | string | null;
  },
  now = new Date(),
): InvitationManagementStatus {
  const lifecycleState = deriveInvitationLifecycleState(invitation, now);

  switch (lifecycleState) {
    case 'ACCEPTED':
      return 'INVITE_ACCEPTED';
    case 'COMPLETED':
      return 'INVITE_COMPLETED';
    case 'EXPIRED':
      return 'INVITE_EXPIRED';
    case 'REVOKED':
      return 'INVITE_REVOKED';
    case 'REJECTED':
      return 'INVITE_REJECTED';
    case 'FAILED_TO_SEND':
      return 'INVITE_FAILED';
    case 'SENT':
    case 'PENDING':
    default:
      return 'INVITE_PENDING';
  }
}

export function getInvitationActionPolicy(
  invitation: {
    status: string | null | undefined;
    expiresAt?: Date | string | null;
    acceptedAt?: Date | string | null;
    revokedAt?: Date | string | null;
  },
  now = new Date(),
): InvitationActionPolicy {
  const lifecycleState = deriveInvitationLifecycleState(invitation, now);
  const managementStatus = deriveInvitationManagementStatus(invitation, now);
  const canMutate = isActiveInvitationStatus(lifecycleState);

  if (lifecycleState === 'ACCEPTED') {
    return {
      lifecycleState,
      managementStatus,
      canAccept: false,
      canReject: false,
      canResend: false,
      canRevoke: false,
      resendDisabledReasonCode: 'INVITATION_ACCEPTED',
      revokeDisabledReasonCode: 'INVITATION_ACCEPTED',
      rejectDisabledReasonCode: 'INVITATION_ACCEPTED',
    };
  }

  if (lifecycleState === 'COMPLETED') {
    return {
      lifecycleState,
      managementStatus,
      canAccept: false,
      canReject: false,
      canResend: false,
      canRevoke: false,
      resendDisabledReasonCode: 'INVITATION_COMPLETED',
      revokeDisabledReasonCode: 'INVITATION_COMPLETED',
      rejectDisabledReasonCode: 'INVITATION_COMPLETED',
    };
  }

  if (lifecycleState === 'EXPIRED') {
    return {
      lifecycleState,
      managementStatus,
      canAccept: false,
      canReject: false,
      canResend: true,
      canRevoke: false,
      resendDisabledReasonCode: null,
      revokeDisabledReasonCode: 'INVITATION_EXPIRED',
      rejectDisabledReasonCode: 'INVITATION_EXPIRED',
    };
  }

  if (lifecycleState === 'REVOKED') {
    return {
      lifecycleState,
      managementStatus,
      canAccept: false,
      canReject: false,
      canResend: false,
      canRevoke: false,
      resendDisabledReasonCode: 'INVITATION_REVOKED',
      revokeDisabledReasonCode: 'INVITATION_REVOKED',
      rejectDisabledReasonCode: 'INVITATION_REVOKED',
    };
  }

  if (lifecycleState === 'REJECTED') {
    return {
      lifecycleState,
      managementStatus,
      canAccept: false,
      canReject: false,
      canResend: true,
      canRevoke: false,
      resendDisabledReasonCode: null,
      revokeDisabledReasonCode: 'INVITATION_REJECTED',
      rejectDisabledReasonCode: 'INVITATION_REJECTED',
    };
  }

  return {
    lifecycleState,
    managementStatus,
    canAccept: canMutate,
    canReject: canMutate,
    canResend: canMutate,
    canRevoke: canMutate,
    resendDisabledReasonCode: canMutate ? null : 'INVITATION_NOT_ACTIVE',
    revokeDisabledReasonCode: canMutate ? null : 'INVITATION_NOT_ACTIVE',
    rejectDisabledReasonCode: canMutate ? null : 'INVITATION_NOT_ACTIVE',
  };
}
