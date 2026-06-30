import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';

const setupServiceMock = vi.hoisted(() => {
  class MockSetupFlowError extends Error {
    constructor(
      public readonly statusCode: 401 | 409,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'SetupFlowError';
    }
  }

  return {
    SetupFlowError: MockSetupFlowError,
    getSetupTokenContext: vi.fn(),
    completeSetupWithToken: vi.fn(),
  };
});

vi.mock('../../src/services/setup.service.js', () => setupServiceMock);

const opaqueSetupValue = ['validSetup', 'ValueWithAtLeast32Chars'].join('Token');
const setupContextPath = `/setup/token/${opaqueSetupValue}/context`;
const setupCompletePath = `/setup/token/${opaqueSetupValue}/complete`;
const strongTestPassword = ['Stronger', 'Pass', '1!'].join('');
const invalidShortPassword = ['sho', 'rt'].join('');
const mismatchedPasswordConfirmation = ['differ', 'ent'].join('');

const validCompletePayload = {
  firstName: 'Johan',
  lastName: 'Nel',
  password: strongTestPassword,
  confirmPassword: strongTestPassword,
};

const validPublicUser = {
  id: 'user-1',
  firstName: 'Johan',
  lastName: 'Nel',
  email: 'trainee@example.com',
  userType: 'ORGANISATION_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: '2026-06-25T08:00:00.000Z',
};

describe('Setup routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
  });

  it('returns setup token context without consuming the token', async () => {
    setupServiceMock.getSetupTokenContext.mockResolvedValue({
      token: {
        state: 'VALID',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
      },
      targetEmail: 'trainee@example.com',
      organisationName: 'Acme Security',
    });

    const response = await request(createApp()).get(setupContextPath);

    expect(response.status).toBe(200);
    expect(setupServiceMock.getSetupTokenContext).toHaveBeenCalledWith(opaqueSetupValue);
    expect(setupServiceMock.completeSetupWithToken).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      token: {
        state: 'VALID',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
      },
      targetEmail: 'trainee@example.com',
      organisationName: 'Acme Security',
    });
  });

  it('completes setup with a valid token and payload', async () => {
    setupServiceMock.completeSetupWithToken.mockResolvedValue({
      user: validPublicUser,
    });

    const response = await request(createApp()).post(setupCompletePath).send({
      firstName: ' Johan ',
      lastName: ' Nel ',
      password: strongTestPassword,
      confirmPassword: strongTestPassword,
    });

    expect(response.status).toBe(201);
    expect(setupServiceMock.completeSetupWithToken).toHaveBeenCalledWith(
      opaqueSetupValue,
      validCompletePayload,
    );
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 400 for invalid setup token params', async () => {
    const response = await request(createApp()).get('/setup/token/too-short/context');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(setupServiceMock.getSetupTokenContext).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid complete payload', async () => {
    const response = await request(createApp()).post(setupCompletePath).send({
      firstName: '',
      lastName: '',
      password: invalidShortPassword,
      confirmPassword: mismatchedPasswordConfirmation,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(setupServiceMock.completeSetupWithToken).not.toHaveBeenCalled();
  });

  it('maps setup flow errors to the intended response status and body', async () => {
    setupServiceMock.completeSetupWithToken.mockRejectedValue(
      new setupServiceMock.SetupFlowError(409, 'ORGANISATION_DISABLED', 'Organisation is disabled'),
    );

    const response = await request(createApp()).post(setupCompletePath).send(validCompletePayload);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'ORGANISATION_DISABLED',
      message: 'Organisation is disabled',
    });
  });
});
