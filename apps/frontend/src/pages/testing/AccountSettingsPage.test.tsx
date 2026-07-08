import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccountSettingsPage from '../../components/account-management/AccountSettingsPage';

describe('AccountSettingsPage', () => {
  it('renders the heading and description', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole('heading', { name: /Account Settings/i })).toBeInTheDocument();
    expect(
      screen.getByText('Manage the settings associated with your account.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Update your email address, password, or delete your account.'),
    ).toBeInTheDocument();
  });

  it('renders the email address and password fields', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders the account action buttons', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole('button', { name: /Change Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
  });

  it('renders the danger zone section', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole('heading', { name: /Danger Zone/i })).toBeInTheDocument();
    expect(screen.getByText(/Permanently delete your/i)).toBeInTheDocument();
    expect(screen.getByText(/Once your account is deleted/i)).toBeInTheDocument();
  });
});
