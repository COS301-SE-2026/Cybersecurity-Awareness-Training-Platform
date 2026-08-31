import { render, screen, waitFor } from '@testing-library/react';
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
  securityPreferenceEditable: {
    preferredRegularSessionLengthHours: true,
    preferredRememberMeSessionLengthHours: true,
    preferredIdleTimeoutMinutes: true,
  },
  blockedReasons: {},
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

function getSessionSelects() {
  return [
    screen.getByLabelText('Regular Session Duration'),
    screen.getByLabelText('"Remember Me" Duration'),
    screen.getByLabelText('Idle Timeout Duration'),
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  accountServiceMock.getAccountSessions.mockResolvedValue({ sessions: [] });
  accountServiceMock.logoutOtherAccountSessions.mockResolvedValue({ revokedSessionCount: 0 });
  accountServiceMock.revokeAccountSession.mockResolvedValue({ revoked: true });
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

  it('renders the session preference controls', () => {
    renderPage();
    expect(screen.getByText('Session Preferences')).toBeInTheDocument();

    const regular = screen.getByLabelText('Regular Session Duration');
    const rememberMe = screen.getByLabelText('"Remember Me" Duration');
    const idleTimeout = screen.getByLabelText('Idle Timeout Duration');

    expect(regular).toHaveValue('8');
    expect(rememberMe).toHaveValue('168');
    expect(idleTimeout).toHaveValue('30');
  });

  it('renders the session action buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Log Out All Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Session Settings/i })).toBeInTheDocument();
  });

  it('uses light-theme select styling without accidental dark utilities', () => {
    renderPage();

    for (const select of getSessionSelects()) {
      expect(select.className).toContain('bg-gray-50');
      expect(select.className).toContain('text-deep-purple');
      expect(select.className).not.toContain('dark:');
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

    const regular = screen.getByLabelText('Regular Session Duration');
    const rememberMe = screen.getByLabelText('"Remember Me" Duration');
    const idleTimeout = screen.getByLabelText('Idle Timeout Duration');

    expect(regular).toBeDisabled();
    expect(rememberMe).toBeDisabled();
    expect(idleTimeout).toBeDisabled();
    expect(rememberMe).toHaveDisplayValue('Disabled by Policy');
    expect(screen.getAllByText('Managed by organisation policy.')).toHaveLength(3);
  });

  it('preserves the session preference update payload when select values change', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText('Regular Session Duration'), '12');
    await user.selectOptions(screen.getByLabelText('"Remember Me" Duration'), '720');
    await user.selectOptions(screen.getByLabelText('Idle Timeout Duration'), '60');
    await user.click(screen.getByRole('button', { name: /Update Session Settings/i }));

    await waitFor(() => {
      expect(accountServiceMock.updateAccountSecurityPreferences).toHaveBeenCalledWith({
        preferredRegularSessionLengthHours: 12,
        preferredRememberMeSessionLengthHours: 720,
        preferredIdleTimeoutMinutes: 60,
      });
    });
  });
});
