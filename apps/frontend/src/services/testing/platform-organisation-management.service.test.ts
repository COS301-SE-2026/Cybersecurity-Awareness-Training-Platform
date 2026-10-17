import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import {
  listAllPlatformOrganisationRequests,
  listPlatformOrganisationRequests,
  type PlatformOrganisationRequestListItemDto,
} from '../platform-organisation-management.service';

vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('preserves the single-page contract and accepts supported page and limit arguments', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({
    requests: [],
    pagination: { page: 2, limit: 20, total: 101, totalPages: 6 },
  });
  const result = await listPlatformOrganisationRequests({ page: 2, limit: 20 }, 'token');
  expect(apiClient.get).toHaveBeenCalledWith('platform/organisation-requests?page=2&limit=20', {
    authToken: 'token',
  });
  expect(result.pagination.page).toBe(2);
});

it('collects every page by pagination metadata and combines stable IDs', async () => {
  const first = Array.from(
    { length: 100 },
    (_, i) => ({ id: `request-${i}` }) as PlatformOrganisationRequestListItemDto,
  );
  vi.mocked(apiClient.get)
    .mockResolvedValueOnce({ requests: first, pagination: { totalPages: 3 } })
    .mockResolvedValueOnce({
      requests: [{ ...first[0], submittedPrimaryDomain: 'updated.test' }],
      pagination: { totalPages: 3 },
    })
    .mockResolvedValueOnce({
      requests: [{ id: 'older-record', submittedWebsite: 'https://old.test' }],
      pagination: { totalPages: 3 },
    });
  const result = await listAllPlatformOrganisationRequests({}, 'token');
  expect(result).toHaveLength(101);
  expect(result[0].submittedPrimaryDomain).toBe('updated.test');
  expect(result[100].id).toBe('older-record');
  expect(apiClient.get).toHaveBeenNthCalledWith(
    3,
    'platform/organisation-requests?page=3&limit=100',
    { authToken: 'token' },
  );
});

it('rejects a later-page failure instead of returning a partial collection', async () => {
  vi.mocked(apiClient.get)
    .mockResolvedValueOnce({ requests: [{ id: 'newest' }], pagination: { totalPages: 2 } })
    .mockRejectedValueOnce(new Error('Second page unavailable'));
  await expect(listAllPlatformOrganisationRequests({}, 'token')).rejects.toThrow(
    'Second page unavailable',
  );
});
