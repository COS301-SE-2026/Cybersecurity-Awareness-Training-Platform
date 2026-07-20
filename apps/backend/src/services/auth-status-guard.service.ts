export type AuthGuardFailureCode =
  | 'USER_NOT_FOUND'
  | 'USER_EMAIL_NOT_VERIFIED'
  | 'USER_PENDING_INVITE_SETUP'
  | 'USER_DISABLED'
  | 'USER_NOT_ACTIVE'
  | 'TRAINEE_PROFILE_INACTIVE'
  | 'ORGANISATION_USER_INACTIVE'
  | 'ADMIN_DISABLED'
  | 'IP_ADMIN_DISABLED'
  | 'ORGANISATION_NOT_ACTIVE'
  | 'ORGANISATION_PENDING_ONBOARDING'
  | 'ORGANISATION_SUSPENDED'
  | 'ORGANISATION_DISABLED'
  | 'ORGANISATION_ARCHIVED';

export type AuthGuardFail = {
  allowed: false;
  code: AuthGuardFailureCode;
  statusCode: 401 | 403 | 409;
  message: string;
};
export type AuthGuardSuccess = { allowed: true };
export type AuthGuardResult = AuthGuardFail | AuthGuardSuccess;

export type GuardUser = {
  id: string;
  userType: 'IP_ADMIN' | 'ORGANISATION_ADMIN' | 'ORGANISATION_TRAINEE' | 'GENERAL_TRAINEE';
  authStatus: 'PENDING_EMAIL_VERIFICATION' | 'PENDING_INVITE_SETUP' | 'ACTIVE' | 'DISABLED';
  emailVerifiedAt?: Date | null;
  disabledAt?: Date | null;
};

export type GuardOrganisation = {
  id: string;
  name: string;
  status: 'PENDING_ONBOARDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DISABLED' | 'ARCHIVED';
};

export type GuardTraineeProfile = { traineeStatus: 'ACTIVE' | 'INACTIVE' };

export type GuardOrganisationTraineeProfile = {
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'DISABLED';
  organisation?: GuardOrganisation | null;
};

export type GuardOrganisationAdminProfile = {
  adminStatus: 'ACTIVE' | 'DISABLED';
  organisation?: GuardOrganisation | null;
};

export type GuardIpAdminProfile = {
  adminStatus: 'ACTIVE' | 'DISABLED';
  platformAdminRole?: 'SUPER_ADMIN' | 'NORMAL_ADMIN' | null;
};

export type GuardAuthSubject = {
  user?: GuardUser | null;
  traineeProfile?: GuardTraineeProfile | null;
  organisationTraineeProfile?: GuardOrganisationTraineeProfile | null;
  organisationAdminProfile?: GuardOrganisationAdminProfile | null;
  ipAdminProfile?: GuardIpAdminProfile | null;
};

export function ensureActiveUser(user: GuardUser | null | undefined): AuthGuardResult {
  if (!user) {
    return failure('USER_NOT_FOUND');
  }
  if (user.authStatus === 'DISABLED') {
    return failure('USER_DISABLED');
  }
  if (user.authStatus === 'PENDING_EMAIL_VERIFICATION') {
    return failure('USER_EMAIL_NOT_VERIFIED');
  }
  if (user.authStatus === 'PENDING_INVITE_SETUP') {
    return failure('USER_PENDING_INVITE_SETUP');
  }
  if (user.authStatus !== 'ACTIVE') {
    return failure('USER_NOT_ACTIVE');
  }
  return { allowed: true };
}
export function ensureActiveTraineeProfile(
  traineeProfile: GuardTraineeProfile | null | undefined,
): AuthGuardResult {
  if (traineeProfile?.traineeStatus !== 'ACTIVE') {
    return failure('TRAINEE_PROFILE_INACTIVE');
  }
  return { allowed: true };
}

export function ensureActiveOrganisationUser(
  organisationProfile: GuardOrganisationTraineeProfile | null | undefined,
): AuthGuardResult {
  if (organisationProfile?.membershipStatus !== 'ACTIVE') {
    return failure('ORGANISATION_USER_INACTIVE');
  }
  return { allowed: true };
}

export function ensureActiveOrganisationAdmin(
  organisationAdminProfile: GuardOrganisationAdminProfile | null | undefined,
): AuthGuardResult {
  if (organisationAdminProfile?.adminStatus !== 'ACTIVE') {
    return failure('ADMIN_DISABLED');
  }
  return { allowed: true };
}

export function ensureActiveIpAdmin(
  ipAdminProfile: GuardIpAdminProfile | null | undefined,
): AuthGuardResult {
  if (ipAdminProfile?.adminStatus !== 'ACTIVE') {
    return failure('IP_ADMIN_DISABLED');
  }
  return { allowed: true };
}

export function ensureActiveOrganisation(
  organisation: GuardOrganisation | null | undefined,
): AuthGuardResult {
  if (!organisation) {
    return failure('ORGANISATION_NOT_ACTIVE');
  }
  if (organisation.status === 'ACTIVE') {
    return { allowed: true };
  }
  if (organisation.status === 'PENDING_ONBOARDING') {
    return failure('ORGANISATION_PENDING_ONBOARDING');
  }
  if (organisation.status === 'SUSPENDED') {
    return failure('ORGANISATION_SUSPENDED');
  }
  if (organisation.status === 'DISABLED') {
    return failure('ORGANISATION_DISABLED');
  }
  if (organisation.status === 'ARCHIVED') {
    return failure('ORGANISATION_ARCHIVED');
  }
  return failure('ORGANISATION_NOT_ACTIVE');
}

function failure(code: AuthGuardFailureCode): AuthGuardFail {
  return {
    allowed: false,
    code,
    statusCode: statusCodeForFailure(code),
    message: messageForFailure(code),
  };
}
function statusCodeForFailure(code: AuthGuardFailureCode): 401 | 403 | 409 {
  if (code === 'USER_NOT_FOUND') {
    return 401;
  }
  if (
    code === 'ORGANISATION_PENDING_ONBOARDING' ||
    code === 'ORGANISATION_SUSPENDED' ||
    code === 'ORGANISATION_DISABLED' ||
    code === 'ORGANISATION_ARCHIVED' ||
    code === 'ORGANISATION_NOT_ACTIVE'
  ) {
    return 403;
  }
  return 403;
}
function messageForFailure(code: AuthGuardFailureCode): string {
  switch (code) {
    case 'USER_NOT_FOUND':
      return 'User account was not found';
    case 'USER_EMAIL_NOT_VERIFIED':
      return 'Email address must be verified before signing in';
    case 'USER_PENDING_INVITE_SETUP':
      return 'Account setup must be completed before signing in';
    case 'USER_DISABLED':
      return 'User account is disabled';
    case 'TRAINEE_PROFILE_INACTIVE':
      return 'Trainee profile is inactive';
    case 'ORGANISATION_USER_INACTIVE':
      return 'Organisation user profile is inactive';
    case 'ADMIN_DISABLED':
      return 'Admin profile is disabled';
    case 'IP_ADMIN_DISABLED':
      return 'Platform admin profile is disabled';
    case 'ORGANISATION_PENDING_ONBOARDING':
      return 'Organisation onboarding is not complete';
    case 'ORGANISATION_SUSPENDED':
      return 'Organisation is suspended';
    case 'ORGANISATION_DISABLED':
      return 'Organisation is disabled';
    case 'ORGANISATION_ARCHIVED':
      return 'Organisation is archived';
    case 'ORGANISATION_NOT_ACTIVE':
      return 'Organisation is not active';
    case 'USER_NOT_ACTIVE':
    default:
      return 'User account is not active';
  }
}

export function ensureUserCanAuthenticate(subject: GuardAuthSubject): AuthGuardResult {
  const userResult = ensureActiveUser(subject.user);
  if (!userResult.allowed) {
    return userResult;
  }

  const user = subject.user;
  if (user?.userType === 'GENERAL_TRAINEE') {
    return ensureActiveTraineeProfile(subject.traineeProfile);
  }
  if (user?.userType === 'ORGANISATION_TRAINEE') {
    const traineeResult = ensureActiveTraineeProfile(subject.traineeProfile);
    if (!traineeResult.allowed) {
      return traineeResult;
    }
    const organisationUserResult = ensureActiveOrganisationUser(subject.organisationTraineeProfile);
    if (!organisationUserResult.allowed) {
      return organisationUserResult;
    }
    return ensureActiveOrganisation(subject.organisationTraineeProfile?.organisation);
  }

  if (user?.userType === 'ORGANISATION_ADMIN') {
    const adminResult = ensureActiveOrganisationAdmin(subject.organisationAdminProfile);
    if (!adminResult.allowed) {
      return adminResult;
    }
    return ensureActiveOrganisation(subject.organisationAdminProfile?.organisation);
  }

  if (user?.userType === 'IP_ADMIN') {
    return ensureActiveIpAdmin(subject.ipAdminProfile);
  }

  return failure('USER_NOT_ACTIVE');
}

export type RoleGuardFailureCode =
  | 'PLATFORM_ADMIN_REQUIRED'
  | 'ORGANISATION_ADMIN_REQUIRED'
  | 'ORGANISATION_MEMBER_REQUIRED'
  | 'SAME_ORGANISATION_REQUIRED';

export type RoleGuardResult =
  | { allowed: true }
  | { allowed: false; code: RoleGuardFailureCode; statusCode: 403; message: string };

function roleFailure(code: RoleGuardFailureCode): RoleGuardResult {
  return {
    allowed: false,
    code,
    statusCode: 403,
    message: roleFailureMessage(code),
  };
}
function roleFailureMessage(code: RoleGuardFailureCode): string {
  switch (code) {
    case 'PLATFORM_ADMIN_REQUIRED':
      return 'Platform admin access is required';
    case 'ORGANISATION_ADMIN_REQUIRED':
      return 'Organisation admin access is required';
    case 'ORGANISATION_MEMBER_REQUIRED':
      return 'Organisation membership is required';
    case 'SAME_ORGANISATION_REQUIRED':
    default:
      return 'Access is limited to the same organisation';
  }
}

export function ensurePlatformAdmin(subject: GuardAuthSubject): RoleGuardResult {
  if (subject.user?.userType === 'IP_ADMIN' && subject.ipAdminProfile?.adminStatus === 'ACTIVE') {
    return { allowed: true };
  }
  return roleFailure('PLATFORM_ADMIN_REQUIRED');
}

export function ensureOrganisationAdmin(subject: GuardAuthSubject): RoleGuardResult {
  if (
    subject.user?.userType === 'ORGANISATION_ADMIN' &&
    subject.organisationAdminProfile?.adminStatus === 'ACTIVE'
  ) {
    return { allowed: true };
  }
  return roleFailure('ORGANISATION_ADMIN_REQUIRED');
}

export function ensureOrganisationMember(subject: GuardAuthSubject): RoleGuardResult {
  if (
    subject.user?.userType === 'ORGANISATION_ADMIN' &&
    subject.organisationAdminProfile?.adminStatus === 'ACTIVE' &&
    subject.organisationAdminProfile?.organisation
  ) {
    return { allowed: true };
  }

  if (
    subject.user?.userType === 'ORGANISATION_TRAINEE' &&
    subject.organisationTraineeProfile?.organisation
  ) {
    return { allowed: true };
  }

  return roleFailure('ORGANISATION_MEMBER_REQUIRED');
}

export function ensureSameOrganisation(
  subject: GuardAuthSubject,
  organisationId: string,
): RoleGuardResult {
  if (
    (subject.organisationAdminProfile?.organisation?.id ??
      subject.organisationTraineeProfile?.organisation?.id ??
      null) === organisationId
  ) {
    return { allowed: true };
  }
  return roleFailure('SAME_ORGANISATION_REQUIRED');
}
