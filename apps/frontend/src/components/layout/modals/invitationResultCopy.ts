export type InvitationErrorType =
  | 'Expired'
  | 'Invalid'
  | 'Revoked'
  | 'Already Used'
  | 'RateLimited'
  | 'OrganisationSuspended'
  | 'RoleConflict';

export function getInvitationErrorMessage(errorType?: InvitationErrorType) {
  if (errorType === 'Expired') {
    return 'This invitation cannot be accepted because its validity period has ended.';
  }
  if (errorType === 'Revoked') {
    return 'This invitation cannot be accepted because the organisation revoked it.';
  }
  if (errorType === 'Already Used') {
    return 'This invitation cannot be accepted because it has already been accepted or otherwise used.';
  }
  if (errorType === 'RateLimited') {
    return 'You have made too many authentication attempts. Please wait a few seconds and try again.';
  }
  if (errorType === 'OrganisationSuspended') {
    return 'This invitation cannot be accepted because the organisation is currently suspended.';
  }
  if (errorType === 'RoleConflict') {
    return 'This invitation cannot be accepted using your current account role configuration.';
  }
  return 'This invitation cannot be accepted because the invitation link is invalid or unavailable.';
}
