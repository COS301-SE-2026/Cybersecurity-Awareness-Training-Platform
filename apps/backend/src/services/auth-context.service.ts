import type {
  GuardAuthSubject,
  GuardOrganisation,
  GuardUser,
} from './auth-status-guard.service.js';

export type AuthContextRole =
  | 'IP_ADMIN'
  | 'ORGANISATION_ADMIN'
  | 'ORGANISATION_TRAINEE'
  | 'GENERAL_TRAINEE';

export type AuthRedirectTarget = '/admin' | '/organisation' | '/trainee/campaigns' | '/login';

export type AuthContextUser = {
  id: string;
  userType: AuthContextRole;
  authStatus: GuardUser['authStatus'];
};

export type AuthOrganisationContext = {
  id: string;
  status: GuardOrganisation['status'];
};

export type AuthContext = {
  user: AuthContextUser;
  role: AuthContextRole;
  organisation: AuthOrganisationContext | null;
  permissions: string[];
  redirectTo: AuthRedirectTarget;
};

export function buildAuthContext(subject: GuardAuthSubject): AuthContext {
  if (!subject.user) {
    throw new Error('Cannot build auth context without a user');
  }

  return {
    user: {
      id: subject.user.id,
      userType: subject.user.userType,
      authStatus: subject.user.authStatus,
    },
    role: subject.user.userType,
    organisation: resolveOrganisationContext(subject),
    permissions: resolvePermissions(subject),
    redirectTo: resolveRedirectTarget(subject.user),
  };
}

function resolveOrganisationContext(subject: GuardAuthSubject): AuthOrganisationContext | null {
  const organisation =
    subject.organisationTraineeProfile?.organisation ??
    subject.organisationAdminProfile?.organisation ??
    null;

  if (!organisation) {
    return null;
  }

  return {
    id: organisation.id,
    status: organisation.status,
  };
}

function resolvePermissions(subject: GuardAuthSubject): string[] {
  if (!subject.user) {
    return [];
  }

  if (subject.user.userType === 'IP_ADMIN') {
    return ['PLATFORM_ADMIN'];
  }

  if (subject.user.userType === 'ORGANISATION_ADMIN') {
    return ['ORGANISATION_ADMIN'];
  }

  if (subject.user.userType === 'ORGANISATION_TRAINEE') {
    return ['ORGANISATION_TRAINEE'];
  }

  return ['GENERAL_TRAINEE'];
}

function resolveRedirectTarget(user: GuardUser): AuthRedirectTarget {
  if (user.userType === 'IP_ADMIN') {
    return '/admin';
  }

  if (user.userType === 'ORGANISATION_ADMIN') {
    return '/organisation';
  }

  if (user.userType === 'ORGANISATION_TRAINEE' || user.userType === 'GENERAL_TRAINEE') {
    return '/trainee/campaigns';
  }

  return '/login';
}
