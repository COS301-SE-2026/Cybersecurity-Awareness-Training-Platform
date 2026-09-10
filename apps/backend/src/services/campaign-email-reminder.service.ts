import { queueCampaignDeadlineReminderEmail, type EmailSendOutcome } from './email.service.js';

const REMINDER_LEAD_TIME_MS = 48 * 60 * 60 * 1000;

export type ScheduleCampaignDeadlineReminderInput = {
  assignmentId: string;
  campaignId: string;
  campaignName: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientFirstName?: string;
  assignmentDueDate?: Date | null;
  campaignEndDate?: Date | null;
  eligible: boolean;
  now?: Date;
};

export type ScheduleCampaignDeadlineReminderOutcome =
  | EmailSendOutcome
  | { status: 'SKIPPED'; queued: false; reasonCode: 'INELIGIBLE' | 'NO_FUTURE_REMINDER' };

export async function scheduleCampaignDeadlineReminder(
  input: ScheduleCampaignDeadlineReminderInput,
): Promise<ScheduleCampaignDeadlineReminderOutcome> {
  if (!input.eligible) {
    return { status: 'SKIPPED', queued: false, reasonCode: 'INELIGIBLE' };
  }

  const effectiveDeadline = input.assignmentDueDate ?? input.campaignEndDate;
  const now = input.now ?? new Date();
  if (!effectiveDeadline || effectiveDeadline.getTime() <= now.getTime()) {
    return { status: 'SKIPPED', queued: false, reasonCode: 'NO_FUTURE_REMINDER' };
  }

  const reminderAt = new Date(effectiveDeadline.getTime() - REMINDER_LEAD_TIME_MS);
  if (reminderAt.getTime() <= now.getTime()) {
    return { status: 'SKIPPED', queued: false, reasonCode: 'NO_FUTURE_REMINDER' };
  }

  return queueCampaignDeadlineReminderEmail({
    assignmentId: input.assignmentId,
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.recipientEmail,
    recipientFirstName: input.recipientFirstName,
    dueAt: effectiveDeadline,
    reminderAt,
  });
}
