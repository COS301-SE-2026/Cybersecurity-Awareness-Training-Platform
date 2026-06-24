export type AuthEmailType =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGE_CONFIRMATION'
  | 'EMAIL_CHANGE_WARNING'
  | 'INITIAL_ORGANISATION_ADMIN_SETUP'
  | 'ORGANISATION_TRAINEE_INVITE'
  | 'ORGANISATION_ADMIN_PROMOTION_INVITE'
  | 'PLATFORM_ADMIN_INVITE'
  | 'PLATFORM_ADMIN_UPDATE_CONFIRMATION';

export type AuthEmailHookInput = {
  emailType: AuthEmailType;
  recipientEmail: string;
  actionTokenId?: string | null;
  userId?: string | null;
  organisationId?: string | null;
  invitationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  templateData?: Record<string, unknown>;
};

export type AuthEmailHookResult = {
  queued: false;
  reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED';
};

export async function requestAuthEmailSend(
  _input: AuthEmailHookInput,
): Promise<AuthEmailHookResult> {
  return {
    queued: false,
    reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED',
  };
}
