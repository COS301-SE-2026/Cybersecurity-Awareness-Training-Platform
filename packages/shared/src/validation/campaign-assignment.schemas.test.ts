import { describe, expect, it } from 'vitest';
import {
  assignableCampaignOptionSchema,
  campaignAssignmentCandidateOptionSchema,
  campaignAssignmentOptionsQuerySchema,
  getAssignableCampaignsResponseSchema,
  getCampaignAssignmentCandidatesResponseSchema,
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
      search: '   security   ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        page: 2,
        limit: 50,
        search: 'security',
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

describe('campaign assignment response schemas', () => {
  const validCampaignItem = {
    campaignId: '11111111-1111-4111-8111-111111111111',
    name: 'Security 101',
    description: 'Basic phishing training',
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
    displayName: 'Jane Doe',
    email: 'jane.doe@example.com',
    active: true,
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

  it('rejects campaign with invalid enum or malformed date', () => {
    expect(
      assignableCampaignOptionSchema.safeParse({
        ...validCampaignItem,
        status: 'UNKNOWN_STATUS',
      }).success,
    ).toBe(false);

    expect(
      assignableCampaignOptionSchema.safeParse({
        ...validCampaignItem,
        startDate: 'not-a-date',
      }).success,
    ).toBe(false);
  });

  it('validates campaignAssignmentCandidateOptionSchema and response', () => {
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

  it('rejects candidate with malformed email or unexpected properties', () => {
    expect(
      campaignAssignmentCandidateOptionSchema.safeParse({
        ...validCandidateItem,
        email: 'invalid-email',
      }).success,
    ).toBe(false);

    expect(
      campaignAssignmentCandidateOptionSchema.safeParse({
        ...validCandidateItem,
        extraProp: 'unexpected',
      }).success,
    ).toBe(false);
  });

  it('validates empty items list response', () => {
    const emptyResponse = {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
    expect(getAssignableCampaignsResponseSchema.safeParse(emptyResponse).success).toBe(true);
    expect(getCampaignAssignmentCandidatesResponseSchema.safeParse(emptyResponse).success).toBe(
      true,
    );
  });
});
