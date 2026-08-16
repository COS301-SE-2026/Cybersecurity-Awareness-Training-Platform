import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CampaignDraftFormState } from './campaignManagement.types';
import { toCreateCampaignDraftRequest, toUpdateCampaignDraftRequest } from './campaignDraftRequest';

const DRAFT: CampaignDraftFormState = {
  name: ' New starter security  ',
  description: '  Security awareness for new employees.   ',
  accentColor: '#8400FF',
  startDate: '2026-09-01T10:00',
  endDate: '2026-10-01T19:00',
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
});
