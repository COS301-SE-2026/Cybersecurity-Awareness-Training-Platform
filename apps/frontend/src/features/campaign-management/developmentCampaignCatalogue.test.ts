import { describe, expect, it } from 'vitest';
import { createDevelopmentCampaignManagementClient } from './developmentCampaignManagementClient';

const ORGANISATION_CONTEXT = {
  kind: 'organisation' as const,
  organisationId: '11111111-1111-4111-8111-111111111111',
};

function createClient() {
  return createDevelopmentCampaignManagementClient();
}

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
      totalItems: 4,
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
      totalItems: 2,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});
