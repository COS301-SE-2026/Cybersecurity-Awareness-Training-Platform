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
  SetupRepositoryConflictError,
  type SetupUserType,
} from '../repositories/setup.repository.js';
import { runWithConsumedActionToken, validateActionToken } from './action-token.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { ensureActiveOrganisation } from './auth-status-guard.service.js';
import { hashPassword } from './password.service.js';

const SETUP_TOKEN_PURPOSES = [
  'INITIAL_ORGANISATION_ADMIN_SETUP',
  'ORGANISATION_TRAINEE_INVITE',
  'PLATFORM_ADMIN_INVITE',
] as const satisfies readonly ActionTokenPurpose[];

type SetupTransaction = Parameters<Parameters<typeof runWithConsumedActionToken>[1]>[0];
type SetupActionToken = NonNullable<Awaited<ReturnType<typeof findSetupActionTokenById>>>;
type SetupTokenPurpose = (typeof SETUP_TOKEN_PURPOSES)[number];
function isSetupTokenPurpose(purpose: ActionTokenPurpose): purpose is SetupTokenPurpose {
  return SETUP_TOKEN_PURPOSES.includes(purpose as SetupTokenPurpose);
}

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
    targetFirstName: setupToken.invitation?.recipientFirstName ?? setupToken.user?.firstName,
    targetLastName: setupToken.invitation?.recipientLastName ?? setupToken.user?.lastName,
    role: setupUserTypeForPurpose(setupToken.purpose),
    organisationName: setupToken.invitation?.organisation.name,
  };
}

async function seedInitialAdminPermissionsAndActivateOrg(
  user: { id: string },
  freshToken: {
    purpose: string;
    invitation?: {
      organisation?: {
        id: string;
        status: string;
      } | null;
    } | null;
  },
  tx: SetupTransaction,
) {
  if (freshToken.purpose !== 'INITIAL_ORGANISATION_ADMIN_SETUP') {
    return;
  }
  const org = freshToken.invitation?.organisation;
  if (!org) {
    return;
  }

  if (org.status === 'PENDING_ONBOARDING' && 'organisation' in tx) {
    await tx.organisation.update({
      where: { id: org.id },
      data: { status: 'ACTIVE' },
    });
  }

  if (!('organisationAdminProfile' in tx)) {
    return;
  }

  const adminProfile = await tx.organisationAdminProfile.findFirst({
    where: { userId: user.id, organisationId: org.id },
  });

  if (!adminProfile) {
    return;
  }

  if ('organisationPermission' in tx && 'organisationAdminPermission' in tx) {
    const orgPermissions = await tx.organisationPermission.findMany({
      where: { organisationId: org.id },
    });

    const grantsData = orgPermissions.map((permission: { id: string }) => ({
      id: `org-admin-grant-${adminProfile.id}-${permission.id}`,
      organisationId: org.id,
      organisationAdminId: adminProfile.id,
      organisationPermissionId: permission.id,
    }));

    await tx.organisationAdminPermission.createMany({
      data: grantsData,
      skipDuplicates: true,
    });
  }
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

    // Full target-consistency check: the action-token target, invitation recipient,
    // and registration-request representative must all agree before we consume anything.
    assertSetupTargetConsistency(freshToken, targetEmail);

    const role = setupUserTypeForPurpose(freshToken.purpose);
    const organisationId = freshToken.invitation?.organisationId ?? null;
    const setupInvitationId = freshToken.invitationId ?? null;
    const existingUser = await findSetupUserByEmail(targetEmail, tx);
    const existingOrganisationTraineeProfile =
      existingUser?.traineeProfile?.organisationTraineeProfile ?? null;
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
          existingOrganisationTraineeProfile,
          role,
          organisationId,
          setupPurpose: freshToken.purpose,
          setupInvitationId,
          userInput: {
            firstName: input.firstName,
            lastName: input.lastName,
            passwordHash,
          },
          tx,
        })
      : await createSetupUser({
          role,
          organisationId,
          setupPurpose: freshToken.purpose,
          setupInvitationId,
          userInput,
          tx,
        });

    if (freshToken.invitationId) {
      await markInvitationAccepted(freshToken.invitationId, tx);
    }

    if (freshToken.purpose === 'INITIAL_ORGANISATION_ADMIN_SETUP' && freshToken.invitation) {
      await recordAuditLog(
        {
          actorUserId: user.id,
          actorType: 'ORGANISATION_ADMIN',
          organisationId: freshToken.invitation.organisationId,
          targetType: 'INVITATION',
          targetId: freshToken.invitation.id,
          actionType: 'COMPLETED',
          outcome: 'SUCCESS',
          metadata: {
            milestone: 'INITIAL_ADMIN_SETUP_COMPLETED',
          },
        },
        tx,
      );
    }

    await seedInitialAdminPermissionsAndActivateOrg(user, freshToken, tx);

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

function assertSetupRecordIsUsable(
  setupToken: SetupActionToken,
): asserts setupToken is SetupActionToken & { purpose: SetupTokenPurpose } {
  if (!isSetupTokenPurpose(setupToken.purpose)) {
    throw new SetupFlowError(409, 'SETUP_TOKEN_PURPOSE_UNSUPPORTED', 'Setup link is not supported');
  }
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
    const isInitialSetup = setupToken.purpose === 'INITIAL_ORGANISATION_ADMIN_SETUP';
    const isPendingOnboarding = invitation.organisation.status === 'PENDING_ONBOARDING';

    if (!(isInitialSetup && isPendingOnboarding)) {
      throw new SetupFlowError(409, organisationResult.code, organisationResult.message);
    }
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

function setupUserTypeForPurpose(purpose: SetupTokenPurpose): SetupUserType {
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
  setupPurpose: ActionTokenPurpose;
  setupInvitationId: string | null;
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
      {
        ...input.userInput,
        organisationId: input.organisationId,
        ...organisationAdminSetupMetadata(input.setupPurpose, input.setupInvitationId),
      },
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
  existingOrganisationTraineeProfile?: {
    organisationId: string;
    membershipStatus: string;
    disabledAt: Date | null;
  } | null;
  role: SetupUserType;
  organisationId: string | null;
  setupPurpose: ActionTokenPurpose;
  setupInvitationId: string | null;
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

  if (input.role === 'ORGANISATION_TRAINEE' && input.existingOrganisationTraineeProfile) {
    const traineeProfile = input.existingOrganisationTraineeProfile;
    if (
      traineeProfile.organisationId !== input.organisationId ||
      traineeProfile.membershipStatus !== 'ACTIVE' ||
      traineeProfile.disabledAt
    ) {
      throw new SetupFlowError(
        409,
        'SETUP_ROLE_CONFLICT',
        'Setup conflicts with an existing organisation trainee membership',
      );
    }
  }

  if (input.role === 'IP_ADMIN') {
    return activatePlatformAdminUser({ userId: input.userId, ...input.userInput }, input.tx);
  }

  if (!input.organisationId) {
    throw new SetupFlowError(409, 'SETUP_ORGANISATION_MISSING', 'Setup organisation is missing');
  }

  if (input.role === 'ORGANISATION_ADMIN') {
    try {
      return await activateOrganisationAdminUser(
        {
          userId: input.userId,
          organisationId: input.organisationId,
          ...input.userInput,
          ...organisationAdminSetupMetadata(input.setupPurpose, input.setupInvitationId),
        },
        input.tx,
      );
    } catch (err) {
      if (err instanceof SetupRepositoryConflictError) {
        throw new SetupFlowError(409, err.error, err.message);
      }
      throw err;
    }
  }

  return activateOrganisationTraineeUser(
    { userId: input.userId, organisationId: input.organisationId, ...input.userInput },
    input.tx,
  );
}

function organisationAdminSetupMetadata(
  setupPurpose: ActionTokenPurpose,
  setupInvitationId: string | null,
) {
  if (setupPurpose !== 'INITIAL_ORGANISATION_ADMIN_SETUP') {
    return {
      isInitialAdmin: false,
      createdFromInvitationId: null,
    };
  }

  return {
    isInitialAdmin: true,
    createdFromInvitationId: setupInvitationId,
  };
}

/**
 * Verifies that the action-token target email, invitation recipient email, and
 * (where applicable) registration-request representative email all agree.
 *
 * This is the final authority check before any user/profile state is consumed.
 * The resend flow checks some of these earlier, but setup completion must re-validate
 * to guard against edge cases where the invitation was created with inconsistent data.
 */
function assertSetupTargetConsistency(freshToken: SetupActionToken, targetEmail: string): void {
  const invitation = freshToken.invitation;
  if (!invitation) {
    // Platform-admin invites have no invitation; consistency is enforced elsewhere.
    return;
  }

  if (invitation.recipientEmail !== targetEmail) {
    throw new SetupFlowError(
      409,
      'SETUP_TARGET_MISMATCH',
      'Setup token target email does not match the invitation recipient',
    );
  }

  const repEmail = invitation.organisationRegistrationRequest?.representativeEmail;
  if (repEmail && repEmail !== invitation.recipientEmail) {
    throw new SetupFlowError(
      409,
      'SETUP_TARGET_MISMATCH',
      'Registration request representative email does not match the invitation recipient',
    );
  }
}
