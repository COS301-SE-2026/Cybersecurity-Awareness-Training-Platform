import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import BasicAlert from '../components/alerts/BasicAlert';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../lib/apiClient';
import {
  getOrganisationSecuritySettings,
  updateOrganisationSecuritySettings,
} from '../services/organisation-security-settings.service';
import type {
  OrganisationSecuritySettingsCapabilitiesDto,
  OrganisationSecuritySettingsDto,
  OrganisationSecuritySettingsLimitsDto,
  OrganisationSecuritySettingsReadOnlyReasonDto,
  UpdateOrganisationSecuritySettingsRequestDto,
} from '@insightful-phish/shared';

const DEFAULT_PLATFORM_LIMITS: OrganisationSecuritySettingsLimitsDto = {
  rememberMe: {
    maxRememberedSessionHours: {
      min: 1,
      max: 720,
      default: 168,
      options: [24, 72, 168, 336, 720],
    },
  },
  regularSession: {
    regularSessionLengthHours: {
      min: 1,
      max: 24,
      default: 8,
      options: [4, 8, 12, 24],
    },
  },
  idleTimeout: {
    idleTimeoutMinutes: {
      min: 5,
      max: 480,
      default: 30,
      options: [15, 30, 60, 120, 240, 480],
    },
  },
};

function formatHoursOptionLabel(hours: number): string {
  if (hours === 24) return '1 Day (24 hours)';
  if (hours === 72) return '3 Days (72 hours)';
  if (hours === 168) return '7 Days (168 hours)';
  if (hours === 336) return '14 Days (336 hours)';
  if (hours === 720) return '30 Days (720 hours)';
  return `${hours} Hours`;
}

function formatMinutesOptionLabel(minutes: number): string {
  if (minutes === 15) return '15 Minutes';
  if (minutes === 30) return '30 Minutes';
  if (minutes === 60) return '60 Minutes (1 Hour)';
  if (minutes === 120) return '120 Minutes (2 Hours)';
  if (minutes === 240) return '240 Minutes (4 Hours)';
  if (minutes === 480) return '480 Minutes (8 Hours)';
  return `${minutes} Minutes`;
}

function parseApiError(
  err: unknown,
  fallbackMessage: string,
): { message: string; details: Array<{ field: string; message: string }> } {
  if (err instanceof ApiError) {
    const body = err.body as
      | { message?: string; details?: Array<{ field: string; message: string }> }
      | undefined;
    const bodyMessage = body?.message;
    const details = body?.details && Array.isArray(body.details) ? body.details : [];

    if (err.status === 401) {
      return {
        message: bodyMessage || 'Session expired or unauthorized. Please log in again.',
        details,
      };
    }
    if (err.status === 403) {
      return {
        message:
          bodyMessage ||
          'You do not have permission to view or edit organisation security settings.',
        details,
      };
    }
    if (err.status === 404) {
      return { message: bodyMessage || 'Organisation security settings were not found.', details };
    }
    if (err.status === 409) {
      return {
        message:
          bodyMessage ||
          err.message ||
          'Security settings cannot be changed while the organisation is suspended or inactive.',
        details,
      };
    }
    if (err.status === 422) {
      return {
        message: bodyMessage || err.message || 'Organisation security settings are invalid.',
        details,
      };
    }
    if (err.status === 429) {
      return {
        message:
          bodyMessage ||
          'Too many organisation security settings requests. Please try again later.',
        details,
      };
    }
    return { message: bodyMessage || err.message || fallbackMessage, details };
  }
  return { message: fallbackMessage, details: [] };
}

function resolveReadOnlyReasonText(
  isReadOnly: boolean,
  reason?: OrganisationSecuritySettingsReadOnlyReasonDto,
): string | null {
  if (!isReadOnly) return null;
  if (reason === 'MISSING_PERMISSION') {
    return 'Read-only mode: You do not have the required permission to edit organisation security settings.';
  }
  if (reason === 'ORGANISATION_SUSPENDED') {
    return 'Read-only mode: Security settings cannot be modified because the organisation is currently suspended.';
  }
  if (reason === 'ORGANISATION_DISABLED') {
    return 'Read-only mode: Security settings cannot be modified because the organisation is inactive or disabled.';
  }
  return 'Read-only mode: You do not have permission to edit organisation security settings.';
}

function OrganisationSecuritySettingsPage() {
  const { token, authContext } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;

  const hasCredentials = Boolean(token && organisationId);
  const [isLoading, setIsLoading] = useState<boolean>(hasCredentials);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<
    Array<{ field: string; message: string }>
  >([]);

  const [capabilities, setCapabilities] =
    useState<OrganisationSecuritySettingsCapabilitiesDto | null>(null);
  const [platformLimits, setPlatformLimits] =
    useState<OrganisationSecuritySettingsLimitsDto>(DEFAULT_PLATFORM_LIMITS);
  const [initialSettings, setInitialSettings] = useState<OrganisationSecuritySettingsDto | null>(
    null,
  );

  // Form fields State
  const [enforceRememberMePolicy, setEnforceRememberMePolicy] = useState<boolean>(false);
  const [allowRememberMe, setAllowRememberMe] = useState<boolean>(false);
  const [maxRememberedSessionHours, setMaxRememberedSessionHours] = useState<number | null>(null);
  const [enforceRegularSessionLength, setEnforceRegularSessionLength] = useState<boolean>(false);
  const [regularSessionLengthHours, setRegularSessionLengthHours] = useState<number | null>(null);
  const [enforceIdleTimeout, setEnforceIdleTimeout] = useState<boolean>(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number | null>(null);
  const [allowTraineeEmailChange, setAllowTraineeEmailChange] = useState<boolean>(false);
  const [
    requireReauthenticationForSensitiveActions,
    setRequireReauthenticationForSensitiveActions,
  ] = useState<boolean>(false);

  const populateForm = useCallback((settings: OrganisationSecuritySettingsDto) => {
    setEnforceRememberMePolicy(settings.enforceRememberMePolicy);
    setAllowRememberMe(settings.allowRememberMe);
    setMaxRememberedSessionHours(settings.maxRememberedSessionHours ?? null);
    setEnforceRegularSessionLength(settings.enforceRegularSessionLength);
    setRegularSessionLengthHours(settings.regularSessionLengthHours ?? null);
    setEnforceIdleTimeout(settings.enforceIdleTimeout);
    setIdleTimeoutMinutes(settings.idleTimeoutMinutes ?? null);
    setAllowTraineeEmailChange(settings.allowTraineeEmailChange);
    setRequireReauthenticationForSensitiveActions(
      settings.requireReauthenticationForSensitiveActions,
    );
  }, []);

  useEffect(() => {
    if (!token || !organisationId) {
      return;
    }

    let isMounted = true;

    getOrganisationSecuritySettings(organisationId, token)
      .then((response) => {
        if (!isMounted) return;
        setInitialSettings(response.settings);
        setCapabilities(response.capabilities);
        setPlatformLimits(response.platformLimits);
        populateForm(response.settings);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const parsed = parseApiError(err, 'Failed to load organisation security settings.');
        setErrorMessage(parsed.message);
        setValidationDetails(parsed.details);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, organisationId, populateForm]);

  // server derived capabilities control page epitable state

  const canEdit = Boolean(capabilities?.canEdit && capabilities?.readOnlyReason === null);
  const isReadOnly = !canEdit;
  const isDirty =
    initialSettings !== null &&
    (enforceRememberMePolicy !== initialSettings.enforceRememberMePolicy ||
      allowRememberMe !== initialSettings.allowRememberMe ||
      maxRememberedSessionHours !== (initialSettings.maxRememberedSessionHours ?? null) ||
      enforceRegularSessionLength !== initialSettings.enforceRegularSessionLength ||
      regularSessionLengthHours !== (initialSettings.regularSessionLengthHours ?? null) ||
      enforceIdleTimeout !== initialSettings.enforceIdleTimeout ||
      idleTimeoutMinutes !== (initialSettings.idleTimeoutMinutes ?? null) ||
      allowTraineeEmailChange !== initialSettings.allowTraineeEmailChange ||
      requireReauthenticationForSensitiveActions !==
        initialSettings.requireReauthenticationForSensitiveActions);

  const handleEnforceRememberMeChange = (checked: boolean) => {
    setEnforceRememberMePolicy(checked);
    if (!checked) {
      setAllowRememberMe(false);
      setMaxRememberedSessionHours(null);
    }
  };

  const handleAllowRememberMeChange = (checked: boolean) => {
    setAllowRememberMe(checked);
    if (!checked) {
      setMaxRememberedSessionHours(null);
    } else if (maxRememberedSessionHours === null) {
      const defaultOption = platformLimits.rememberMe.maxRememberedSessionHours.options[0] ?? 168;
      setMaxRememberedSessionHours(defaultOption);
    }
  };

  const handleEnforceRegularSessionChange = (checked: boolean) => {
    setEnforceRegularSessionLength(checked);
    if (!checked) {
      setRegularSessionLengthHours(null);
    } else if (regularSessionLengthHours === null) {
      const defaultOption = platformLimits.regularSession.regularSessionLengthHours.options[0] ?? 8;
      setRegularSessionLengthHours(defaultOption);
    }
  };

  const handleEnforceIdleTimeoutChange = (checked: boolean) => {
    setEnforceIdleTimeout(checked);
    if (!checked) {
      setIdleTimeoutMinutes(null);
    } else if (idleTimeoutMinutes === null) {
      const defaultOption = platformLimits.idleTimeout.idleTimeoutMinutes.options[0] ?? 30;
      setIdleTimeoutMinutes(defaultOption);
    }
  };

  const handleReset = () => {
    if (initialSettings) {
      populateForm(initialSettings);
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationDetails([]);
  };

  const handleSave = async () => {
    if (!token || !organisationId || isReadOnly || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationDetails([]);

    const payload: UpdateOrganisationSecuritySettingsRequestDto = {
      enforceRememberMePolicy,
      allowRememberMe: enforceRememberMePolicy ? allowRememberMe : false,
      maxRememberedSessionHours:
        enforceRememberMePolicy && allowRememberMe ? maxRememberedSessionHours : null,
      enforceRegularSessionLength,
      regularSessionLengthHours: enforceRegularSessionLength ? regularSessionLengthHours : null,
      enforceIdleTimeout,
      idleTimeoutMinutes: enforceIdleTimeout ? idleTimeoutMinutes : null,
      requireReauthenticationForSensitiveActions,
      allowTraineeEmailChange,
    };

    try {
      const response = await updateOrganisationSecuritySettings(organisationId, payload, token);
      setInitialSettings(response.settings);
      setCapabilities(response.capabilities);
      setPlatformLimits(response.platformLimits);
      populateForm(response.settings);
      setSuccessMessage('Organisation security preferences updated successfully.');
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Failed to update organisation security preferences.');
      setErrorMessage(parsed.message);
      setValidationDetails(parsed.details);
    } finally {
      setIsSaving(false);
    }
  };

  const readOnlyReasonText = resolveReadOnlyReasonText(
    isReadOnly,
    capabilities?.readOnlyReason ?? undefined,
  );

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <div>
        <div
          style={{
            padding: '1.4rem',
            paddingBottom: '0.8rem',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '0.8rem',
              fontSize: '3.8rem',
              fontWeight: 500,
              lineHeight: 1,
              color: 'rgb(132, 25, 255)',
              fontFamily: 'Jost',
            }}
          >
            Organisation Security Preferences
          </h1>
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Configure organisation-wide security policies for all users.
          </p>
        </div>

        <div className="px-6 pb-6">
          {readOnlyReasonText && (
            <div
              role="alert"
              className="p-4 mb-6 text-amber-800 bg-amber-50 border border-amber-200 rounded-none font-jost text-[1.1rem] flex items-center gap-3"
            >
              <span className="material-symbols-sharp">lock</span>
              <span>{readOnlyReasonText}</span>
            </div>
          )}

          {errorMessage && (
            <BasicAlert
              variant="danger"
              onClose={() => {
                setErrorMessage(null);
                setValidationDetails([]);
              }}
            >
              {validationDetails[0]?.message
                ? `${errorMessage}: ${validationDetails[0].message}`
                : errorMessage}
            </BasicAlert>
          )}

          {successMessage && (
            <BasicAlert variant="success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </BasicAlert>
          )}

          {isLoading ? (
            <div className="py-12 flex justify-center items-center font-jost text-gray-500 text-[1.2rem]">
              <span>Loading organisation security settings...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-6">
                {/* Remember Me Policy */}
                <div className="mb-8">
                  <label
                    htmlFor="enforce-remember-me"
                    className="block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
                  >
                    "Remember Me" Policy
                  </label>
                  <h3 className="mb-3 tracking-wide max-w-xs text-purple font-jost">
                    Control whether users can stay logged in.
                  </h3>
                  <div className="flex items-center mb-2 ml-2">
                    <input
                      id="enforce-remember-me"
                      type="checkbox"
                      checked={enforceRememberMePolicy}
                      disabled={isReadOnly || isSaving}
                      onChange={(e) => handleEnforceRememberMeChange(e.target.checked)}
                      className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <label
                      htmlFor="enforce-remember-me"
                      className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular cursor-pointer"
                    >
                      Enforce "Remember Me" Policy
                    </label>
                  </div>

                  <div className="flex items-center mb-4 ml-2">
                    <input
                      id="allow-remember-me"
                      type="checkbox"
                      checked={allowRememberMe}
                      disabled={!enforceRememberMePolicy || isReadOnly || isSaving}
                      onChange={(e) => handleAllowRememberMeChange(e.target.checked)}
                      className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <label
                      htmlFor="allow-remember-me"
                      className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular cursor-pointer"
                    >
                      Allow "Remember Me"
                    </label>
                  </div>

                  <div>
                    <div className="mb-2">
                      <label
                        htmlFor="max-remembered-session-hours"
                        className="select-none ml-2 text-[1.1rem] font-jost text-body tracking-wide font-medium"
                      >
                        Set Maximum Remembered Session Length
                      </label>
                    </div>
                    <select
                      id="max-remembered-session-hours"
                      aria-label="Set Maximum Remembered Session Length"
                      value={maxRememberedSessionHours ?? ''}
                      disabled={
                        !enforceRememberMePolicy || !allowRememberMe || isReadOnly || isSaving
                      }
                      onChange={(e) =>
                        setMaxRememberedSessionHours(e.target.value ? Number(e.target.value) : null)
                      }
                      className="ml-2 w-[85%] border border-gray-200 bg-gray-100 text-body p-2.5 rounded-none font-overpass text-[1rem] focus:ring-[#8400ff] focus:border-[#8400ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {maxRememberedSessionHours === null && (
                        <option value="">Select duration</option>
                      )}
                      {platformLimits.rememberMe.maxRememberedSessionHours.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {formatHoursOptionLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Regular Session Length */}
                <div>
                  <label
                    htmlFor="enforce-regular-session"
                    className="block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
                  >
                    Regular Session Length
                  </label>
                  <h3 className="mb-3 tracking-wide max-w-xs text-purple font-jost">
                    Set how long a normal logged-in session lasts before users must log in again.
                  </h3>
                  <div className="flex items-center mb-4 ml-2">
                    <input
                      id="enforce-regular-session"
                      type="checkbox"
                      checked={enforceRegularSessionLength}
                      disabled={isReadOnly || isSaving}
                      onChange={(e) => handleEnforceRegularSessionChange(e.target.checked)}
                      className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <label
                      htmlFor="enforce-regular-session"
                      className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular cursor-pointer"
                    >
                      Enforce Regular Session Length
                    </label>
                  </div>

                  <div>
                    <div className="mb-2">
                      <label
                        htmlFor="regular-session-length-hours"
                        className="select-none ml-2 text-[1.1rem] font-jost text-body tracking-wide font-medium"
                      >
                        Set Regular Session Length
                      </label>
                    </div>
                    <select
                      id="regular-session-length-hours"
                      aria-label="Set Regular Session Length"
                      value={regularSessionLengthHours ?? ''}
                      disabled={!enforceRegularSessionLength || isReadOnly || isSaving}
                      onChange={(e) =>
                        setRegularSessionLengthHours(e.target.value ? Number(e.target.value) : null)
                      }
                      className="ml-2 w-[85%] border border-gray-200 bg-gray-100 text-body p-2.5 rounded-none font-overpass text-[1rem] focus:ring-[#8400ff] focus:border-[#8400ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {regularSessionLengthHours === null && (
                        <option value="">Select length</option>
                      )}
                      {platformLimits.regularSession.regularSessionLengthHours.options.map(
                        (opt) => (
                          <option key={opt} value={opt}>
                            {formatHoursOptionLabel(opt)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                {/* Idle Timeout */}
                <div>
                  <label
                    htmlFor="enforce-idle-timeout"
                    className="block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
                  >
                    Idle Timeout
                  </label>
                  <h3 className="mb-3 tracking-wide max-w-2xs text-purple font-jost">
                    Automatically log out users after a period of inactivity.
                  </h3>
                  <div className="flex items-center mb-4 ml-2">
                    <input
                      id="enforce-idle-timeout"
                      type="checkbox"
                      checked={enforceIdleTimeout}
                      disabled={isReadOnly || isSaving}
                      onChange={(e) => handleEnforceIdleTimeoutChange(e.target.checked)}
                      className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <label
                      htmlFor="enforce-idle-timeout"
                      className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular cursor-pointer"
                    >
                      Enforce Idle Timeout
                    </label>
                  </div>

                  <div>
                    <div className="mb-2">
                      <label
                        htmlFor="idle-timeout-minutes"
                        className="select-none ml-2 text-[1.1rem] font-jost text-body tracking-wide font-medium"
                      >
                        Set Idle Timeout
                      </label>
                    </div>
                    <select
                      id="idle-timeout-minutes"
                      aria-label="Set Idle Timeout"
                      value={idleTimeoutMinutes ?? ''}
                      disabled={!enforceIdleTimeout || isReadOnly || isSaving}
                      onChange={(e) =>
                        setIdleTimeoutMinutes(e.target.value ? Number(e.target.value) : null)
                      }
                      className="ml-2 w-[85%] border border-gray-200 bg-gray-100 text-body p-2.5 rounded-none font-overpass text-[1rem] focus:ring-[#8400ff] focus:border-[#8400ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {idleTimeoutMinutes === null && <option value="">Select duration</option>}
                      {platformLimits.idleTimeout.idleTimeoutMinutes.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {formatMinutesOptionLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Trainee Settings */}
                <div>
                  <label
                    htmlFor="trainee-checkbox"
                    className="block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
                  >
                    Trainee Settings
                  </label>
                  <h3 className="mb-3 tracking-wide max-w-xs text-purple font-jost">
                    Control whether trainees can change their own email address.
                  </h3>
                  <div className="flex items-center mb-2 ml-2">
                    <input
                      id="trainee-checkbox"
                      type="checkbox"
                      checked={allowTraineeEmailChange}
                      disabled={isReadOnly || isSaving}
                      onChange={(e) => setAllowTraineeEmailChange(e.target.checked)}
                      className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <label
                      htmlFor="trainee-checkbox"
                      className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular cursor-pointer"
                    >
                      Allow Trainees to Change Email Address
                    </label>
                  </div>
                </div>

                {/* Sensitive Actions */}
                <div className="mb-12">
                  <label
                    htmlFor="re-login-sensitive"
                    className="block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
                  >
                    Sensitive Actions
                  </label>
                  <h3 className="mb-3 tracking-wide max-w-xs text-purple font-jost">
                    Require users to log in again before performing sensitive account or
                    organisation actions.
                  </h3>
                  <div className="flex items-center mb-2 ml-2">
                    <input
                      id="re-login-sensitive"
                      type="checkbox"
                      checked={requireReauthenticationForSensitiveActions}
                      disabled={isReadOnly || isSaving}
                      onChange={(e) =>
                        setRequireReauthenticationForSensitiveActions(e.target.checked)
                      }
                      className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <label
                      htmlFor="re-login-sensitive"
                      className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular cursor-pointer"
                    >
                      Require Re-Login for Sensitive Actions
                    </label>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="self-end mb-4">
                <div className="flex items-start gap-2 text-gray-500">
                  <span className="material-symbols-sharp">info</span>
                  <div>
                    <p className="font-overpass text-[1.1rem] tracking-wide text-gray-500">
                      Some security changes apply only to new sessions, page refreshes, or the
                      user's next login.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isReadOnly || isSaving}
                  className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-icons-sharp">{isSaving ? 'sync' : 'save'}</span>
                  <span>{isSaving ? 'Saving...' : 'Update Organisation Security Preferences'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isReadOnly || isSaving || !isDirty}
                  className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-gray-700 font-jost text-[1.2rem] font-regular tracking-wider bg-gray-100 hover:bg-gray-200 box-border border border-gray-300 focus:ring-2 focus:ring-gray-300 leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-icons-sharp">restart_alt</span>
                  <span>Reset Changes</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default OrganisationSecuritySettingsPage;
