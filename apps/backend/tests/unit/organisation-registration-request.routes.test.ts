import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearApiRateLimitStore } from '../../src/middleware/apiRateLimit.js';

const serviceMock = vi.hoisted(() => {
  class MockOrganisationRegistrationRequestError extends Error {
    constructor(
      public readonly statusCode: 409,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'OrganisationRegistrationRequestError';
    }
  }

  return {
    OrganisationRegistrationRequestError: MockOrganisationRegistrationRequestError,
    createOrganisationRegistrationRequest: vi.fn(),
  };
});

vi.mock('../../src/services/organisation-registration-request.service.js', () => serviceMock);

function validPayload() {
  return {
    organisationName: 'Example Consulting',
    organisationDescription: 'A fake consulting organisation for tests.',
    organisationSize: 75,
    organisationWebsiteUrl: 'https://example-consulting.test',
    representativeFirstName: 'Adriano',
    representativeLastName: 'Jorge',
    representativeEmail: 'adriano@example.test',
  };
}

describe('organisation registration request routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearApiRateLimitStore();
  });

  it('submits a valid public request', async () => {
    serviceMock.createOrganisationRegistrationRequest.mockResolvedValue({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send(validPayload());

    expect(response.status).toBe(201);
    expect(serviceMock.createOrganisationRegistrationRequest).toHaveBeenCalledWith(validPayload());
    expect(response.body).toEqual({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });
  });

  it('returns 422 for invalid request bodies', async () => {
    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send({
        ...validPayload(),
        organisationWebsiteUrl: 'not-a-url',
      });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(serviceMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('returns 422 for non-web website URL schemes', async () => {
    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send({
        ...validPayload(),
        organisationWebsiteUrl: 'mailto:admin@example.test',
      });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(serviceMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('maps duplicate conflicts to 409 with safe wording', async () => {
    serviceMock.createOrganisationRegistrationRequest.mockRejectedValue(
      new serviceMock.OrganisationRegistrationRequestError(
        409,
        'ORGANISATION_REQUEST_CONFLICT',
        'The organisation registration request conflicts with existing records.',
      ),
    );

    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send(validPayload());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'ORGANISATION_REQUEST_CONFLICT',
      message: 'The organisation registration request conflicts with existing records.',
    });
  });
});
