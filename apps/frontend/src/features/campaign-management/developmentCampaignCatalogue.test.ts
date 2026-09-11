import { describe, expect, it } from 'vitest';
import { createDevelopmentCampaignManagementClient } from './developmentCampaignManagementClient';

const ORGANISATION_CONTEXT = {
  kind: 'organisation' as const,
  organisationId: '11111111-1111-4111-8111-111111111111',
};

function createClient() {
  return createDevelopmentCampaignManagementClient();
}

const PLATFORM_CONTEXT = {
  kind: 'platform' as const,
};

const SECONDARY_ORGANISATION_CONTEXT = {
  kind: 'organisation' as const,
  organisationId: '22222222-2222-4222-8222-222222222222',
};

describe('development Campaign catalogue', () => {
  it('returns every supported catalogue item category', async () => {
    const response = await createClient().getCampaignCatalogue(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
    });

    expect(response.items.map((item) => item.type)).toEqual(
      expect.arrayContaining(['TRAINING_DOCUMENT', 'QUIZ', 'SIMULATED_INBOX']),
    );
    expect(response.pagination).toEqual({
      page: 1,
      limit: 10,
      totalItems: 5,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('applies search, type filtering, and pagination', async () => {
    const client = createClient();

    const searchResponse = await client.getCampaignCatalogue(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
      search: ' PASSWORD ',
    });

    expect(searchResponse.items.map((item) => item.title)).toEqual([
      'Password security essentials',
      'Password safety quiz',
    ]);

    const pageResponse = await client.getCampaignCatalogue(ORGANISATION_CONTEXT, {
      page: 2,
      limit: 1,
      type: 'TRAINING_DOCUMENT',
    });

    expect(pageResponse.items).toEqual([
      expect.objectContaining({
        type: 'TRAINING_DOCUMENT',
        title: 'Remote work security',
      }),
    ]);
    expect(pageResponse.pagination).toEqual({
      page: 2,
      limit: 1,
      totalItems: 3,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('applies category filtering', async () => {
    const response = await createClient().getCampaignCatalogue(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
      category: 'PASSWORDS_AND_AUTHENTICATION',
    });

    expect(response.items.map((item) => item.title)).toEqual([
      'Password security essentials',
      'Password safety quiz',
    ]);
  });

  it('keeps organisation-owned catalogue content within its organisation', async () => {
    const client = createClient();
    const primary = await client.getCampaignCatalogue(ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
    });
    const secondary = await client.getCampaignCatalogue(SECONDARY_ORGANISATION_CONTEXT, {
      page: 1,
      limit: 10,
    });
    const platform = await client.getCampaignCatalogue(PLATFORM_CONTEXT, {
      page: 1,
      limit: 10,
    });

    expect(primary.items.map((item) => item.id)).toContain('50000000-0000-4000-8000-000000000005');
    expect(primary.items.map((item) => item.id)).not.toContain(
      '50000000-0000-4000-8000-000000000006',
    );
    expect(secondary.items.map((item) => item.id)).toContain(
      '50000000-0000-4000-8000-000000000006',
    );
    expect(secondary.items.map((item) => item.id)).not.toContain(
      '50000000-0000-4000-8000-000000000005',
    );
    expect(platform.items.every((item) => item.organisationId === null)).toBe(true);
  });

  it('rejects a known content id owned by another organisation', async () => {
    await expect(
      createClient().createCampaignDraft(ORGANISATION_CONTEXT, {
        name: 'Invalid cross-tenant campaign',
        description: null,
        accentColor: '#2563EB',
        startDate: null,
        endDate: null,
        items: [
          {
            itemType: 'COMPONENT',
            componentType: 'TRAINING_DOCUMENT',
            contentId: '50000000-0000-4000-8000-000000000006',
            isRequired: true,
          },
        ],
      }),
    ).rejects.toThrow('Campaign catalogue item not found.');
  });
});
