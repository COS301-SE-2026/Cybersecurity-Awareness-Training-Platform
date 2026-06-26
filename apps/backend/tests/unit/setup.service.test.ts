import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
  completeSetupWithToken,
  getSetupTokenContext,
  SetupFlowError,
} from '../../src/services/setup.service.js';

const setupRepositoryMock = vi.hoisted(() => ({
  activateOrganisationAdminUser: vi.fn(),
  activateOrganisationTraineeUser: vi.fn(),
  activatePlatformAdminUser: vi.fn(),
  createOrganisationAdminUser: vi.fn(),
  createOrganisationTraineeUser: vi.fn(),
  createPlatformAdminUser: vi.fn(),
  findSetupActionTokenById: vi.fn(),
  findSetupUserByEmail: vi.fn(),
  markInvitationAccepted: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  runWithConsumedActionToken: vi.fn(),
  validateActionToken: vi.fn(),
}));

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
}));

vi.mock('../../src/repositories/setup.repository.js', () => setupRepositoryMock);
vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);
vi.mock('../../src/services/password.service.js', () => passwordServiceMock);

const tx = { transaction: true };
const rawSetupValue = ['raw', 'setup', 'value'].join('-');
const strongTestPassword = ['Stronger', 'Pass', '1!'].join('');

const activeOrganisation = {
  id: 'org-1',
  name: 'Acme Security',
  status: 'ACTIVE',
};

const publicUser = {
  id: 'user-1',
  firstName: 'Johan',
  lastName: 'Nel',
  email: 'trainee@example.com',
  userType: 'ORGANISATION_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: new Date('2026-06-25T08:00:00.000Z'),
};

const completeSetupInput = {
  firstName: 'Johan',
  lastName: 'Nel',
  password: strongTestPassword,
  confirmPassword: strongTestPassword,
};

const publicUserResponse = {
  id: 'user-1',
  firstName: 'Johan',
  lastName: 'Nel',
  email: 'trainee@example.com',
  userType: 'ORGANISATION_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: '2026-06-25T08:00:00.000Z',
};

function setupToken(overrides = {}) {
  return {
    id: 'action-token-1',
    purpose: 'ORGANISATION_TRAINEE_INVITE',
    targetEmail: null,
    invitationId: 'invitation-1',
    organisationRegistrationRequestId: null,
    userId: null,
    invitation: {
      id: 'invitation-1',
      recipientEmail: 'trainee@example.com',
      organisationId: 'org-1',
      status: 'PENDING',
      expiresAt: new Date('2026-06-26T08:00:00.000Z'),
      organisation: activeOrganisation,
      organisationRegistrationRequest: null,
    },
    organisationRegistrationRequest: null,
    user: null,
    ...overrides,
  };
}

describe('setup service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25'));
    vi.clearAllMocks();

    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: { id: 'action-token-1' },
    });
    actionTokenServiceMock.runWithConsumedActionToken.mockImplementation(
      async (_input, action) => ({
        claimed: true,
        result: await action(tx),
      }),
    );

    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(setupToken());
    setupRepositoryMock.findSetupUserByEmail.mockResolvedValue(null);
    setupRepositoryMock.createOrganisationTraineeUser.mockResolvedValue(publicUser);
    setupRepositoryMock.markInvitationAccepted.mockResolvedValue({ id: 'invitation-1' });

    passwordServiceMock.hashPassword.mockResolvedValue('hashed-password');
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({ queued: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns safe setup context without consuming the action token', async () => {
    const response = await getSetupTokenContext(rawSetupValue);

    expect(actionTokenServiceMock.validateActionToken).toHaveBeenCalledWith({
      rawToken: rawSetupValue,
      expectedPurpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    });
    expect(setupRepositoryMock.findSetupActionTokenById).toHaveBeenCalledWith('action-token-1');
    expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
    expect(response).toEqual({
      token: {
        state: 'VALID',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
      },
      targetEmail: 'trainee@example.com',
      organisationName: 'Acme Security',
    });
  });

  it('returns invalid context when the token cannot be validated', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({ state: 'INVALID' });

    const response = await getSetupTokenContext('missing-token');

    expect(response).toEqual({
      token: {
        state: 'INVALID',
      },
    });
    expect(setupRepositoryMock.findSetupActionTokenById).not.toHaveBeenCalled();
  });

  it('hashes the password, creates the invited trainee, accepts the invite, and sends the email hook', async () => {
    const response = await completeSetupWithToken(rawSetupValue, completeSetupInput);

    expect(passwordServiceMock.hashPassword).toHaveBeenCalledWith(strongTestPassword);
    expect(actionTokenServiceMock.runWithConsumedActionToken).toHaveBeenCalledWith(
      { tokenId: 'action-token-1' },
      expect.any(Function),
    );
    expect(setupRepositoryMock.createOrganisationTraineeUser).toHaveBeenCalledWith(
      {
        email: 'trainee@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
      },
      tx,
    );
    expect(setupRepositoryMock.markInvitationAccepted).toHaveBeenCalledWith('invitation-1', tx);
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith({
      emailType: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: 'trainee@example.com',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
      organisationId: 'org-1',
      invitationId: 'invitation-1',
    });
    expect(response).toEqual({
      user: publicUserResponse,
      confirmationEmailQueued: false,
    });
  });

  it('rejects used setup tokens before hashing the password or consuming the token', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'USED',
      token: { id: 'action-token-1' },
    });

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toMatchObject({
      statusCode: 401,
      error: 'SETUP_TOKEN_USED',
    });

    expect(passwordServiceMock.hashPassword).not.toHaveBeenCalled();
    expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
  });

  it('rejects blocked organisations and does not consume the token', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({
        invitation: {
          ...setupToken().invitation,
          organisation: {
            ...activeOrganisation,
            status: 'DISABLED',
          },
        },
      }),
    );

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_DISABLED',
    });

    expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('does not send the email hook when the action-token claim is stale', async () => {
    actionTokenServiceMock.runWithConsumedActionToken.mockResolvedValue({
      claimed: false,
    });

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toBeInstanceOf(
      SetupFlowError,
    );

    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });
});
