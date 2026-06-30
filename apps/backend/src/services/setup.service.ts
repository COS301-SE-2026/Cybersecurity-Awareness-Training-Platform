import type {
  SetupCompleteRequestDto,
  SetupCompleteResponseDto,
  SetupTokenContextResponseDto,
} from '@insightful-phish/shared';
import type { ActionTokenPurpose } from '../generated/prisma/enums.js';
import { toPublicUserDto } from '../mappers/user.mapper.js';
import {
  activateOrganisationAdminUser,
  activateOrganisationTraineeUser,
  activatePlatformAdminUser,
  createOrganisationAdminUser,
  createOrganisationTraineeUser,
  createPlatformAdminUser,
  findSetupActionTokenById,
  findSetupUserByEmail,
  markInvitationAccepted,
  type SetupUserType,
} from '../repositories/setup.repository.js';
import { runWithConsumedActionToken, validateActionToken } from './action-token.service.js';
import { ensureActiveOrganisation } from './auth-status-guard.service.js';
import { hashPassword } from './password.service.js';

const SETUP_TOKEN_PURPOSES = [
  'INITIAL_ORGANISATION_ADMIN_SETUP',
  'ORGANISATION_TRAINEE_INVITE',
  'PLATFORM_ADMIN_INVITE',
] as const satisfies readonly ActionTokenPurpose[];

type SetupTransaction = Parameters<Parameters<typeof runWithConsumedActionToken>[1]>[0];
type SetupActionToken = NonNullable<Awaited<ReturnType<typeof findSetupActionTokenById>>>;

export class SetupFlowError extends Error {
  constructor(
    public readonly statusCode: 401 | 409,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'SetupFlowError';
  }
}

export async function getSetupTokenContext(
  rawToken: string,
): Promise<SetupTokenContextResponseDto> {
  const validation = await validateSetupToken(rawToken);

  if (validation.state !== 'VALID') {
    return {
      token: {
        state: validation.state,
      },
    };
  }

  const setupToken = await findSetupActionTokenById(validation.token.id);
  if (!setupToken) {
    return { token: { state: 'INVALID' } };
  }

  assertSetupRecordIsUsable(setupToken);

  return {
    token: {
      state: 'VALID',
      purpose: setupToken.purpose,
    },
    targetEmail: setupTargetEmail(setupToken) ?? undefined,
    organisationName: setupToken.invitation?.organisation.name,
  };
}

export async function completeSetupWithToken(
  rawToken: string,
  input: SetupCompleteRequestDto,
): Promise<SetupCompleteResponseDto> {
  const validation = await validateSetupToken(rawToken);
  if (validation.state !== 'VALID') {
    throw tokenStateError(validation.state);
  }

  const setupToken = await findSetupActionTokenById(validation.token.id);
  if (!setupToken) {
    throw tokenStateError('INVALID');
  }

  assertSetupRecordIsUsable(setupToken);

  const targetEmail = setupTargetEmail(setupToken);
  if (!targetEmail) {
    throw new SetupFlowError(409, 'SETUP_TARGET_EMAIL_MISSING', 'Setup link is incomplete');
  }

  const passwordHash = await hashPassword(input.password);

  const claimed = await runWithConsumedActionToken({ tokenId: setupToken.id }, async (tx) => {
    const freshToken = await findSetupActionTokenById(setupToken.id, tx);
    if (!freshToken) {
      throw tokenStateError('INVALID');
    }

    assertSetupRecordIsUsable(freshToken);

    const role = setupUserTypeForPurpose(freshToken.purpose);
    const organisationId = freshToken.invitation?.organisationId ?? null;
    const existingUser = await findSetupUserByEmail(targetEmail, tx);
    const userInput = {
      email: targetEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
    };

    const user = existingUser
      ? await activateExistingSetupUser({
          userId: existingUser.id,
          currentUserType: existingUser.userType,
          currentAuthStatus: existingUser.authStatus,
          role,
          organisationId,
          userInput,
          tx,
        })
      : await createSetupUser({ role, organisationId, userInput, tx });

    if (freshToken.invitationId) {
      await markInvitationAccepted(freshToken.invitationId, tx);
    }

    return user;
  });

  if (!claimed.claimed || !claimed.result) {
    throw new SetupFlowError(409, 'SETUP_TOKEN_STALE', 'Setup link has already been used');
  }

  return {
    user: toPublicUserDto(claimed.result),
  };
}

async function validateSetupToken(rawToken: string) {
  let lastState: 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED' = 'INVALID';

  for (const purpose of SETUP_TOKEN_PURPOSES) {
    const result = await validateActionToken({ rawToken, expectedPurpose: purpose });

    if (result.state === 'VALID') {
      return result;
    }

    if (result.state !== 'WRONG_PURPOSE' && result.state !== 'INVALID') {
      lastState = result.state;
      return { state: lastState, token: result.token };
    }
  }

  return { state: lastState };
}

function assertSetupRecordIsUsable(setupToken: SetupActionToken) {
  const invitation = setupToken.invitation;
  if (!invitation) {
    if (setupToken.purpose === 'PLATFORM_ADMIN_INVITE') {
      return;
    }

    throw new SetupFlowError(409, 'SETUP_INVITATION_MISSING', 'Setup invitation is not available');
  }

  if (invitation.status !== 'PENDING' && invitation.status !== 'SENT') {
    throw new SetupFlowError(
      409,
      'SETUP_INVITATION_NOT_ACCEPTABLE',
      'Setup invitation is not available for completion',
    );
  }

  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw new SetupFlowError(409, 'SETUP_INVITATION_EXPIRED', 'Setup invitation has expired');
  }

  const organisationResult = ensureActiveOrganisation(invitation.organisation);
  if (!organisationResult.allowed) {
    throw new SetupFlowError(409, organisationResult.code, organisationResult.message);
  }
}

function setupTargetEmail(setupToken: SetupActionToken) {
  return (
    setupToken.targetEmail ??
    setupToken.invitation?.recipientEmail ??
    setupToken.user?.email ??
    null
  );
}

function setupUserTypeForPurpose(purpose: ActionTokenPurpose): SetupUserType {
  if (purpose === 'INITIAL_ORGANISATION_ADMIN_SETUP') {
    return 'ORGANISATION_ADMIN';
  }

  if (purpose === 'ORGANISATION_TRAINEE_INVITE') {
    return 'ORGANISATION_TRAINEE';
  }

  if (purpose === 'PLATFORM_ADMIN_INVITE') {
    return 'IP_ADMIN';
  }

  throw new SetupFlowError(409, 'SETUP_TOKEN_PURPOSE_UNSUPPORTED', 'Setup link is not supported');
}

function tokenStateError(state: 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED') {
  const messages = {
    INVALID: 'Setup link is invalid',
    EXPIRED: 'Setup link has expired',
    USED: 'Setup link has already been used',
    REVOKED: 'Setup link has been revoked',
  };

  return new SetupFlowError(401, `SETUP_TOKEN_${state}`, messages[state]);
}

async function createSetupUser(input: {
  role: SetupUserType;
  organisationId: string | null;
  userInput: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  };
  tx: SetupTransaction;
}) {
  if (input.role === 'IP_ADMIN') {
    return createPlatformAdminUser(input.userInput, input.tx);
  }

  if (!input.organisationId) {
    throw new SetupFlowError(409, 'SETUP_ORGANISATION_MISSING', 'Setup organisation is missing');
  }

  if (input.role === 'ORGANISATION_ADMIN') {
    return createOrganisationAdminUser(
      { ...input.userInput, organisationId: input.organisationId },
      input.tx,
    );
  }

  return createOrganisationTraineeUser(
    { ...input.userInput, organisationId: input.organisationId },
    input.tx,
  );
}

async function activateExistingSetupUser(input: {
  userId: string;
  currentUserType: SetupUserType | 'GENERAL_TRAINEE';
  currentAuthStatus: string;
  role: SetupUserType;
  organisationId: string | null;
  userInput: {
    firstName: string;
    lastName: string;
    passwordHash: string;
  };
  tx: SetupTransaction;
}) {
  if (input.currentUserType !== input.role || input.currentAuthStatus === 'DISABLED') {
    throw new SetupFlowError(
      409,
      'SETUP_ROLE_CONFLICT',
      'Setup conflicts with an existing account',
    );
  }

  if (input.role === 'IP_ADMIN') {
    return activatePlatformAdminUser({ userId: input.userId, ...input.userInput }, input.tx);
  }

  if (!input.organisationId) {
    throw new SetupFlowError(409, 'SETUP_ORGANISATION_MISSING', 'Setup organisation is missing');
  }

  if (input.role === 'ORGANISATION_ADMIN') {
    return activateOrganisationAdminUser(
      { userId: input.userId, organisationId: input.organisationId, ...input.userInput },
      input.tx,
    );
  }

  return activateOrganisationTraineeUser(
    { userId: input.userId, organisationId: input.organisationId, ...input.userInput },
    input.tx,
  );
}
