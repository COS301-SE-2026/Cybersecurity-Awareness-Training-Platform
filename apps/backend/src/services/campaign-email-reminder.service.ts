import { queueCampaignDeadlineReminderEmail, type EmailSendOutcome } from './email.service.js';
import { findCampaignDeadlineReminderState } from '../repositories/campaign-assignment.repository.js';

const REMINDER_LEAD_TIME_MS = 48 * 60 * 60 * 1000;
const ELIGIBLE_ASSIGNMENT_STATUSES = new Set(['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS']);

export type CampaignDeadlineReminderStaleReason =
  | 'ASSIGNMENT_NOT_FOUND'
  | 'ASSIGNMENT_NOT_ELIGIBLE'
  | 'CAMPAIGN_NOT_ACTIVE'
  | 'TRAINEE_NOT_ACTIVE'
  | 'RECIPIENT_NOT_ELIGIBLE'
  | 'DEADLINE_UNAVAILABLE'
  | 'DEADLINE_CHANGED';

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

export async function revalidateCampaignDeadlineReminder(input: {
  assignmentId: string;
  recipientEmail: string;
  now?: Date;
}): Promise<{ valid: true } | { valid: false; reasonCode: CampaignDeadlineReminderStaleReason }> {
  const state = await findCampaignDeadlineReminderState(input.assignmentId);
  if (!state) return { valid: false, reasonCode: 'ASSIGNMENT_NOT_FOUND' };

  if (state.completedAt || !ELIGIBLE_ASSIGNMENT_STATUSES.has(state.assignmentStatus)) {
    return { valid: false, reasonCode: 'ASSIGNMENT_NOT_ELIGIBLE' };
  }
  if (state.campaign.status !== 'ACTIVE') {
    return { valid: false, reasonCode: 'CAMPAIGN_NOT_ACTIVE' };
  }

  const profile = state.traineeProfile;
  const activeMembership =
    profile.generalTraineeProfile !== null ||
    profile.organisationTraineeProfile?.membershipStatus === 'ACTIVE';
  if (profile.traineeStatus !== 'ACTIVE' || !activeMembership) {
    return { valid: false, reasonCode: 'TRAINEE_NOT_ACTIVE' };
  }
  if (
    profile.user.authStatus !== 'ACTIVE' ||
    !profile.user.emailVerifiedAt ||
    profile.user.email !== input.recipientEmail
  ) {
    return { valid: false, reasonCode: 'RECIPIENT_NOT_ELIGIBLE' };
  }

  const deadline = state.dueDate ?? state.campaign.endDate;
  const now = input.now ?? new Date();
  if (!deadline || deadline.getTime() <= now.getTime()) {
    return { valid: false, reasonCode: 'DEADLINE_UNAVAILABLE' };
  }
  if (deadline.getTime() - REMINDER_LEAD_TIME_MS > now.getTime()) {
    return { valid: false, reasonCode: 'DEADLINE_CHANGED' };
  }

  return { valid: true };
}
