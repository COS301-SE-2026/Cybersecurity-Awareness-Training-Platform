import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SessionSettingsPage from '../../components/account-management/SessionSettingsPage';

describe('SessionSettingsPage', () => {
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
