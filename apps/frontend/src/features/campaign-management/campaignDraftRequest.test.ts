import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CampaignDraftFormState } from './campaignManagement.types';
import { toCreateCampaignDraftRequest, toUpdateCampaignDraftRequest } from './campaignDraftRequest';

const DRAFT: CampaignDraftFormState = {
  name: ' New starter security  ',
  description: '  Security awareness for new employees.   ',
  accentColor: '#8400FF',
  startDate: '2026-09-01T10:00',
  endDate: '2026-10-01T19:00',
  items: [],
};

describe('Campaign Draft request mapping', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'Africa/Johannesburg');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps an organisation Draft to a normalized create request', () => {
    expect(
      toCreateCampaignDraftRequest(
        {
          kind: 'organisation',
          organisationId: '11111111-1111-4111-8111-111111111111',
        },
        DRAFT,
      ),
    ).toEqual({
      name: 'New starter security',
      description: 'Security awareness for new employees.',
      accentColor: '#8400FF',
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-10-01T17:00:00.000Z',
      items: [],
    });
  });

  it('maps blank optional organisation values to null', () => {
    expect(
      toCreateCampaignDraftRequest(
        {
          kind: 'organisation',
          organisationId: '11111111-1111-4111-8111-111111111111',
        },
        {
          ...DRAFT,
          description: '  ',
          startDate: '',
          endDate: '',
        },
      ),
    ).toEqual({
      name: 'New starter security',
      description: null,
      accentColor: '#8400FF',
      startDate: null,
      endDate: null,
      items: [],
    });
  });

  it('does not leak hidden date values into a platform create request', () => {
    const request = toCreateCampaignDraftRequest({ kind: 'platform' }, DRAFT);

    expect(request).toEqual({
      name: 'New starter security',
      description: 'Security awareness for new employees.',
      accentColor: '#8400FF',
      items: [],
    });
    expect(request).not.toHaveProperty('startDate');
    expect(request).not.toHaveProperty('endDate');
  });

  it('uses the exact supplied authoritative timestamp for an update request', () => {
    const expectedUpdatedAt = '2026-08-20T12:34:56.789Z';

    expect(
      toUpdateCampaignDraftRequest(
        {
          kind: 'organisation',
          organisationId: '11111111-1111-4111-8111-111111111111',
        },
        DRAFT,
        expectedUpdatedAt,
      ),
    ).toEqual({
      name: 'New starter security',
      description: 'Security awareness for new employees.',
      accentColor: '#8400FF',
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-10-01T17:00:00.000Z',
      items: [],
      expectedUpdatedAt,
    });
  });

  it('maps ordered components and preserved groups to exact request shapes', () => {
    const request = toCreateCampaignDraftRequest(
      { kind: 'platform' },
      {
        ...DRAFT,
        items: [
          {
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            contentId: 'quiz-new',
            title: 'New quiz',
            description: 'Display-only description',
            isRequired: true,
            sourceAvailable: true,
          },
          {
            itemType: 'GROUP',
            campaignItemId: 'group-existing',
            title: 'Existing module',
            description: 'Preserved group',
            groupType: 'MODULE',
            completionRule: 'COMPLETE_REQUIRED_ONLY',
            isRequired: false,
            children: [
              {
                itemType: 'COMPONENT',
                campaignItemId: 'child-one',
                componentType: 'TRAINING_DOCUMENT',
                contentId: 'document-one',
                title: 'Document one',
                description: null,
                isRequired: true,
                sourceAvailable: false,
              },
              {
                itemType: 'COMPONENT',
                campaignItemId: 'child-two',
                componentType: 'QUIZ',
                contentId: 'quiz-two',
                title: 'Quiz two',
                description: null,
                isRequired: false,
                sourceAvailable: true,
              },
            ],
          },
        ],
      },
    );

    expect(request.items).toEqual([
      {
        itemType: 'COMPONENT',
        campaignItemId: undefined,
        componentType: 'QUIZ',
        contentId: 'quiz-new',
        isRequired: true,
      },
      {
        itemType: 'GROUP',
        campaignItemId: 'group-existing',
        title: 'Existing module',
        description: 'Preserved group',
        groupType: 'MODULE',
        completionRule: 'COMPLETE_REQUIRED_ONLY',
        isRequired: false,
        children: [
          {
            itemType: 'COMPONENT',
            campaignItemId: 'child-one',
            componentType: 'TRAINING_DOCUMENT',
            contentId: 'document-one',
            isRequired: true,
          },
          {
            itemType: 'COMPONENT',
            campaignItemId: 'child-two',
            componentType: 'QUIZ',
            contentId: 'quiz-two',
            isRequired: false,
          },
        ],
      },
    ]);
  });
});
