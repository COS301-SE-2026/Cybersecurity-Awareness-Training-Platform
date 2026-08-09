import type {
  AssignableCampaignOptionDto,
  CampaignAssignmentCandidateOptionDto,
  GetAssignableCampaignsResponseDto,
  GetCampaignAssignmentCandidatesResponseDto,
} from '../../../../../packages/shared/src/campaign-assignment.ts';

export const mockTraineeCandidates: CampaignAssignmentCandidateOptionDto[] = [
  {
    traineeProfileId: '11111111-1111-4111-8111-111111111111',
    organisationTraineeProfileId: '21111111-1111-4111-8111-111111111111',
    userId: '31111111-1111-4111-8111-111111111111',
    displayName: 'Connor Bell',
    email: 'connor.bell@example.com',
    active: true,
  },
  {
    traineeProfileId: '11111111-1111-4111-8111-111111111112',
    organisationTraineeProfileId: '21111111-1111-4111-8111-111111111112',
    userId: '31111111-1111-4111-8111-111111111112',
    displayName: 'Johan Nel',
    email: 'johan.nel@example.com',
    active: true,
  },
  {
    traineeProfileId: '11111111-1111-4111-8111-111111111113',
    organisationTraineeProfileId: '21111111-1111-4111-8111-111111111113',
    userId: '31111111-1111-4111-8111-111111111113',
    displayName: 'Adriano Jorge',
    email: 'adriano.jorge@example.com',
    active: true,
  },
  {
    traineeProfileId: '11111111-1111-4111-8111-111111111114',
    organisationTraineeProfileId: '21111111-1111-4111-8111-111111111114',
    userId: '31111111-1111-4111-8111-111111111114',
    displayName: 'Courteney Leong',
    email: 'courteney.leong@example.com',
    active: true,
  },
];

export const mockAssignableCampaigns: AssignableCampaignOptionDto[] = [
  {
    campaignId: '41111111-1111-4111-8111-111111111111',
    name: 'Cybersecurity Fundamentals',
    description: 'An introduction to essential cybersecurity awareness concepts.',
    status: 'ACTIVE',
    type: 'PREMADE_GENERAL',
    itemCount: 8,
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    assignmentCount: 12,
  },
  {
    campaignId: '41111111-1111-4111-8111-111111111112',
    name: 'Phishing Awareness',
    description: 'Learn how to identify and respond to phishing attempts.',
    status: 'ACTIVE',
    type: 'PREMADE_GENERAL',
    itemCount: 6,
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    assignmentCount: 8,
  },
  {
    campaignId: '41111111-1111-4111-8111-111111111113',
    name: 'Password Security',
    description: 'Best practises for creating and protecting secure passwords.',
    status: 'ACTIVE',
    type: 'PREMADE_GENERAL',
    itemCount: 12,
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    assignmentCount: 16,
  },
];

export const mockCampaignAssignmentCandidatesResponse: GetCampaignAssignmentCandidatesResponseDto =
  {
    items: mockTraineeCandidates,
    pagination: {
      page: 1,
      limit: 20,
      total: mockTraineeCandidates.length,
      totalPages: 1,
    },
  };

export const mockAssignableCampaignsResponse: GetAssignableCampaignsResponseDto = {
  items: mockAssignableCampaigns,
  pagination: {
    page: 1,
    limit: 20,
    total: mockAssignableCampaigns.length,
    totalPages: 1,
  },
};
