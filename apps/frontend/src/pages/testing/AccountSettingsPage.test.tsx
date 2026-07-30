import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccountSettingsPage from '../../components/account-management/AccountSettingsPage';

describe('AccountSettingsPage', () => {
  it('renders the heading and description', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole('heading', { name: /Account Settings/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Settings and security controls associated with your account on the platform.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the email address, password, and delete account labels', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('renders the account action buttons', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole('button', { name: /Change Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Account \(Managed\)/i })).toBeInTheDocument();
  });
});
