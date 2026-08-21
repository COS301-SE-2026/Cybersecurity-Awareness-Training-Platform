import { describe, expect, it } from 'vitest';

import { CampaignManagementClientError } from './campaignManagementClient';
import { createDevelopmentCampaignManagementClient } from './developmentCampaignManagementClient';
import type {
  CreateCampaignDraftRequestDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';

const PRIMARY_ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const SECONDARY_ORGANISATION_ID = '22222222-2222-4222-8222-222222222222';
const DRAFT_CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const ACTIVE_CAMPAIGN_ID = '10000000-0000-4000-8000-000000000002';
const CREATED_CAMPAIGN_ID = '40000000-0000-4000-8000-000000000001';
const CREATED_AT = '2026-08-16T10:00:00.000Z';
const VIEW_ONLY_DRAFT_ID = '10000000-0000-4000-8000-000000000005';
const ORIGINAL_UPDATED_AT = '2026-08-14T09:30:00.000Z';
const CREATED_ITEM_ID = '60000000-0000-4000-8000-000000000001';

const ORGANISATION_CONTEXT = {
  kind: 'organisation' as const,
  organisationId: PRIMARY_ORGANISATION_ID,
};

const ORGANISATION_REQUEST: CreateCampaignDraftRequestDto = {
  name: 'Created organisation Draft',
  description: 'Created through the development adapter.',
  accentColor: '#8400FF',
  startDate: '2026-09-01T08:00:00.000Z',
  endDate: '2026-10-01T17:00:00.000Z',
  items: [],
};

const UPDATE_REQUEST: UpdateCampaignDraftRequestDto = {
  ...ORGANISATION_REQUEST,
  name: 'Updated organisation Draft',
  items: [],
  expectedUpdatedAt: ORIGINAL_UPDATED_AT,
};

function createClient() {
  return createDevelopmentCampaignManagementClient({
    generateCampaignId: () => CREATED_CAMPAIGN_ID,
    generateCampaignItemId: () => CREATED_ITEM_ID,
    now: () => new Date(CREATED_AT),
  });
}

describe('developmentCampaignManagementClient.getCampaignDetail', () => {
  it('returns valid minimal Draft detail for the matching organisation', async () => {
    const client = createClient();
    const detail = await client.getCampaignDetail(ORGANISATION_CONTEXT, DRAFT_CAMPAIGN_ID);

    expect(detail).toMatchObject({
      id: DRAFT_CAMPAIGN_ID,
      organisationId: PRIMARY_ORGANISATION_ID,
      name: 'New starter security',
      status: 'DRAFT',
      items: [],
    });
  });

  it('retrieves non-Draft Campaign detail', async () => {
    const client = createClient();

    const detail = await client.getCampaignDetail(ORGANISATION_CONTEXT, ACTIVE_CAMPAIGN_ID);
    expect(detail.status).toBe('ACTIVE');
  });

  it('rejects a Campaign requested through the wrong organisation context', async () => {
    const client = createClient();

    await expect(
      client.getCampaignDetail(
        {
          kind: 'organisation',
          organisationId: SECONDARY_ORGANISATION_ID,
        },
        DRAFT_CAMPAIGN_ID,
      ),
    ).rejects.toThrow('Campaign not found.');
  });

  it('creates and returns an authoritative organisation Draft', async () => {
    const client = createClient();

    const detail = await client.createCampaignDraft(ORGANISATION_CONTEXT, ORGANISATION_REQUEST);

    expect(detail).toMatchObject({
      id: CREATED_CAMPAIGN_ID,
      organisationId: PRIMARY_ORGANISATION_ID,
      name: 'Created organisation Draft',
      description: 'Created through the development adapter.',
      accentColor: '#8400FF',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'DRAFT',
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-10-01T17:00:00.000Z',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      allowedActions: ['VIEW', 'EDIT'],
      items: [],
    });
  });

  it('makes a created Draft available through detail and list operations', async () => {
    const client = createClient();

    await client.createCampaignDraft(ORGANISATION_CONTEXT, ORGANISATION_REQUEST);

    const detail = await client.getCampaignDetail(ORGANISATION_CONTEXT, CREATED_CAMPAIGN_ID);
    const list = await client.listCampaigns(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
      search: 'Created organisation',
    });

    expect(detail.id).toBe(CREATED_CAMPAIGN_ID);
    expect(list.items).toEqual([
      expect.objectContaining({
        id: CREATED_CAMPAIGN_ID,
        name: 'Created organisation Draft',
        itemCount: 0,
      }),
    ]);
  });

  it('does not expose a created organisation Draft through another context', async () => {
    const client = createClient();
    const secondaryContext = {
      kind: 'organisation' as const,
      organisationId: SECONDARY_ORGANISATION_ID,
    };

    await client.createCampaignDraft(ORGANISATION_CONTEXT, ORGANISATION_REQUEST);

    await expect(client.getCampaignDetail(secondaryContext, CREATED_CAMPAIGN_ID)).rejects.toThrow(
      'Campaign not found',
    );

    const list = await client.listCampaigns(secondaryContext, {
      page: 1,
      limit: 10,
      search: 'Created organisation',
    });

    expect(list.items).toEqual([]);
  });

  it('creates a platform Draft with platform type and null dates', async () => {
    const client = createClient();

    const detail = await client.createCampaignDraft(
      {
        kind: 'platform',
      },
      {
        name: 'Created platform Draft',
        description: null,
        accentColor: '#3100E4',
        items: [],
      },
    );

    expect(detail).toMatchObject({
      id: CREATED_CAMPAIGN_ID,
      organisationId: null,
      name: 'Created platform Draft',
      campaignType: 'PREMADE_GENERAL',
      status: 'DRAFT',
      startDate: null,
      endDate: null,
      allowedActions: ['VIEW', 'EDIT'],
      items: [],
    });
  });

  it('rejects platform dates if they reach the development adapter', async () => {
    const client = createClient();

    await expect(
      client.createCampaignDraft(
        {
          kind: 'platform',
        },
        {
          name: 'Invalid platform Draft',
          description: null,
          accentColor: '#3100E4',
          startDate: '2026-09-01T08:00:00.000Z',
          items: [],
        },
      ),
    ).rejects.toThrow('Platform campaigns cannot have dates.');
  });

  it('persists an editable Draft update consistently across detail and list', async () => {
    const client = createClient();

    const updated = await client.updateCampaignDraft(
      ORGANISATION_CONTEXT,
      DRAFT_CAMPAIGN_ID,
      UPDATE_REQUEST,
    );

    const detail = await client.getCampaignDetail(ORGANISATION_CONTEXT, DRAFT_CAMPAIGN_ID);
    const list = await client.listCampaigns(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
      search: 'Updated organisation',
    });

    expect(updated).toMatchObject({
      name: 'Updated organisation Draft',
      items: [],
    });
    expect(updated.updatedAt).not.toBe(ORIGINAL_UPDATED_AT);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(ORIGINAL_UPDATED_AT));

    expect(detail).toMatchObject({
      name: 'Updated organisation Draft',
      updatedAt: updated.updatedAt,
      items: [],
    });
    expect(list.items).toEqual([
      expect.objectContaining({
        id: DRAFT_CAMPAIGN_ID,
        name: 'Updated organisation Draft',
        itemCount: 0,
        updatedAt: updated.updatedAt,
      }),
    ]);
  });

  it('rejects an update with a stale authoritative timestamp', async () => {
    const client = createClient();

    const error = await client
      .updateCampaignDraft(ORGANISATION_CONTEXT, DRAFT_CAMPAIGN_ID, {
        ...UPDATE_REQUEST,
        expectedUpdatedAt: '2026-08-01T00:00:00.000Z',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CampaignManagementClientError);
    expect(error).toMatchObject({ code: 'CAMPAIGN_CHANGED' });
  });

  it('rejects a Draft without authoritative EDIT permission', async () => {
    const client = createClient();

    const error = await client
      .updateCampaignDraft(ORGANISATION_CONTEXT, VIEW_ONLY_DRAFT_ID, UPDATE_REQUEST)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CampaignManagementClientError);
    expect(error).toMatchObject({ code: 'CAMPAIGN_IMMUTABLE' });
  });

  it('assigns and preserves an authoritative Campaign item ID', async () => {
    const client = createClient();
    const created = await client.createCampaignDraft(ORGANISATION_CONTEXT, {
      ...ORGANISATION_REQUEST,
      items: [
        {
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          contentId: '50000000-0000-4000-8000-000000000002',
          isRequired: true,
        },
      ],
    });

    expect(created.items[0]?.campaignItemId).toBe(CREATED_ITEM_ID);

    const updated = await client.updateCampaignDraft(ORGANISATION_CONTEXT, created.id, {
      ...ORGANISATION_REQUEST,
      expectedUpdatedAt: created.updatedAt,
      items: [
        {
          itemType: 'COMPONENT',
          campaignItemId: CREATED_ITEM_ID,
          componentType: 'QUIZ',
          contentId: '50000000-0000-4000-8000-000000000002',
          isRequired: true,
        },
      ],
    });

    expect(updated.items[0]?.campaignItemId).toBe(CREATED_ITEM_ID);

    const list = await client.listCampaigns(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
      search: ORGANISATION_REQUEST.name,
    });
    expect(list.items[0]?.itemCount).toBe(1);
  });

  it('rejects persisted ID source reassignment without mutating stored items', async () => {
    const client = createClient();
    const created = await client.createCampaignDraft(ORGANISATION_CONTEXT, {
      ...ORGANISATION_REQUEST,
      items: [
        {
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          contentId: '50000000-0000-4000-8000-000000000002',
          isRequired: true,
        },
      ],
    });

    await expect(
      client.updateCampaignDraft(ORGANISATION_CONTEXT, created.id, {
        ...ORGANISATION_REQUEST,
        expectedUpdatedAt: created.updatedAt,
        items: [
          {
            itemType: 'COMPONENT',
            campaignItemId: CREATED_ITEM_ID,
            componentType: 'TRAINING_DOCUMENT',
            contentId: '50000000-0000-4000-8000-000000000001',
            isRequired: true,
          },
        ],
      }),
    ).rejects.toThrow(
      'An existing Campaign Item cannot be reassigned to different reusable content.',
    );

    const detail = await client.getCampaignDetail(ORGANISATION_CONTEXT, created.id);
    expect(detail.items[0]).toMatchObject({
      campaignItemId: CREATED_ITEM_ID,
      componentType: 'QUIZ',
      contentId: '50000000-0000-4000-8000-000000000002',
    });
  });

  it('rejects duplicate Campaign content sources', async () => {
    const client = createClient();
    const duplicate = {
      itemType: 'COMPONENT' as const,
      componentType: 'QUIZ' as const,
      contentId: '50000000-0000-4000-8000-000000000002',
      isRequired: true,
    };

    await expect(
      client.createCampaignDraft(ORGANISATION_CONTEXT, {
        ...ORGANISATION_REQUEST,
        items: [duplicate, { ...duplicate }],
      }),
    ).rejects.toThrow('The same reusable content cannot appear more than once in a Campaign.');
  });

  it('rejects duplicate persisted Campaign Item IDs', async () => {
    const client = createClient();

    await expect(
      client.createCampaignDraft(ORGANISATION_CONTEXT, {
        ...ORGANISATION_REQUEST,
        items: [
          {
            itemType: 'COMPONENT',
            campaignItemId: 'supplied-duplicate-id',
            componentType: 'QUIZ',
            contentId: '50000000-0000-4000-8000-000000000002',
            isRequired: true,
          },
          {
            itemType: 'COMPONENT',
            campaignItemId: 'supplied-duplicate-id',
            componentType: 'TRAINING_DOCUMENT',
            contentId: '50000000-0000-4000-8000-000000000001',
            isRequired: true,
          },
        ],
      }),
    ).rejects.toThrow('The same Campaign Item ID cannot appear more than once.');
  });

  it('activates a valid Draft with authoritative lifecycle state', async () => {
    const client = createClient();
    const created = await client.createCampaignDraft(ORGANISATION_CONTEXT, {
      ...ORGANISATION_REQUEST,
      items: [
        {
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          contentId: '50000000-0000-4000-8000-000000000002',
          isRequired: true,
        },
      ],
    });

    expect(created.allowedActions).toContain('ACTIVATE');

    const activated = await client.activateCampaign(ORGANISATION_CONTEXT, created.id, {
      expectedUpdatedAt: created.updatedAt,
    });

    expect(activated.status).toBe('ACTIVE');
    expect(Date.parse(activated.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
    expect(activated.allowedActions).toEqual(['VIEW', 'ARCHIVE']);
  });

  it('leaves an empty Draft unchanged after failed activation', async () => {
    const client = createClient();
    const created = await client.createCampaignDraft(ORGANISATION_CONTEXT, ORGANISATION_REQUEST);
    const originalActions = [...created.allowedActions];

    const error = await client
      .activateCampaign(ORGANISATION_CONTEXT, created.id, {
        expectedUpdatedAt: created.updatedAt,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CampaignManagementClientError);
    expect(error).toMatchObject({ code: 'EMPTY_CAMPAIGN' });

    const unchanged = await client.getCampaignDetail(ORGANISATION_CONTEXT, created.id);

    expect(unchanged.status).toBe('DRAFT');
    expect(unchanged.updatedAt).toBe(created.updatedAt);
    expect(unchanged.items).toEqual(created.items);
    expect(unchanged.allowedActions).toEqual(originalActions);
  });

  it('mirrors direct backend activation for an expired Draft', async () => {
    const client = createClient();
    const created = await client.createCampaignDraft(ORGANISATION_CONTEXT, {
      ...ORGANISATION_REQUEST,
      startDate: '2026-07-01T08:00:00.000Z',
      endDate: '2026-08-01T17:00:00.000Z',
      items: [
        {
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          contentId: '50000000-0000-4000-8000-000000000002',
          isRequired: true,
        },
      ],
    });

    expect(created.allowedActions).not.toContain('ACTIVATE');

    const activated = await client.activateCampaign(ORGANISATION_CONTEXT, created.id, {
      expectedUpdatedAt: created.updatedAt,
    });

    expect(activated.status).toBe('ACTIVE');
    expect(activated.allowedActions).toEqual(['VIEW', 'ARCHIVE']);
  });
});
