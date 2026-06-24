export type SessionPolicySource = 'PLATFORM_DEFAULT' | 'USER_PREFERENCE' | 'ORGANISATION_POLICY';

export type PlatformSessionPolicy = {
  regularSessionSeconds: number;
  rememberedSessionSeconds: number;
  idleTimeoutMinutes: number | null;
  allowRememberMe: boolean;
};

export type UserSessionPreference = {
  preferredRegularSessionSeconds?: number | null;
  preferredRememberedSessionSeconds?: number | null;
  preferredIdleTimeoutMinutes?: number | null;
};

export type OrganisationSessionPolicy = {
  enforceRememberMePolicy?: boolean;
  allowRememberMe?: boolean;
  maxRememberedSessionSeconds?: number | null;
  enforceRegularSessionLength?: boolean;
  regularSessionSeconds?: number | null;
  enforceIdleTimeout?: boolean;
  idleTimeoutMinutes?: number | null;
};

export type SessionPolicyInput = {
  rememberMeRequested: boolean;
  platform: PlatformSessionPolicy;
  userPreference?: UserSessionPreference | null;
  organisationPolicy?: OrganisationSessionPolicy | null;
};

export type ResolvedSessionPolicy = {
  rememberMeRequested: boolean;
  rememberMeAllowed: boolean;
  rememberMeApplied: boolean;
  regularSessionSeconds: number;
  rememberedSessionSeconds: number;
  effectiveSessionSeconds: number;
  idleTimeoutMinutes: number | null;
  sources: {
    rememberMe: SessionPolicySource;
    regularSession: SessionPolicySource;
    rememberedSession: SessionPolicySource;
    idleTimeout: SessionPolicySource;
  };
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function resolveRememberMe(input: SessionPolicyInput): {
  allowed: boolean;
  source: SessionPolicySource;
} {
  const organisationPolicy = input.organisationPolicy;
  if (
    organisationPolicy?.enforceRememberMePolicy === true &&
    typeof organisationPolicy.allowRememberMe === 'boolean'
  ) {
    return {
      allowed: organisationPolicy.allowRememberMe,
      source: 'ORGANISATION_POLICY',
    };
  }

  return {
    allowed: input.platform.allowRememberMe,
    source: 'PLATFORM_DEFAULT',
  };
}

function resolveRegularSessionSeconds(input: SessionPolicyInput): {
  value: number;
  source: SessionPolicySource;
} {
  const organisationPolicy = input.organisationPolicy;

  if (
    organisationPolicy?.enforceRegularSessionLength === true &&
    isPositiveNumber(organisationPolicy.regularSessionSeconds)
  ) {
    return { value: organisationPolicy.regularSessionSeconds, source: 'ORGANISATION_POLICY' };
  }

  if (isPositiveNumber(input.userPreference?.preferredRegularSessionSeconds)) {
    return {
      value: input.userPreference.preferredRegularSessionSeconds,
      source: 'USER_PREFERENCE',
    };
  }

  return {
    value: input.platform.regularSessionSeconds,
    source: 'PLATFORM_DEFAULT',
  };
}

function resolveRememberedSessionSeconds(
  input: SessionPolicyInput,
  rememberMeAllowed: boolean,
): { value: number; source: SessionPolicySource } {
  const organisationPolicy = input.organisationPolicy;
  const userPreferred = isPositiveNumber(input.userPreference?.preferredRememberedSessionSeconds)
    ? input.userPreference.preferredRememberedSessionSeconds
    : input.platform.rememberedSessionSeconds;

  const userSource = isPositiveNumber(input.userPreference?.preferredRememberedSessionSeconds)
    ? 'USER_PREFERENCE'
    : 'PLATFORM_DEFAULT';

  if (!rememberMeAllowed) {
    return { value: input.platform.rememberedSessionSeconds, source: 'PLATFORM_DEFAULT' };
  }

  if (
    organisationPolicy?.enforceRememberMePolicy === true &&
    isPositiveNumber(organisationPolicy.maxRememberedSessionSeconds)
  ) {
    return {
      value: Math.min(userPreferred, organisationPolicy.maxRememberedSessionSeconds),
      source: 'ORGANISATION_POLICY',
    };
  }

  return { value: userPreferred, source: userSource };
}

function resolveIdleTimeoutMinutes(input: SessionPolicyInput): {
  value: number | null;
  source: SessionPolicySource;
} {
  const organisationPolicy = input.organisationPolicy;

  if (
    organisationPolicy?.enforceIdleTimeout === true &&
    isPositiveNumber(organisationPolicy.idleTimeoutMinutes)
  ) {
    return { value: organisationPolicy.idleTimeoutMinutes, source: 'ORGANISATION_POLICY' };
  }

  if (isPositiveNumber(input.userPreference?.preferredIdleTimeoutMinutes)) {
    return { value: input.userPreference.preferredIdleTimeoutMinutes, source: 'USER_PREFERENCE' };
  }

  return { value: input.platform.idleTimeoutMinutes, source: 'PLATFORM_DEFAULT' };
}

export function resolveSessionPolicy(input: SessionPolicyInput): ResolvedSessionPolicy {
  const rememberMeResolution = resolveRememberMe(input);
  const regularSession = resolveRegularSessionSeconds(input);
  const rememberedSession = resolveRememberedSessionSeconds(input, rememberMeResolution.allowed);
  const idleTimeout = resolveIdleTimeoutMinutes(input);
  return {
    rememberMeRequested: input.rememberMeRequested,
    rememberMeAllowed: rememberMeResolution.allowed,
    rememberMeApplied: input.rememberMeRequested && rememberMeResolution.allowed,
    regularSessionSeconds: regularSession.value,
    rememberedSessionSeconds: rememberedSession.value,
    effectiveSessionSeconds:
      input.rememberMeRequested && rememberMeResolution.allowed
        ? rememberedSession.value
        : regularSession.value,
    idleTimeoutMinutes: idleTimeout.value,
    sources: {
      rememberMe: rememberMeResolution.source,
      regularSession: regularSession.source,
      rememberedSession: rememberedSession.source,
      idleTimeout: idleTimeout.source,
    },
  };
}
