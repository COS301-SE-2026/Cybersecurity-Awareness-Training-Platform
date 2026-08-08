import type { GuardAuthSubject } from './auth-status-guard.service.js';
import {
  DEFAULT_ORGANISATION_SECURITY_SETTINGS,
  ensureDefaultOrganisationSecuritySettings,
  findOrganisationSecuritySettings,
  findUserSecurityPreferences,
  type OrganisationSecuritySettingsRecord,
  type UserSecurityPreferencesRecord,
} from '../repositories/security-settings.repository.js';
import {
  resolveSessionPolicy,
  type OrganisationSessionPolicy,
  type PlatformSessionPolicy,
  type ResolvedSessionPolicy,
  type UserSessionPreference,
} from './session-policy.service.js';

const SECONDS_PER_HOUR = 60 * 60;

export type PlatformSecurityPolicy = PlatformSessionPolicy & {
  requireReauthenticationForSensitiveActions: boolean;
  allowEmailChange: boolean;
};

export type EffectiveSecurityPolicy = ResolvedSessionPolicy & {
  organisationId: string | null;
  requireReauthenticationForSensitiveActions: boolean;
  allowEmailChange: boolean;
};

export type EffectiveSecurityPolicyInput = {
  subject: GuardAuthSubject;
  rememberMeRequested: boolean;
  platform?: PlatformSecurityPolicy;
};

export const PLATFORM_SECURITY_POLICY = {
  regularSessionSeconds: 15 * 60,
  rememberedSessionSeconds: 7 * 24 * SECONDS_PER_HOUR,
  idleTimeoutMinutes: 30,
  allowRememberMe: true,
  requireReauthenticationForSensitiveActions: true,
  allowEmailChange: true,
} as const satisfies PlatformSecurityPolicy;

function positiveHoursToSeconds(hours: number | null | undefined): number | null {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
    return null;
  }

  return hours * SECONDS_PER_HOUR;
}

function defaultOrganisationSettings(organisationId: string): OrganisationSecuritySettingsRecord {
  return {
    organisationId,
    ...DEFAULT_ORGANISATION_SECURITY_SETTINGS,
  };
}

function toOrganisationSessionPolicy(
  settings: OrganisationSecuritySettingsRecord | null,
): OrganisationSessionPolicy | null {
  if (!settings) {
    return null;
  }

  return {
    enforceRememberMePolicy: settings.enforceRememberMePolicy,
    allowRememberMe: settings.allowRememberMe,
    maxRememberedSessionSeconds: positiveHoursToSeconds(settings.maxRememberedSessionHours),
    enforceRegularSessionLength: settings.enforceRegularSessionLength,
    regularSessionSeconds: positiveHoursToSeconds(settings.regularSessionLengthHours),
    enforceIdleTimeout: settings.enforceIdleTimeout,
    idleTimeoutMinutes: settings.idleTimeoutMinutes,
  };
}

function toUserSessionPreference(
  preferences: UserSecurityPreferencesRecord | null,
): UserSessionPreference | null {
  if (!preferences) {
    return null;
  }

  return {
    preferredRegularSessionSeconds: positiveHoursToSeconds(
      preferences.preferredRegularSessionLengthHours,
    ),
    preferredRememberedSessionSeconds: positiveHoursToSeconds(
      preferences.preferredRememberMeSessionLengthHours,
    ),
    preferredIdleTimeoutMinutes: preferences.preferredIdleTimeoutMinutes,
  };
}

export function organisationIdForSecurityPolicy(subject: GuardAuthSubject): string | null {
  if (subject.user?.authStatus !== 'ACTIVE') {
    return null;
  }

  if (
    subject.user.userType === 'ORGANISATION_ADMIN' &&
    subject.organisationAdminProfile?.adminStatus === 'ACTIVE' &&
    subject.organisationAdminProfile.organisation?.status === 'ACTIVE'
  ) {
    return subject.organisationAdminProfile?.organisation?.id ?? null;
  }

  if (
    subject.user.userType === 'ORGANISATION_TRAINEE' &&
    subject.traineeProfile?.traineeStatus === 'ACTIVE' &&
    subject.organisationTraineeProfile?.membershipStatus === 'ACTIVE' &&
    subject.organisationTraineeProfile.organisation?.status === 'ACTIVE'
  ) {
    return subject.organisationTraineeProfile?.organisation?.id ?? null;
  }

  return null;
}

async function findOrganisationSettingsOrDefault(
  organisationId: string | null,
): Promise<OrganisationSecuritySettingsRecord | null> {
  if (!organisationId) {
    return null;
  }

  const settings = await findOrganisationSecuritySettings({ organisationId });
  if (settings) {
    return settings;
  }

  await ensureDefaultOrganisationSecuritySettings({ organisationId });
  return defaultOrganisationSettings(organisationId);
}

export async function resolveEffectiveSecurityPolicy(
  input: EffectiveSecurityPolicyInput,
): Promise<EffectiveSecurityPolicy> {
  const organisationId = organisationIdForSecurityPolicy(input.subject);
  const userId = input.subject.user?.id ?? null;
  const [organisationSettings, userPreferences] = await Promise.all([
    findOrganisationSettingsOrDefault(organisationId),
    userId ? findUserSecurityPreferences({ userId }) : Promise.resolve(null),
  ]);

  const sessionPolicy = resolveSessionPolicy({
    rememberMeRequested: input.rememberMeRequested,
    platform: input.platform ?? PLATFORM_SECURITY_POLICY,
    organisationPolicy: toOrganisationSessionPolicy(organisationSettings),
    userPreference: toUserSessionPreference(userPreferences),
  });

  return {
    ...sessionPolicy,
    organisationId,
    requireReauthenticationForSensitiveActions:
      organisationSettings?.requireReauthenticationForSensitiveActions ??
      (input.platform ?? PLATFORM_SECURITY_POLICY).requireReauthenticationForSensitiveActions,
    allowEmailChange: resolveEmailChangePermission(
      input.subject,
      organisationSettings,
      input.platform ?? PLATFORM_SECURITY_POLICY,
    ),
  };
}

export function resolveEffectiveSecurityPolicyFromOrganisationSettings(input: {
  settings: OrganisationSecuritySettingsRecord;
  rememberMeRequested?: boolean;
  platform?: PlatformSecurityPolicy;
}): EffectiveSecurityPolicy {
  const platform = input.platform ?? PLATFORM_SECURITY_POLICY;
  const sessionPolicy = resolveSessionPolicy({
    rememberMeRequested: input.rememberMeRequested ?? false,
    platform,
    organisationPolicy: toOrganisationSessionPolicy(input.settings),
  });

  return {
    ...sessionPolicy,
    organisationId: input.settings.organisationId,
    requireReauthenticationForSensitiveActions:
      input.settings.requireReauthenticationForSensitiveActions,
    allowEmailChange: input.settings.allowTraineeEmailChange,
  };
}

export async function canUserChangeOwnEmail(subject: GuardAuthSubject): Promise<boolean> {
  const organisationSettings = await findOrganisationSettingsOrDefault(
    organisationIdForSecurityPolicy(subject),
  );
  return resolveEmailChangePermission(subject, organisationSettings, PLATFORM_SECURITY_POLICY);
}

function resolveEmailChangePermission(
  subject: GuardAuthSubject,
  organisationSettings: OrganisationSecuritySettingsRecord | null,
  platform: PlatformSecurityPolicy,
): boolean {
  if (subject.user?.userType === 'ORGANISATION_TRAINEE' && organisationSettings) {
    return organisationSettings.allowTraineeEmailChange;
  }

  return platform.allowEmailChange;
}
