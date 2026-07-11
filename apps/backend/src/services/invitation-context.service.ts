import { findInvitationContextTokenByHash } from '../repositories/invitation-context.repository.js';
import { hashOpaqueToken } from './token-hash.service.js';
type InviteTokenState = 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';

export type InvitationTokenContextResponse = {
  token: { state: InviteTokenState; purpose: 'ORGANISATION_ADMIN_PROMOTION' | null };
  invitation: {
    type: 'ORGANISATION_ADMIN_PROMOTION';
    targetEmail: string;
    organisationName: string;
    grantedRole: 'ORGANISATION_ADMIN';
  } | null;
};
type InvitationContextToken = NonNullable<
  Awaited<ReturnType<typeof findInvitationContextTokenByHash>>
>;
function nonActionableContext(
  state: Exclude<InviteTokenState, 'VALID'>,
): InvitationTokenContextResponse {
  return { token: { state, purpose: null }, invitation: null };
}
function normaliseEmail(email: string | null | undefined): string | null {
  return email ? email.trim().toLowerCase() : null;
}
function getBaseTokenState(token: InvitationContextToken): InviteTokenState {
  if (token.revokedAt) return 'REVOKED';
  if (token.usedAt) return 'USED';
  if (token.expiresAt.getTime() <= Date.now()) return 'EXPIRED';
  return 'VALID';
}
function isUsablePromotionTarget(token: InvitationContextToken): boolean {
  const invitation = token.invitation;
  const user = token.user;
  if (!invitation || !user) return false;
  if (invitation.purpose !== 'ORGANISATION_ADMIN_PROMOTION') return false;
  if (invitation.status !== 'PENDING' && invitation.status !== 'SENT') return false;
  if (invitation.revokedAt || invitation.expiresAt.getTime() <= Date.now()) return false;
  if (invitation.organisation.status !== 'ACTIVE') return false;
  if (token.userId !== user.id || invitation.targetUserId !== user.id) return false;

  const tokenEmail = normaliseEmail(token.targetEmail);
  const invitationEmail = normaliseEmail(invitation.recipientEmail);
  const userEmail = normaliseEmail(user.email);
  if (!tokenEmail || tokenEmail !== invitationEmail || tokenEmail !== userEmail) return false;
  if (user.userType !== 'ORGANISATION_TRAINEE' || user.authStatus !== 'ACTIVE') return false;
  if (user.traineeProfile?.traineeStatus !== 'ACTIVE') return false;
  const member = user.traineeProfile.organisationTraineeProfile;
  if (
    !member ||
    member.organisationId !== invitation.organisationId ||
    member.membershipStatus !== 'ACTIVE'
  )
    return false;
  if (
    user.organisationAdminProfile?.organisationId === invitation.organisationId &&
    user.organisationAdminProfile.adminStatus === 'ACTIVE'
  )
    return false;

  return true;
}

function getOrganisationAdminPromotionContext(
  token: InvitationContextToken,
): InvitationTokenContextResponse {
  if (!isUsablePromotionTarget(token)) {
    return nonActionableContext('REVOKED');
  }
  const invite = token.invitation!;
  const user = token.user!;
  return {
    token: { state: 'VALID', purpose: 'ORGANISATION_ADMIN_PROMOTION' },
    invitation: {
      type: 'ORGANISATION_ADMIN_PROMOTION',
      targetEmail: user.email,
      organisationName: invite.organisation.name,
      grantedRole: 'ORGANISATION_ADMIN',
    },
  };
}
export async function getInvitationTokenContext(
  rawToken: string,
): Promise<InvitationTokenContextResponse> {
  const token = await findInvitationContextTokenByHash(hashOpaqueToken(rawToken));
  if (!token) return nonActionableContext('INVALID');
  if (token.purpose !== 'ORGANISATION_ADMIN_PROMOTION') return nonActionableContext('INVALID');
  const baseState = getBaseTokenState(token);
  if (baseState !== 'VALID') return nonActionableContext(baseState);
  return getOrganisationAdminPromotionContext(token);
}
