import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AccountManagementPage from '../AccountManagementPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/account-management/PersonalSettingsPage', () => ({
  default: () => <div>Personal Information Settings</div>,
}));

vi.mock('../../components/account-management/AccountSettingsPage', () => ({
  default: () => <div>Account Settings</div>,
}));

vi.mock('../../components/account-management/SessionSettingsPage', () => ({
  default: () => <div>Session Settings</div>,
}));

describe('AccountManagementPage', () => {
  it('renders the page heading', () => {
    render(<AccountManagementPage />);
    expect(screen.getByRole('heading', { name: /Account Management/i })).toBeInTheDocument();
  });

  it('renders the Personal Information tab by default', () => {
    render(<AccountManagementPage />);
    expect(screen.getByText('Personal Information Settings')).toBeInTheDocument();
    expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Session Settings')).not.toBeInTheDocument();
  });

  it('switches to the Account tab', async () => {
    const user = userEvent.setup();
    render(<AccountManagementPage />);
    await user.click(screen.getByRole('button', { name: /Account/i }));
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.queryByText('Personal Information Settings')).not.toBeInTheDocument();
  });

  it('switches to the Sessions tab', async () => {
    const user = userEvent.setup();
    render(<AccountManagementPage />);
    await user.click(screen.getByRole('button', { name: /Sessions/i }));
    expect(screen.getByText('Session Settings')).toBeInTheDocument();
    expect(screen.queryByText('Personal Information Settings')).not.toBeInTheDocument();
  });

  it('allows switching back to the Personal Information tab', async () => {
    const user = userEvent.setup();
    render(<AccountManagementPage />);

    await user.click(screen.getByRole('button', { name: /Session/i }));
    await user.click(screen.getByRole('button', { name: /Personal Information/i }));

    expect(screen.getByText('Personal Information Settings')).toBeInTheDocument();
    expect(screen.queryByText('Session Settings')).not.toBeInTheDocument();
  });
});
