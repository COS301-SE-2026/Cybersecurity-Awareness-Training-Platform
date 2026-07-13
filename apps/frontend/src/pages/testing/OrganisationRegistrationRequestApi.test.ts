import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createJsonResponse,
  setupHttpTest,
  teardownHttpTest,
} from '../../lib/testing/httpTestUtils';
import { submitOrganisationRegistrationRequest } from '../../services/organisation-registration-request.service';

const fetchMock = vi.fn();

describe('submitOrganisationRegistrationRequest', () => {
  beforeEach(() => {
    setupHttpTest(fetchMock);
  });

  afterEach(() => {
    teardownHttpTest();
  });

  it('sends POST /organisation-registration-requests with the request payload', async () => {
    const payload = {
      organisationName: 'CBELL Plumbing',
      organisationDescription: 'Plumbing services',
      organisationSize: 25,
      organisationWebsiteUrl: 'https://cbell.example.com',
      representativeFirstName: 'Casey',
      representativeLastName: 'Bell',
      representativeEmail: 'casey@example.com',
    };

    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          requestId: 'request-1',
          status: 'PENDING_REVIEW',
          confirmationEmailQueued: true,
        },
        { status: 201 },
      ),
    );

    await expect(submitOrganisationRegistrationRequest(payload)).resolves.toEqual({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/organisation-registration-requests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });
});
