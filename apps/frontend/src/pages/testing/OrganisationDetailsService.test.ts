import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getOwnOrganisationDetail,
  getPlatformOrganisationDetail,
  getPlatformOrganisationRequestDetails,
  resendInitialAdminSetup,
} from '../../services/organisation-details.service';
import { apiClient } from '../../lib/apiClient';

// unit test example for organisation details API service module
// tests get org detail, get request detail, and resend setup email endpoints

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Organisation Details Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /organisations/:organisationId with auth token', async () => {
    const mockResponse = { id: 'org-123', name: 'Cyber Jan Technologies' };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await getOwnOrganisationDetail('org-123', 'test-token');

    expect(apiClient.get).toHaveBeenCalledWith('/organisations/org-123', {
      authToken: 'test-token',
    });
    expect(result).toEqual(mockResponse);
  });

  it('calls GET /platform/organisations/:organisationId with auth token', async () => {
    const mockResponse = { id: 'org-123', name: 'Cyber Jan Technologies' };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await getPlatformOrganisationDetail('org-123', 'test-token');

    expect(apiClient.get).toHaveBeenCalledWith('/platform/organisations/org-123', {
      authToken: 'test-token',
    });
    expect(result).toEqual(mockResponse);
  });

  it('calls GET /platform/organisation-requests/:requestId/details with auth token', async () => {
    const mockResponse = { id: 'req-456', submittedOrganisationName: 'Cyber Jan Pending Org' };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await getPlatformOrganisationRequestDetails('req-456', 'test-token');

    expect(apiClient.get).toHaveBeenCalledWith('/platform/organisation-requests/req-456/details', {
      authToken: 'test-token',
    });
    expect(result).toEqual(mockResponse);
  });

  it('calls POST /platform/organisations/:organisationId/resend-initial-admin-setup', async () => {
    const mockResponse = { success: true, emailQueued: true, setupStatus: null };
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await resendInitialAdminSetup('org-123', 'test-token');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/platform/organisations/org-123/resend-initial-admin-setup',
      undefined,
      { authToken: 'test-token' },
    );
    expect(result).toEqual(mockResponse);
  });
});

