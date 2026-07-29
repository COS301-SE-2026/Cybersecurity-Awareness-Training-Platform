import { useState, useEffect, useCallback } from 'react';
import { Dropdown, DropdownItem } from 'flowbite-react';
import BasicAlert from '../alerts/BasicAlert';
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

function getRegularLabel(hours: number | null): string {
  if (hours === 4) return '4 Hours';
  if (hours === 8) return '8 Hours';
  if (hours === 12) return '12 Hours';
  if (hours === 24) return '24 Hours (1 Day)';
  return hours ? `${hours} Hours` : '24 Hours (1 Day)';
}

function getRememberLabel(hours: number | null | undefined): string {
  if (hours === null || hours === 0 || hours === undefined) return 'Never';
  if (hours === 24) return '1 Day';
  if (hours === 168) return '7 Days';
  if (hours === 336) return '14 Days';
  if (hours === 720) return '30 Days';
  return `${hours} Hours`;
}

function getIdleLabel(mins: number | null | undefined): string {
  if (mins === null || mins === 0 || mins === undefined) return 'Never';
  if (mins === 5) return '5 Minutes';
  if (mins === 15) return '15 Minutes';
  if (mins === 30) return '30 Minutes';
  if (mins === 60) return '1 Hour';
  if (mins === 120) return '2 Hours';
  return `${mins} Minutes`;
}

function SessionSettingsPage({
  securityPreferences,
  effectivePolicy,
  capabilities,
  onNotification,
  onRefresh,
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
    ? (securityPreferences?.preferredRegularSessionLengthHours ?? 24)
    : Math.floor((effectivePolicy?.regularSessionSeconds ?? 86400) / 3600);

  const defaultRemember = rememberMeEditable
    ? (securityPreferences?.preferredRememberMeSessionLengthHours ?? null)
    : effectivePolicy?.rememberedSessionSeconds
      ? Math.floor(effectivePolicy.rememberedSessionSeconds / 3600)
      : null;

  const defaultIdle = idleTimeoutEditable
    ? (securityPreferences?.preferredIdleTimeoutMinutes ?? null)
    : (effectivePolicy?.idleTimeoutMinutes ?? null);

  const [userRegularHours, setUserRegularHours] = useState<number | null>(null);
  const [userRememberHours, setUserRememberHours] = useState<number | null | 'NEVER'>('INIT');
  const [userIdleMins, setUserIdleMins] = useState<number | null | 'NEVER'>('INIT');

  const selectedRegularHours = userRegularHours ?? defaultRegular;
  const selectedRememberHours =
    userRememberHours === 'INIT'
      ? defaultRemember
      : userRememberHours === 'NEVER'
        ? null
        : userRememberHours;
  const selectedIdleMins =
    userIdleMins === 'INIT' ? defaultIdle : userIdleMins === 'NEVER' ? null : userIdleMins;

  const fetchSessionsData = useCallback(() => {
    getAccountSessions()
      .then((res) => {
        setSessions(res.sessions || []);
        setLoadingSessions(false);
      })
      .catch((err: unknown) => {
        setAlertMessage(extractErrorMessage(err));
        setLoadingSessions(false);
      });
  }, []);

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

    if (regularSessionEditable) {
      payload.preferredRegularSessionLengthHours = selectedRegularHours;
    }
    if (rememberMeEditable) {
      payload.preferredRememberMeSessionLengthHours = selectedRememberHours;
    }
    if (idleTimeoutEditable) {
      payload.preferredIdleTimeoutMinutes = selectedIdleMins;
    }

    if (Object.keys(payload).length === 0) {
      setAlertMessage('All session security preferences are managed by organisation policy.');
      return;
    }

    setIsUpdatingPreferences(true);
    try {
      await updateAccountSecurityPreferences(payload);
      setIsUpdatingPreferences(false);
      if (onRefresh) onRefresh();
      if (onNotification) {
        onNotification('Session preferences updated successfully.');
      }
    } catch (err: unknown) {
      setIsUpdatingPreferences(false);
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
      <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default">
        <table className="w-full text-sm text-left rtl:text-right text-body">
          <thead className="bg-faint-purple border-b border-default">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Device
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Browser
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Last Active
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
            {loadingSessions ? (
              <tr className="bg-neutral-primary border-b border-default">
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading active sessions...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr className="bg-neutral-primary border-b border-default">
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No active sessions found.
                </td>
              </tr>
            ) : (
              sessions.map((session, index) => {
                const parts = (session.deviceSummary || '').split('·').map((s: string) => s.trim());
                const deviceName = parts[0] || session.deviceSummary || 'Active Session';
                const browserName = parts[1] || 'Web Browser';

                return (
                  <tr
                    key={session.id}
                    className={`${index % 2 === 0 ? 'bg-neutral-primary' : 'bg-neutral-secondary-soft'} font-overpass border-b border-default`}
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap"
                    >
                      {deviceName}{' '}
                      {session.current && <span className="text-fg-brand">(Current Session)</span>}
                    </th>
                    <td className="px-6 py-4">{browserName}</td>
                    <td className="px-6 py-4">{session.locationSummary || 'Unknown Location'}</td>
                    <td className="px-6 py-4">{formatLastActive(session.lastActiveAt)}</td>
                    <td className="px-6 py-4">
                      {session.current ? (
                        <span className="text-gray-400 font-medium">Current Session</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session.id)}
                          className="cursor-pointer font-medium text-red-600 hover:underline"
                        >
                          Log Out Session
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* HEADING */}
      <h3 className="font-jost text-[1.3rem] text-purple tracking-wider font-medium mt-12 -mb-3">
        Session Preferences
      </h3>

      <div className="flex items-end justify-between">
        {/* DROPDOWNS  */}
        <div className="mt-4 grid grid-cols-3 flex-1 max-w-4xl gap-6">
          {/* DROPDOWN 1: Regular Session Length Dropdown */}
          <div>
            <label
              htmlFor="regular-session-duration"
              className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
            >
              Regular Session Duration
            </label>

            <Dropdown
              label={getRegularLabel(selectedRegularHours)}
              disabled={!regularSessionEditable}
              className="border border-gray-300 bg-gray-50 text-deep-purple font-overpass text-[1.2rem] block w-full p-2.5 disabled:opacity-50"
            >
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRegularHours(4)}
              >
                4 Hours
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRegularHours(8)}
              >
                8 Hours
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRegularHours(12)}
              >
                12 Hours
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRegularHours(24)}
              >
                24 Hours (1 Day)
              </DropdownItem>
            </Dropdown>
            {!regularSessionEditable && (
              <p className="font-overpass text-xs text-red-600 mt-1">
                Managed by organisation policy.
              </p>
            )}
          </div>

          {/* DROPDOWN 2: Remember Me Duration */}
          <div>
            <label
              htmlFor="remember-me-duration"
              className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
            >
              "Remember Me" Duration
            </label>

            <Dropdown
              label={getRememberLabel(selectedRememberHours)}
              disabled={!rememberMeEditable}
              className="border border-gray-300 bg-gray-50 text-deep-purple font-overpass text-[1.2rem] block w-full p-2.5 disabled:opacity-50"
            >
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRememberHours('NEVER')}
              >
                Never
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRememberHours(24)}
              >
                1 Day
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRememberHours(168)}
              >
                7 Days
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRememberHours(336)}
              >
                14 Days
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserRememberHours(720)}
              >
                30 Days
              </DropdownItem>
            </Dropdown>
            {!rememberMeEditable && (
              <p className="font-overpass text-xs text-red-600 mt-1">
                Managed by organisation policy.
              </p>
            )}
          </div>

          {/* DROPDOWN 3: Idle Timeout */}
          <div>
            <label
              htmlFor="idle-timeout-duration"
              className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
            >
              Idle Timeout Duration
            </label>

            <Dropdown
              label={getIdleLabel(selectedIdleMins)}
              disabled={!idleTimeoutEditable}
              className="border border-gray-300 bg-gray-50 text-deep-purple font-overpass text-[1.2rem] block w-full p-2.5 disabled:opacity-50"
            >
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserIdleMins(5)}
              >
                5 Minutes
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserIdleMins(15)}
              >
                15 Minutes
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserIdleMins(30)}
              >
                30 Minutes
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserIdleMins(60)}
              >
                1 Hour
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserIdleMins(120)}
              >
                2 Hours
              </DropdownItem>
              <DropdownItem
                className="font-overpass text-[1rem] hover:bg-faint-purple hover:text-dark-pink text-deep-purple"
                onClick={() => setUserIdleMins('NEVER')}
              >
                Never
              </DropdownItem>
            </Dropdown>
            {!idleTimeoutEditable && (
              <p className="font-overpass text-xs text-red-600 mt-1">
                Managed by organisation policy.
              </p>
            )}
          </div>
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
