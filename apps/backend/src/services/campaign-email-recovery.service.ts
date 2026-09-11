import { findAssignmentsMissingCampaignEmails } from '../repositories/campaign-assignment.repository.js';
import { queueCampaignAssignedEmail, queueCampaignSelfEnrolledEmail } from './email.service.js';

export async function reconcileMissingCampaignEmails() {
  const assignments = await findAssignmentsMissingCampaignEmails();

  for (const assignment of assignments) {
    const user = assignment.traineeProfile.user;
    const organisation = assignment.traineeProfile.organisationTraineeProfile?.organisation;

    if (assignment.accessType === 'ASSIGNED' && organisation) {
      await queueCampaignAssignedEmail({
        assignmentId: assignment.id,
        campaignId: assignment.campaign.id,
        campaignName: assignment.campaign.name,
        organisationId: organisation.id,
        organisationName: organisation.name,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientFirstName: user.firstName,
        availableAt: assignment.campaign.startDate,
        dueAt: assignment.dueDate ?? assignment.campaign.endDate,
      });
    } else if (assignment.accessType === 'SELF_SELECTED') {
      await queueCampaignSelfEnrolledEmail({
        assignmentId: assignment.id,
        campaignId: assignment.campaign.id,
        campaignName: assignment.campaign.name,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientFirstName: user.firstName,
        dueAt: assignment.dueDate ?? assignment.campaign.endDate,
      });
    }
  }

  return { reconciledAssignmentCount: assignments.length };
}
