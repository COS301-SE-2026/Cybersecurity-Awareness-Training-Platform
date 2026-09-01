import { useState, useEffect, useCallback } from 'react';
import BasicAlert from '../alerts/BasicAlert';
import { SelectField, type SelectFieldOption } from '../ui/FormField';
import {
  AdminTable,
  AdminTableActions,
  AdminTableCell,
  AdminTableContainer,
  AdminTableEmptyRow,
  AdminTableHeader,
  AdminTableHeaderCell,
  AdminTableLoadingRow,
  TruncatedValue,
} from '../ui/AdminTable';
import {
  getAccountSessions,
  revokeAccountSession,
  logoutOtherAccountSessions,
  updateAccountSecurityPreferences,
  extractErrorMessage,
  type AccountSessionResponse,
  type AccountSecurityPreferencesResponse,
  type AccountPolicyResponse,
  type AccountCapabilitiesResponse,
} from '../../services/account.service';

type SessionSettingsPageProps = Readonly<{
  securityPreferences?: AccountSecurityPreferencesResponse | null;
  effectivePolicy?: AccountPolicyResponse | null;
  capabilities?: AccountCapabilitiesResponse | null;
  onNotification?: (message: string) => void;
  onRefresh?: () => void;
  onApiError?: (err: unknown) => boolean;
}>;

function formatLastActive(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

const SUPPORTED_SESSION_DEVICES = new Set(['Windows', 'macOS', 'Linux', 'Android', 'iOS']);
const SUPPORTED_SESSION_BROWSERS = new Set(['Edge', 'Chrome', 'Firefox', 'Safari']);

function toSessionDisplayMetadata(deviceSummary: string | null): {
  deviceName: string;
  browserName: string;
} {
  const parts = deviceSummary?.split('·').map((part) => part.trim()) ?? [];
  if (
    parts.length !== 2 ||
    !SUPPORTED_SESSION_DEVICES.has(parts[0] ?? '') ||
    !SUPPORTED_SESSION_BROWSERS.has(parts[1] ?? '')
  ) {
    return { deviceName: 'Unknown device', browserName: 'Unknown browser' };
  }

  return { deviceName: parts[0]!, browserName: parts[1]! };
}

function getSourceLabel(source?: string | null): string {
  if (source === 'PLATFORM_DEFAULT') return 'Platform Default';
  if (source === 'USER_PREFERENCE') return 'User Preference';
  return 'Organisation Default';
}

function getEffectiveRegularText(seconds?: number | null): string {
  if (!seconds) return '15 Minutes';
  if (seconds < 3600) return `${Math.round(seconds / 60)} Minutes`;
  const hours = Math.round(seconds / 3600);
  if (hours === 24) return '24 Hours (1 Day)';
  return `${hours} Hours`;
}

function getEffectiveRememberText(seconds?: number | null): string {
  if (!seconds) return '30 Days';
  if (seconds < 3600) return `${Math.round(seconds / 60)} Minutes`;
  const hours = Math.round(seconds / 3600);
  if (hours === 24) return '1 Day';
  if (hours === 168) return '7 Days';
  if (hours === 336) return '14 Days';
  if (hours === 720) return '30 Days';
  if (hours % 24 === 0) return `${hours / 24} Days`;
  return `${hours} Hours`;
}

function getEffectiveIdleText(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return 'Disabled';
  if (minutes === 60) return '1 Hour';
  if (minutes === 120) return '2 Hours';
  return `${minutes} Minutes`;
}

function getRegularLabel(
  hours: number | null | undefined,
  effectiveSeconds?: number | null,
  source?: string | null,
): string {
  if (hours === null || hours === undefined) {
    return `${getSourceLabel(source)} (${getEffectiveRegularText(effectiveSeconds)})`;
  }
  if (hours === 24) return '24 Hours (1 Day)';
  return `${hours} Hours`;
}

function getRememberLabel(
  hours: number | null | undefined,
  isPolicyDisabled = false,
  effectiveSeconds?: number | null,
  source?: string | null,
): string {
  if (isPolicyDisabled) return 'Disabled by Policy';
  if (hours === null || hours === undefined) {
    return `${getSourceLabel(source)} (${getEffectiveRememberText(effectiveSeconds)})`;
  }
  if (hours === 24) return '1 Day';
  if (hours === 168) return '7 Days';
  if (hours === 336) return '14 Days';
  if (hours === 720) return '30 Days';
  return `${hours} Hours`;
}

function getIdleLabel(
  minutes: number | null | undefined,
  effectiveMinutes?: number | null,
  source?: string | null,
): string {
  if (minutes === null || minutes === undefined) {
    return `${getSourceLabel(source)} (${getEffectiveIdleText(effectiveMinutes)})`;
  }
  if (minutes === 60) return '1 Hour';
  if (minutes === 120) return '2 Hours';
  return `${minutes} Minutes`;
}

const DEFAULT_PREFERENCE_VALUE = 'default';

function toPreferenceSelectValue(value: number | null | undefined): string {
  return value === null || value === undefined ? DEFAULT_PREFERENCE_VALUE : String(value);
}

function fromPreferenceSelectValue(value: string): number | null {
  return value === DEFAULT_PREFERENCE_VALUE ? null : Number(value);
}

function includeSelectedPreferenceOption(
  options: readonly SelectFieldOption[],
  value: number | null | undefined,
  label: string,
): readonly SelectFieldOption[] {
  if (value === null || value === undefined) return options;

  const selectedValue = String(value);
  if (options.some((option) => option.value === selectedValue)) return options;

  return [{ value: selectedValue, label }, ...options];
}

function SessionSettingsPage({
  securityPreferences,
  effectivePolicy,
  capabilities,
  onNotification,
  onRefresh,
  onApiError,
}: SessionSettingsPageProps) {
  const [sessions, setSessions] = useState<AccountSessionResponse[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [alertMessage, setAlertMessage] = useState('');
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  const regularSessionEditable =
    capabilities?.securityPreferenceEditable?.preferredRegularSessionLengthHours ?? true;
  const rememberMeEditable =
    capabilities?.securityPreferenceEditable?.preferredRememberMeSessionLengthHours ?? true;
  const idleTimeoutEditable =
    capabilities?.securityPreferenceEditable?.preferredIdleTimeoutMinutes ?? true;

  const defaultRegular = regularSessionEditable
    ? (securityPreferences?.preferredRegularSessionLengthHours ?? null)
    : null;

  const defaultRemember = rememberMeEditable
    ? (securityPreferences?.preferredRememberMeSessionLengthHours ?? null)
    : null;

  const defaultIdle = idleTimeoutEditable
    ? (securityPreferences?.preferredIdleTimeoutMinutes ?? null)
    : null;

  const [userRegularHours, setUserRegularHours] = useState<number | null | undefined>(undefined);
  const [userRememberHours, setUserRememberHours] = useState<number | null | undefined>(undefined);
  const [userIdleMins, setUserIdleMins] = useState<number | null | undefined>(undefined);

  const selectedRegularHours = userRegularHours !== undefined ? userRegularHours : defaultRegular;
  const selectedRememberHours =
    userRememberHours !== undefined ? userRememberHours : defaultRemember;
  const selectedIdleMins = userIdleMins !== undefined ? userIdleMins : defaultIdle;

  const regularSource = effectivePolicy?.sources?.regularSession;
  const rememberSource =
    effectivePolicy?.sources?.rememberedSession ?? effectivePolicy?.sources?.rememberMe;
  const idleSource = effectivePolicy?.sources?.idleTimeout;

  const isRememberDisabledByPolicy =
    !rememberMeEditable && effectivePolicy?.rememberMeAllowed === false;

  const regularSessionOptions = includeSelectedPreferenceOption(
    [
      {
        value: DEFAULT_PREFERENCE_VALUE,
        label: getRegularLabel(null, effectivePolicy?.regularSessionSeconds, regularSource),
      },
      { value: '4', label: '4 Hours' },
      { value: '8', label: '8 Hours' },
      { value: '12', label: '12 Hours' },
      { value: '24', label: '24 Hours (1 Day)' },
    ],
    selectedRegularHours,
    getRegularLabel(selectedRegularHours, effectivePolicy?.regularSessionSeconds, regularSource),
  );
  const rememberMeOptions = includeSelectedPreferenceOption(
    [
      {
        value: DEFAULT_PREFERENCE_VALUE,
        label: isRememberDisabledByPolicy
          ? 'Disabled by Policy'
          : getRememberLabel(
              null,
              false,
              effectivePolicy?.rememberedSessionSeconds,
              rememberSource,
            ),
      },
      { value: '24', label: '1 Day' },
      { value: '168', label: '7 Days' },
      { value: '336', label: '14 Days' },
      { value: '720', label: '30 Days' },
    ],
    selectedRememberHours,
    getRememberLabel(
      selectedRememberHours,
      isRememberDisabledByPolicy,
      effectivePolicy?.rememberedSessionSeconds,
      rememberSource,
    ),
  );
  const idleTimeoutOptions = includeSelectedPreferenceOption(
    [
      {
        value: DEFAULT_PREFERENCE_VALUE,
        label: getIdleLabel(null, effectivePolicy?.idleTimeoutMinutes, idleSource),
      },
      { value: '5', label: '5 Minutes' },
      { value: '15', label: '15 Minutes' },
      { value: '30', label: '30 Minutes' },
      { value: '60', label: '1 Hour' },
      { value: '120', label: '2 Hours' },
    ],
    selectedIdleMins,
    getIdleLabel(selectedIdleMins, effectivePolicy?.idleTimeoutMinutes, idleSource),
  );

  const fetchSessionsData = useCallback(() => {
    getAccountSessions()
      .then((res) => {
        setSessions(res.sessions || []);
        setLoadingSessions(false);
      })
      .catch((err: unknown) => {
        if (onApiError?.(err)) return;
        setAlertMessage(extractErrorMessage(err));
        setLoadingSessions(false);
      });
  }, [onApiError]);

  useEffect(() => {
    fetchSessionsData();
  }, [fetchSessionsData]);

  async function handleRevokeSession(sessionId: string) {
    setAlertMessage('');
    try {
      await revokeAccountSession(sessionId);
      if (onNotification) {
        onNotification('Session revoked successfully.');
      }
      fetchSessionsData();
    } catch (err: unknown) {
      if (onApiError?.(err)) return;
      setAlertMessage(extractErrorMessage(err));
    }
  }

  async function handleLogoutAllOthers() {
    setAlertMessage('');
    try {
      const res = await logoutOtherAccountSessions();
      if (onNotification) {
        onNotification(
          res.revokedSessionCount > 0
            ? `Logged out of ${res.revokedSessionCount} other session(s).`
            : 'No other active sessions to log out.',
        );
      }
      fetchSessionsData();
    } catch (err: unknown) {
      if (onApiError?.(err)) return;
      setAlertMessage(extractErrorMessage(err));
    }
  }

  async function handleSavePreferences() {
    setAlertMessage('');

    const payload: {
      preferredRegularSessionLengthHours?: number | null;
      preferredRememberMeSessionLengthHours?: number | null;
      preferredIdleTimeoutMinutes?: number | null;
    } = {};

    if (regularSessionEditable && userRegularHours !== undefined) {
      payload.preferredRegularSessionLengthHours = userRegularHours;
    }
    if (rememberMeEditable && userRememberHours !== undefined) {
      payload.preferredRememberMeSessionLengthHours = userRememberHours;
    }
    if (idleTimeoutEditable && userIdleMins !== undefined) {
      payload.preferredIdleTimeoutMinutes = userIdleMins;
    }

    if (Object.keys(payload).length === 0) {
      setAlertMessage('No preference changes were made to save.');
      return;
    }

    setIsUpdatingPreferences(true);
    try {
      await updateAccountSecurityPreferences(payload);
      setIsUpdatingPreferences(false);
      setUserRegularHours(undefined);
      setUserRememberHours(undefined);
      setUserIdleMins(undefined);
      if (onRefresh) onRefresh();
      if (onNotification) {
        onNotification('Session preferences updated successfully.');
      }
    } catch (err: unknown) {
      setIsUpdatingPreferences(false);
      if (onApiError?.(err)) return;
      setAlertMessage(extractErrorMessage(err));
    }
  }

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Session Settings
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        View and manage your recent sessions and configure how sessions on your account behave.
      </p>

      {alertMessage && (
        <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
          {alertMessage}
        </BasicAlert>
      )}

      <div className="flex items-center justify-between">
        {/* Sessions HEADING */}
        <h3 className="font-jost text-[1.3rem] text-purple tracking-wider font-medium mb-2">
          Active Sessions ({sessions.length})
        </h3>

        <button
          type="button"
          onClick={handleLogoutAllOthers}
          className="cursor-pointer font-overpass text-[1rem] font-medium text-red-600 hover:underline"
        >
          Log Out All Sessions
        </button>
      </div>

      {/* SESSIONS TABLE */}
      <AdminTableContainer>
        <AdminTable>
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Device</AdminTableHeaderCell>
              <AdminTableHeaderCell>Browser</AdminTableHeaderCell>
              <AdminTableHeaderCell>Location</AdminTableHeaderCell>
              <AdminTableHeaderCell>Last Active</AdminTableHeaderCell>
              <AdminTableHeaderCell>Action</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
            {loadingSessions ? (
              <AdminTableLoadingRow colSpan={5}>Loading active sessions...</AdminTableLoadingRow>
            ) : sessions.length === 0 ? (
              <AdminTableEmptyRow colSpan={5}>No active sessions found.</AdminTableEmptyRow>
            ) : (
              sessions.map((session, index) => {
                const { deviceName, browserName } = toSessionDisplayMetadata(session.deviceSummary);

                return (
                  <tr
                    key={session.id}
                    className={`${index % 2 === 0 ? 'bg-neutral-primary' : 'bg-neutral-secondary-soft'} font-overpass border-b border-default`}
                  >
                    <th scope="row" className="px-6 py-4 font-medium text-gray-600">
                      <TruncatedValue
                        value={session.current ? `${deviceName} (Current Session)` : deviceName}
                        className="max-w-64"
                      >
                        {deviceName}{' '}
                        {session.current && (
                          <span className="text-fg-brand">(Current Session)</span>
                        )}
                      </TruncatedValue>
                    </th>
                    <AdminTableCell>
                      <TruncatedValue value={browserName} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <TruncatedValue value={session.locationSummary || 'Unknown Location'} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <TruncatedValue value={formatLastActive(session.lastActiveAt)} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminTableActions>
                        {session.current ? (
                          <span className="font-medium text-gray-400">Current Session</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session.id)}
                            className="cursor-pointer font-medium text-red-600 hover:underline"
                          >
                            Log Out Session
                          </button>
                        )}
                      </AdminTableActions>
                    </AdminTableCell>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminTable>
      </AdminTableContainer>

      {/* HEADING */}
      <h3 className="font-jost text-[1.3rem] text-purple tracking-wider font-medium mt-12 -mb-3">
        Session Preferences
      </h3>

      <div className="flex items-end justify-between">
        {/* Preference controls */}
        <div className="mt-4 grid grid-cols-3 flex-1 max-w-4xl gap-6">
          <SelectField
            id="regular-session-duration"
            label="Regular Session Duration"
            value={toPreferenceSelectValue(selectedRegularHours)}
            options={regularSessionOptions}
            onChange={(value) => setUserRegularHours(fromPreferenceSelectValue(value))}
            disabled={!regularSessionEditable}
            helperText={!regularSessionEditable ? 'Managed by organisation policy.' : undefined}
          />

          <SelectField
            id="remember-me-duration"
            label='"Remember Me" Duration'
            value={toPreferenceSelectValue(selectedRememberHours)}
            options={rememberMeOptions}
            onChange={(value) => setUserRememberHours(fromPreferenceSelectValue(value))}
            disabled={!rememberMeEditable}
            helperText={!rememberMeEditable ? 'Managed by organisation policy.' : undefined}
          />

          <SelectField
            id="idle-timeout-duration"
            label="Idle Timeout Duration"
            value={toPreferenceSelectValue(selectedIdleMins)}
            options={idleTimeoutOptions}
            onChange={(value) => setUserIdleMins(fromPreferenceSelectValue(value))}
            disabled={!idleTimeoutEditable}
            helperText={!idleTimeoutEditable ? 'Managed by organisation policy.' : undefined}
          />
        </div>

        <div className="mt-8 flex items-center justify-between">
          {/* Update Session Settings Button */}
          <button
            type="button"
            disabled={
              isUpdatingPreferences ||
              (!regularSessionEditable && !rememberMeEditable && !idleTimeoutEditable)
            }
            onClick={handleSavePreferences}
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons-sharp">save</span>
            <span> {isUpdatingPreferences ? 'Updating...' : 'Update Session Settings'} </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionSettingsPage;
