import { recordAuditLog } from './audit-log.service.js';

export type NotificationFailureEventType =
  | 'EMAIL_HOOK_UNEXPECTED_FAILURE'
  | 'PASSWORD_CHANGED_NOTIFICATION_FAILED'
  | 'ACTION_TOKEN_RESEND_NOTIFICATION_FAILED'
  | 'SETUP_EMAIL_RECOVERY_FAILED';

export async function recordNotificationFailureEvent(eventType: NotificationFailureEventType) {
  try {
    await recordAuditLog({
      actorType: 'SYSTEM',
      targetType: 'OTHER',
      actionType: 'UPDATED',
      outcome: 'FAILURE',
      metadata: { eventType },
    });
  } catch {
    return;
  }
}
