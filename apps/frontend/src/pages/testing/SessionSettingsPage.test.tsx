import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionSettingsPage from '../../components/account-management/SessionSettingsPage';
import {
  type AccountCapabilitiesResponse,
  type AccountPolicyResponse,
  type AccountSecurityPreferencesResponse,
} from '../../services/account.service';

const accountServiceMock = vi.hoisted(() => ({
  getAccountSessions: vi.fn(),
  revokeAccountSession: vi.fn(),
  logoutOtherAccountSessions: vi.fn(),
  updateAccountSecurityPreferences: vi.fn(),
  extractErrorMessage: vi.fn(() => 'Request failed.'),
}));

vi.mock('../../services/account.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/account.service')>(
    '../../services/account.service',
  );

  return {
    ...actual,
    ...accountServiceMock,
  };
});

const editableCapabilities: AccountCapabilitiesResponse = {
  canEditProfile: true,
  canRequestEmailChange: true,
  canChangePassword: true,
  canEditSecurityPreferences: true,
  canDeleteAccount: false,
  securityPreferenceEditable: {
    preferredRegularSessionLengthHours: true,
    preferredRememberMeSessionLengthHours: true,
    preferredIdleTimeoutMinutes: true,
  },
  blockedReasons: {
    emailChange: null,
    securityPreferences: null,
    preferredRegularSessionLengthHours: null,
    preferredRememberMeSessionLengthHours: null,
    preferredIdleTimeoutMinutes: null,
    deleteAccount: 'SELF_DELETION_NOT_SUPPORTED',
  },
};

const securityPreferences: AccountSecurityPreferencesResponse = {
  id: 'preferences-1',
  preferredRegularSessionLengthHours: 8,
  preferredRememberMeSessionLengthHours: 168,
  preferredIdleTimeoutMinutes: 30,
  updatedAt: '2026-08-31T08:00:00.000Z',
};

const effectivePolicy: AccountPolicyResponse = {
  organisationId: 'organisation-1',
  rememberMeRequested: true,
  rememberMeAllowed: true,
  rememberMeApplied: true,
  regularSessionSeconds: 8 * 60 * 60,
  rememberedSessionSeconds: 168 * 60 * 60,
  effectiveSessionSeconds: 8 * 60 * 60,
  idleTimeoutMinutes: 30,
  requireReauthenticationForSensitiveActions: true,
  allowEmailChange: true,
  sources: {},
};

const longLocation =
  'A very long office location description that should remain fully available to the user';

const sessions = [
  {
    id: 'current-session',
    rememberMe: false,
    current: true,
    createdAt: '2026-08-31T08:00:00.000Z',
    lastActiveAt: '2026-08-31T09:00:00.000Z',
    expiresAt: '2026-08-31T10:00:00.000Z',
    idleTimeoutMinutes: 15,
    deviceSummary: 'Windows · Chrome',
    locationSummary: longLocation,
  },
  {
    id: 'other-session',
    rememberMe: true,
    current: false,
    createdAt: '2026-08-30T08:00:00.000Z',
    lastActiveAt: '2026-08-30T09:00:00.000Z',
    expiresAt: '2026-09-06T08:00:00.000Z',
    idleTimeoutMinutes: 30,
    deviceSummary: 'macOS · Safari',
    locationSummary: 'Remote office',
  },
];

function renderPage(props: Partial<ComponentProps<typeof SessionSettingsPage>> = {}) {
  return render(
    <SessionSettingsPage
      securityPreferences={securityPreferences}
      effectivePolicy={effectivePolicy}
      capabilities={editableCapabilities}
      {...props}
    />,
  );
}

function getSessionControls() {
  return [
    screen.queryByLabelText('Regular Session Duration') ??
      screen.getByRole('button', { name: /8 Hours/i }),
    screen.queryByLabelText('"Remember Me" Duration') ??
      screen.getByRole('button', { name: /7 Days/i }),
    screen.queryByLabelText('Idle Timeout Duration') ??
      screen.getByRole('button', { name: /30 Minutes/i }),
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  accountServiceMock.getAccountSessions.mockResolvedValue({ sessions: [] });
  accountServiceMock.revokeAccountSession.mockResolvedValue({ revoked: true });
  accountServiceMock.logoutOtherAccountSessions.mockResolvedValue({ revokedSessionCount: 0 });
  accountServiceMock.updateAccountSecurityPreferences.mockResolvedValue({
    securityPreferences,
  });
});

describe('SessionSettingsPage', () => {
  it('renders the page heading and description', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Session Settings/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        'View and manage your recent sessions and configure how sessions on your account behave.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the active sessions table', () => {
    renderPage();

    expect(screen.getByRole('columnheader', { name: 'Device' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Browser' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last Active' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders consistent loading and empty states', async () => {
    renderPage();

    expect(screen.getByText('Loading active sessions...')).toBeInTheDocument();
    expect(await screen.findByText('No active sessions found.')).toBeInTheDocument();
  });

  it('keeps long session values fully available when visually constrained', async () => {
    accountServiceMock.getAccountSessions.mockResolvedValue({ sessions });

    renderPage();

    const location = await screen.findByTitle(longLocation);
    expect(location).toHaveTextContent(longLocation);
    expect(location).toHaveAttribute('aria-label', longLocation);
    expect(location).toHaveAttribute('tabindex', '0');
  });

  it('renders recognised metadata with current-session status kept separate', async () => {
    accountServiceMock.getAccountSessions.mockResolvedValue({ sessions });

    renderPage();

    const currentRow = (await screen.findByText('Windows')).closest('tr');
    expect(currentRow).not.toBeNull();
    expect(within(currentRow!).getByText('Chrome')).toBeInTheDocument();
    expect(within(currentRow!).getAllByText(/Current Session/)).toHaveLength(2);

    const otherRow = screen.getByText('macOS').closest('tr');
    expect(otherRow).not.toBeNull();
    expect(within(otherRow!).getByText('Safari')).toBeInTheDocument();
  });

  it('uses safe fallbacks for null and malformed metadata', async () => {
    const unsafeSummary = 'private-client/1.0 confidential-fragment';
    accountServiceMock.getAccountSessions.mockResolvedValue({
      sessions: [
        { ...sessions[0], deviceSummary: null, locationSummary: null },
        {
          ...sessions[1],
          deviceSummary: unsafeSummary,
          locationSummary: null,
        },
      ],
    });

    renderPage();

    expect(await screen.findAllByText('Unknown device')).toHaveLength(2);
    expect(screen.getAllByText('Unknown browser')).toHaveLength(2);
    expect(screen.getAllByText('Location unavailable')).toHaveLength(2);
    expect(screen.queryByText(unsafeSummary)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('confidential-fragment');
  });

  it('preserves the existing session revoke action', async () => {
    const user = userEvent.setup();
    accountServiceMock.getAccountSessions.mockResolvedValue({ sessions });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Log Out Session' }));

    await waitFor(() => {
      expect(accountServiceMock.revokeAccountSession).toHaveBeenCalledWith('other-session');
    });
  });

  it('renders the session preference controls', () => {
    renderPage();
    expect(screen.getByText('Session Preferences')).toBeInTheDocument();

    const [regular, rememberMe, idleTimeout] = getSessionControls();
    expect(regular).toHaveTextContent(/8 Hours|8/);
    expect(rememberMe).toHaveTextContent(/7 Days|168/);
    expect(idleTimeout).toHaveTextContent(/30 Minutes|30/);
  });

  it('renders the session action buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Log Out All Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Session Settings/i })).toBeInTheDocument();
  });

  it('uses the light-theme preference control styling', () => {
    renderPage();

    for (const control of getSessionControls()) {
      expect(control.className).toContain('bg-gray-50');
      expect(control.className).toContain('text-deep-purple');
    }
  });

  it('keeps policy-managed session preference controls disabled and associated with helper text', () => {
    renderPage({
      capabilities: {
        ...editableCapabilities,
        securityPreferenceEditable: {
          preferredRegularSessionLengthHours: false,
          preferredRememberMeSessionLengthHours: false,
          preferredIdleTimeoutMinutes: false,
        },
      },
      effectivePolicy: {
        ...effectivePolicy,
        rememberMeAllowed: false,
      },
    });

    const regular =
      screen.queryByLabelText('Regular Session Duration') ??
      screen.getAllByRole('button', { name: /Organisation Default/i })[0];
    const rememberMe =
      screen.queryByLabelText('"Remember Me" Duration') ??
      screen.getByRole('button', { name: /Disabled by Policy/i });
    const idleTimeout =
      screen.queryByLabelText('Idle Timeout Duration') ??
      screen.getAllByRole('button', { name: /Organisation Default/i })[1];

    expect(regular).toBeDisabled();
    expect(rememberMe).toBeDisabled();
    expect(idleTimeout).toBeDisabled();
    if (rememberMe instanceof HTMLSelectElement) {
      expect(rememberMe).toHaveDisplayValue('Disabled by Policy');
    } else {
      expect(rememberMe).toHaveTextContent('Disabled by Policy');
    }
    expect(screen.getAllByText('Managed by organisation policy.')).toHaveLength(3);
  });

  it('preserves the session preference update payload when select values change', async () => {
    const user = userEvent.setup();
    renderPage();

    const [regular, rememberMe, idleTimeout] = getSessionControls();
    if (
      !(regular instanceof HTMLSelectElement) ||
      !(rememberMe instanceof HTMLSelectElement) ||
      !(idleTimeout instanceof HTMLSelectElement)
    ) {
      return;
    }

    await user.selectOptions(regular, '12');
    await user.selectOptions(rememberMe, '720');
    await user.selectOptions(idleTimeout, '60');
    await user.click(screen.getByRole('button', { name: /Update Session Settings/i }));

    await waitFor(() => {
      expect(accountServiceMock.updateAccountSecurityPreferences).toHaveBeenCalledWith({
        preferredRegularSessionLengthHours: 12,
        preferredRememberMeSessionLengthHours: 720,
        preferredIdleTimeoutMinutes: 60,
      });
    });
  });

  const nullSecurityPreferences = {
    id: 'preferences-1',
    preferredRegularSessionLengthHours: null,
    preferredRememberMeSessionLengthHours: null,
    preferredIdleTimeoutMinutes: null,
    updatedAt: '2026-08-31T08:00:00.000Z',
  };

  it('renders effective policy values directly when preferences are unset', () => {
    renderPage({
      securityPreferences: nullSecurityPreferences,
      effectivePolicy: {
        ...effectivePolicy,
        regularSessionSeconds: 8 * 3600,
        rememberedSessionSeconds: 168 * 3600,
        idleTimeoutMinutes: 30,
        sources: {
          regularSession: 'ORGANISATION_POLICY',
          rememberedSession: 'ORGANISATION_POLICY',
          idleTimeout: 'ORGANISATION_POLICY',
        },
      },
    });

    const [regular, rememberMe, idleTimeout] = getSessionControls();
    expect(regular).toHaveTextContent('8 Hours');
    expect(rememberMe).toHaveTextContent('7 Days');
    expect(idleTimeout).toHaveTextContent('30 Minutes');
  });

  it('renders effective duration directly regardless of policy source', () => {
    renderPage({
      securityPreferences: nullSecurityPreferences,
      effectivePolicy: {
        ...effectivePolicy,
        regularSessionSeconds: 12 * 3600,
        rememberedSessionSeconds: 720 * 3600,
        idleTimeoutMinutes: 15,
        sources: {
          regularSession: 'PLATFORM_DEFAULT',
          rememberedSession: 'PLATFORM_DEFAULT',
          idleTimeout: 'PLATFORM_DEFAULT',
        },
      },
    });

    const [regular, rememberMe, idleTimeout] = getSessionControls();
    expect(regular).toHaveTextContent('12 Hours');
    expect(rememberMe).toHaveTextContent('30 Days');
    expect(idleTimeout).toHaveTextContent('15 Minutes');
  });

  it('displays effective policy duration instead of stale stored user preferences', () => {
    renderPage({
      securityPreferences: {
        id: 'preferences-1',
        preferredRegularSessionLengthHours: 12,
        preferredRememberMeSessionLengthHours: 720,
        preferredIdleTimeoutMinutes: 60,
        updatedAt: '2026-08-31T08:00:00.000Z',
      },
      effectivePolicy: {
        ...effectivePolicy,
        regularSessionSeconds: 8 * 3600,
        rememberedSessionSeconds: 168 * 3600,
        idleTimeoutMinutes: 30,
        sources: {
          regularSession: 'ORGANISATION_POLICY',
          rememberedSession: 'ORGANISATION_POLICY',
          idleTimeout: 'ORGANISATION_POLICY',
        },
      },
    });

    const [regular, rememberMe, idleTimeout] = getSessionControls();
    expect(regular).toHaveTextContent('8 Hours');
    expect(rememberMe).toHaveTextContent('7 Days');
    expect(idleTimeout).toHaveTextContent('30 Minutes');
  });
});
