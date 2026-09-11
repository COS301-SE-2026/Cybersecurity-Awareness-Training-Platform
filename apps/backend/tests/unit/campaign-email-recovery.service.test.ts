import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAssignmentsMissingCampaignEmails: vi.fn(),
}));
const emailMock = vi.hoisted(() => ({
  queueCampaignAssignedEmail: vi.fn(),
  queueCampaignSelfEnrolledEmail: vi.fn(),
}));

vi.mock('../../src/repositories/campaign-assignment.repository.js', () => repositoryMock);
vi.mock('../../src/services/email.service.js', () => emailMock);

const { reconcileMissingCampaignEmails } =
  await import('../../src/services/campaign-email-recovery.service.js');

describe('campaign email recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailMock.queueCampaignAssignedEmail.mockResolvedValue({ queued: true });
    emailMock.queueCampaignSelfEnrolledEmail.mockResolvedValue({ queued: true });
  });

  it('requeues persisted assignments whose idempotent notification is missing', async () => {
    repositoryMock.findAssignmentsMissingCampaignEmails.mockResolvedValue([
      {
        id: 'assignment-1',
        accessType: 'ASSIGNED',
        dueDate: null,
        campaign: {
          id: 'campaign-1',
          name: 'Awareness Basics',
          organisationId: 'organisation-1',
          startDate: null,
          endDate: null,
        },
        traineeProfile: {
          user: { id: 'user-1', firstName: 'Ari', email: 'ari@example.test' },
          organisationTraineeProfile: {
            organisation: { id: 'organisation-1', name: 'Example Org' },
          },
        },
      },
    ]);

    await reconcileMissingCampaignEmails();

    expect(emailMock.queueCampaignAssignedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: 'assignment-1', campaignId: 'campaign-1' }),
    );
  });
});
