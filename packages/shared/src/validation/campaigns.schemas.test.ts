import { describe, expect, it } from 'vitest';
import { getTraineeCampaignActivityApiPath } from '../campaigns.js';
import {
  getTraineeCampaignRequestParamsSchema,
  listTraineeCampaignsRequestSchema,
  traineeCampaignComponentItemSummarySchema,
  getTraineeCampaignsResponseSchema,
  traineeCampaignItemRequestParamsSchema,
  traineeCampaignItemSummarySchema,
} from './campaigns.schemas.js';

describe('campaign validation schemas', () => {
  const campaignId = '11111111-1111-4111-8111-111111111111';
  const campaignItemId = '22222222-2222-4222-8222-222222222222';
  const childCampaignItemId = '33333333-3333-4333-8333-333333333333';

  it('accepts trainee campaign route params', () => {
    const result = getTraineeCampaignRequestParamsSchema.safeParse({
      campaignId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed trainee campaign route params', () => {
    const result = getTraineeCampaignRequestParamsSchema.safeParse({
      campaignId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unexpected trainee campaign route params', () => {
    const result = getTraineeCampaignRequestParamsSchema.safeParse({
      campaignId,
      organisationId: '44444444-4444-4444-8444-444444444444',
    });

    expect(result.success).toBe(false);
  });

  it('rejects list trainee campaign payload fields', () => {
    const result = listTraineeCampaignsRequestSchema.safeParse({
      includeArchived: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects campaign summaries over maximum display lengths', () => {
    const result = getTraineeCampaignsResponseSchema.safeParse({
      campaigns: [
        {
          campaignId,
          name: 'A'.repeat(201),
          description: 'B'.repeat(2001),
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          accessType: 'ASSIGNED',
          progressStatus: 'IN_PROGRESS',
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'Campaign name must be at most 200 characters.',
          'Description must be at most 2000 characters.',
        ]),
      );
    }
  });

  it('accepts valid nullable campaign accent colours and rejects invalid values', () => {
    const validResult = getTraineeCampaignsResponseSchema.safeParse({
      campaigns: [
        {
          campaignId,
          name: 'Security Basics',
          description: null,
          accentColor: '#2563EB',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          accessType: 'ASSIGNED',
          progressStatus: 'IN_PROGRESS',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
        {
          campaignId: '44444444-4444-4444-8444-444444444444',
          name: 'Fallback Campaign',
          description: null,
          accentColor: null,
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
      ],
    });

    expect(validResult.success).toBe(true);

    const invalidResult = getTraineeCampaignsResponseSchema.safeParse({
      campaigns: [
        {
          campaignId,
          name: 'Security Basics',
          accentColor: 'blue',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
      ],
    });

    expect(invalidResult.success).toBe(false);
  });

  it('accepts trainee campaign item route params', () => {
    const result = traineeCampaignItemRequestParamsSchema.safeParse({
      campaignItemId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing trainee campaign item route params', () => {
    const result = traineeCampaignItemRequestParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('maps supported component types to trainee activity API paths', () => {
    expect(getTraineeCampaignActivityApiPath('SIMULATED_INBOX', campaignItemId)).toBe(
      `/trainee/campaign-items/${campaignItemId}/simulated-inbox`,
    );
    expect(getTraineeCampaignActivityApiPath('TRAINING_DOCUMENT', campaignItemId)).toBe(
      `/trainee/campaign-items/${campaignItemId}/training-document`,
    );
    expect(getTraineeCampaignActivityApiPath('QUIZ', campaignItemId)).toBe(
      `/trainee/campaign-items/${campaignItemId}/quiz`,
    );
  });

  it('requires activity API paths for supported component items', () => {
    const result = traineeCampaignComponentItemSummarySchema.safeParse({
      campaignItemId,
      campaignId,
      itemType: 'COMPONENT',
      componentType: 'QUIZ',
      title: 'Spot the phish',
      position: 0,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      isOpenable: true,
      progressStatus: 'IN_PROGRESS',
      eligibility: {
        canView: true,
        canProgress: true,
        reason: 'AVAILABLE',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects component item titles over maximum length', () => {
    const result = traineeCampaignComponentItemSummarySchema.safeParse({
      campaignItemId,
      campaignId,
      itemType: 'COMPONENT',
      componentType: 'QUIZ',
      title: 'Q'.repeat(201),
      position: 0,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      isOpenable: true,
      activityApiPath: getTraineeCampaignActivityApiPath('QUIZ', campaignItemId),
      eligibility: {
        canView: true,
        canProgress: true,
        reason: 'AVAILABLE',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'Title must be at most 200 characters.',
      );
    }
  });

  it('accepts group items with child campaign items', () => {
    const secondChildItemId = '55555555-5555-4555-8555-555555555555';
    const result = traineeCampaignItemSummarySchema.safeParse({
      campaignItemId,
      campaignId,
      itemType: 'GROUP',
      groupType: 'MODULE',
      completionRule: 'COMPLETE_REQUIRED_ONLY',
      title: 'Email safety basics',
      position: 0,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      isOpenable: false,
      eligibility: {
        canView: true,
        canProgress: true,
        reason: 'AVAILABLE',
      },
      children: [
        {
          campaignItemId: childCampaignItemId,
          campaignId,
          parentGroupId: campaignItemId,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Recognise suspicious requests',
          position: 0,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          isOpenable: true,
          activityApiPath: getTraineeCampaignActivityApiPath(
            'TRAINING_DOCUMENT',
            childCampaignItemId,
          ),
          progressStatus: 'VIEWED',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
        {
          campaignItemId: secondChildItemId,
          campaignId,
          parentGroupId: campaignItemId,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Module 1 Quiz',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          isOpenable: true,
          activityApiPath: getTraineeCampaignActivityApiPath('QUIZ', secondChildItemId),
          progressStatus: 'NOT_STARTED',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects internal campaign item fields from trainee DTO validation', () => {
    const result = traineeCampaignComponentItemSummarySchema.safeParse({
      campaignItemId,
      campaignId,
      itemType: 'COMPONENT',
      componentType: 'SIMULATED_INBOX',
      title: 'Inbox exercise',
      position: 0,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      isOpenable: true,
      activityApiPath: getTraineeCampaignActivityApiPath('SIMULATED_INBOX', campaignItemId),
      simulationId: '44444444-4444-4444-8444-444444444444',
      expectedClassification: 'PHISHING',
      redFlags: [],
    });

    expect(result.success).toBe(false);
  });
});
