import { describe, expect, it } from 'vitest';
import {
  assignableCampaignOptionSchema,
  campaignAssignmentCandidateOptionSchema,
  campaignAssignmentOptionsQuerySchema,
  campaignAssignmentReadRowSchema,
  campaignAssignmentsReadQuerySchema,
  createCampaignAssignmentsResponseSchema,
  createCampaignAssignmentsSchema,
  getAssignableCampaignsResponseSchema,
  getCampaignAssignmentCandidatesResponseSchema,
  getCampaignAssignmentsResponseSchema,
  organisationAndCampaignIdParamsSchema,
  organisationAndTraineeProfileIdParamsSchema,
} from './campaign-assignment.schemas.js';

describe('campaignAssignmentOptionsQuerySchema', () => {
  it('parses valid query parameters with defaults', () => {
    const parsed = campaignAssignmentOptionsQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        page: 1,
        limit: 20,
        search: undefined,
      });
    }
  });

  it('coerces string numbers for page and limit and trims search', () => {
    const parsed = campaignAssignmentOptionsQuerySchema.safeParse({
      page: '2',
      limit: '50',
      search: '   Pretoria   ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        page: 2,
        limit: 50,
        search: 'Pretoria',
      });
    }
  });

  it.each([
    [{ page: '0' }, 'page less than 1'],
    [{ limit: '101' }, 'limit greater than 100'],
    [{ page: '9007199254740992' }, 'unsafe integer values (MAX_SAFE_INTEGER)'],
    [{ page: '100001' }, 'page greater than maximum allowed limit (100000)'],
    [{ page: '1e5' }, 'scientific notation strings'],
    [{ page: '1.5' }, 'fractional page values'],
    [{ page: '-1' }, 'negative page values'],
    [{ page: 'abc' }, 'non-numeric string for page'],
    [{ page: ['1', '2'] }, 'array-shaped query parameters'],
    [{ unknownProp: 'value' }, 'unknown properties due to strict schema'],
  ])('rejects invalid query input: %j (%s)', (input: Record<string, unknown>, _label: string) => {
    const parsed = campaignAssignmentOptionsQuerySchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});

describe('createCampaignAssignmentsSchema', () => {
  const validCampaignId = '11111111-1111-4111-8111-111111111111';
  const validTraineeProfileId = '22222222-2222-4222-8222-222222222222';

  it('parses a valid bulk campaign assignment request', () => {
    const parsed = createCampaignAssignmentsSchema.safeParse({
      campaignIds: [validCampaignId],
      traineeProfileIds: [validTraineeProfileId],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        campaignIds: [validCampaignId],
        traineeProfileIds: [validTraineeProfileId],
      });
    }
  });

  it('rejects empty array or non-UUID campaign/trainee IDs', () => {
    expect(
      createCampaignAssignmentsSchema.safeParse({
        campaignIds: [],
        traineeProfileIds: [validTraineeProfileId],
      }).success,
    ).toBe(false);

    expect(
      createCampaignAssignmentsSchema.safeParse({
        campaignIds: [validCampaignId],
        traineeProfileIds: [],
      }).success,
    ).toBe(false);

    expect(
      createCampaignAssignmentsSchema.safeParse({
        campaignIds: ['invalid-uuid'],
        traineeProfileIds: [validTraineeProfileId],
      }).success,
    ).toBe(false);
  });

  it('rejects requests exceeding maximum bounded element limit of 100', () => {
    const tooManyCampaigns = Array.from({ length: 101 }, () => validCampaignId);
    expect(
      createCampaignAssignmentsSchema.safeParse({
        campaignIds: tooManyCampaigns,
        traineeProfileIds: [validTraineeProfileId],
      }).success,
    ).toBe(false);
  });

  it('rejects requests with unknown extra properties', () => {
    expect(
      createCampaignAssignmentsSchema.safeParse({
        campaignIds: [validCampaignId],
        traineeProfileIds: [validTraineeProfileId],
        extra: 'property',
      }).success,
    ).toBe(false);
  });
});

describe('campaignAssignmentsReadQuerySchema', () => {
  it('parses valid read query params including status filter', () => {
    const parsed = campaignAssignmentsReadQuerySchema.safeParse({
      page: '1',
      limit: '10',
      search: '  Rustenburg Branch  ',
      status: 'ASSIGNED',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        page: 1,
        limit: 10,
        search: 'Rustenburg Branch',
        status: 'ASSIGNED',
      });
    }
  });

  it('rejects invalid assignment status enum', () => {
    expect(
      campaignAssignmentsReadQuerySchema.safeParse({
        status: 'NON_EXISTENT_STATUS',
      }).success,
    ).toBe(false);
  });
});

describe('organisation route parameter schemas', () => {
  const validOrgId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
  const validCampaignId = 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7';
  const validTraineeProfileId = 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8';

  it('validates organisationAndCampaignIdParamsSchema', () => {
    expect(
      organisationAndCampaignIdParamsSchema.safeParse({
        organisationId: validOrgId,
        campaignId: validCampaignId,
      }).success,
    ).toBe(true);

    expect(
      organisationAndCampaignIdParamsSchema.safeParse({
        organisationId: 'invalid-uuid',
        campaignId: validCampaignId,
      }).success,
    ).toBe(false);
  });

  it('validates organisationAndTraineeProfileIdParamsSchema', () => {
    expect(
      organisationAndTraineeProfileIdParamsSchema.safeParse({
        organisationId: validOrgId,
        traineeProfileId: validTraineeProfileId,
      }).success,
    ).toBe(true);

    expect(
      organisationAndTraineeProfileIdParamsSchema.safeParse({
        organisationId: validOrgId,
        traineeProfileId: 'invalid-uuid',
      }).success,
    ).toBe(false);
  });
});

describe('campaign assignment response schemas', () => {
  const validCampaignItem = {
    campaignId: '11111111-1111-4111-8111-111111111111',
    name: 'Checkers Sixty60 Phishing Awareness Training',
    description: 'South African e-commerce phishing scenario training',
    status: 'ACTIVE',
    type: 'ORGANISATION_CUSTOM',
    itemCount: 5,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: null,
    assignmentCount: 10,
  };

  const validCandidateItem = {
    traineeProfileId: '22222222-2222-4222-8222-222222222222',
    organisationTraineeProfileId: '33333333-3333-4333-8333-333333333333',
    userId: '44444444-4444-4444-8444-444444444444',
    displayName: 'Sipho Ndlovu',
    email: 'sipho.ndlovu@rustenburg-cyber.co.za',
    active: true,
  };

  const validReadRowItem = {
    assignmentId: '55555555-5555-4555-8555-555555555555',
    campaignId: '11111111-1111-4111-8111-111111111111',
    campaignName: 'Checkers Sixty60 Phishing Awareness Training',
    campaignStatus: 'ACTIVE',
    campaignType: 'ORGANISATION_CUSTOM',
    traineeProfileId: '22222222-2222-4222-8222-222222222222',
    displayName: 'Anika van der Merwe',
    email: 'anika.vdmerwe@pretoria-tech.co.za',
    traineeStatus: 'ACTIVE',
    assignmentStatus: 'ASSIGNED',
    accessType: 'ASSIGNED',
    assignedAt: '2026-08-07T12:00:00.000Z',
    startedAt: null,
    completedAt: null,
  };

  it('validates assignableCampaignOptionSchema and response', () => {
    expect(assignableCampaignOptionSchema.safeParse(validCampaignItem).success).toBe(true);

    const validResponse = {
      items: [validCampaignItem],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };
    expect(getAssignableCampaignsResponseSchema.safeParse(validResponse).success).toBe(true);
  });

  it('allows nullable description and dates for campaigns', () => {
    const campaignWithNulls = {
      ...validCampaignItem,
      description: null,
      startDate: null,
      endDate: null,
    };
    expect(assignableCampaignOptionSchema.safeParse(campaignWithNulls).success).toBe(true);
  });

  it('validates createCampaignAssignmentsResponseSchema', () => {
    const validMutationResponse = {
      created: [
        {
          assignmentId: '55555555-5555-4555-8555-555555555555',
          campaignId: '11111111-1111-4111-8111-111111111111',
          traineeProfileId: '22222222-2222-4222-8222-222222222222',
        },
      ],
      alreadyAssigned: [],
      summary: {
        requestedCampaigns: 1,
        requestedTrainees: 1,
        requestedPairs: 1,
        createdCount: 1,
        alreadyAssignedCount: 0,
      },
    };
    expect(createCampaignAssignmentsResponseSchema.safeParse(validMutationResponse).success).toBe(
      true,
    );
  });

  it('validates campaignAssignmentReadRowSchema and response', () => {
    expect(campaignAssignmentReadRowSchema.safeParse(validReadRowItem).success).toBe(true);

    const validReadResponse = {
      items: [validReadRowItem],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };
    expect(getCampaignAssignmentsResponseSchema.safeParse(validReadResponse).success).toBe(true);
  });

  it('validates candidate option schema and response', () => {
    expect(campaignAssignmentCandidateOptionSchema.safeParse(validCandidateItem).success).toBe(
      true,
    );

    const validResponse = {
      items: [validCandidateItem],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };
    expect(getCampaignAssignmentCandidatesResponseSchema.safeParse(validResponse).success).toBe(
      true,
    );
  });
});
