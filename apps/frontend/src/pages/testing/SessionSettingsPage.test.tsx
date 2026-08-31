import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionSettingsPage from '../../components/account-management/SessionSettingsPage';
import {
  getAccountSessions,
  logoutOtherAccountSessions,
  revokeAccountSession,
} from '../../services/account.service';

vi.mock('../../services/account.service', () => ({
  getAccountSessions: vi.fn(),
  revokeAccountSession: vi.fn(),
  logoutOtherAccountSessions: vi.fn(),
  updateAccountSecurityPreferences: vi.fn(),
  extractErrorMessage: vi.fn(() => 'Unable to load account sessions.'),
}));

const getAccountSessionsMock = vi.mocked(getAccountSessions);
const revokeAccountSessionMock = vi.mocked(revokeAccountSession);
const logoutOtherAccountSessionsMock = vi.mocked(logoutOtherAccountSessions);

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
    deviceSummary: 'Current workstation',
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
    deviceSummary: 'Other workstation',
    locationSummary: 'Remote office',
  },
];

describe('SessionSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountSessionsMock.mockResolvedValue({ sessions: [] });
    revokeAccountSessionMock.mockResolvedValue({ revoked: true });
    logoutOtherAccountSessionsMock.mockResolvedValue({ revokedSessionCount: 0 });
  });

  it('renders the page heading and description', () => {
    render(<SessionSettingsPage />);
    expect(screen.getByRole('heading', { name: /Session Settings/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        'View and manage your recent sessions and configure how sessions on your account behave.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the active sessions table', () => {
    render(<SessionSettingsPage />);

    expect(screen.getByRole('columnheader', { name: 'Device' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Browser' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last Active' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders consistent loading and empty states', async () => {
    render(<SessionSettingsPage />);

    expect(screen.getByText('Loading active sessions...')).toBeInTheDocument();
    expect(await screen.findByText('No active sessions found.')).toBeInTheDocument();
  });

  it('keeps long session values fully available when visually constrained', async () => {
    getAccountSessionsMock.mockResolvedValue({ sessions });

    render(<SessionSettingsPage />);

    const location = await screen.findByTitle(longLocation);
    expect(location).toHaveTextContent(longLocation);
    expect(location).toHaveAttribute('aria-label', longLocation);
    expect(location).toHaveAttribute('tabindex', '0');
  });

  it('preserves the existing session revoke action', async () => {
    const user = userEvent.setup();
    getAccountSessionsMock.mockResolvedValue({ sessions });

    render(<SessionSettingsPage />);
    await user.click(await screen.findByRole('button', { name: 'Log Out Session' }));

    await waitFor(() => {
      expect(revokeAccountSessionMock).toHaveBeenCalledWith('other-session');
    });
  });

  it('renders the session preference controls', () => {
    render(<SessionSettingsPage />);
    expect(screen.getByText('Session Preferences')).toBeInTheDocument();
    expect(screen.getByText('Regular Session Duration')).toBeInTheDocument();
    expect(screen.getByText('"Remember Me" Duration')).toBeInTheDocument();
    expect(screen.getByText('Idle Timeout Duration')).toBeInTheDocument();
  });

  it('renders the session action buttons', () => {
    render(<SessionSettingsPage />);
    expect(screen.getByRole('button', { name: /Log Out All Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Session Settings/i })).toBeInTheDocument();
  });
});
