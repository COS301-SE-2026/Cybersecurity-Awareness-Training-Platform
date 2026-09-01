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
    expect(screen.getByRole('heading', { name: 'Danger Zone' })).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('renders the account action buttons and Danger Zone explanation', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole('button', { name: /Change Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
    expect(screen.getByText('Account deletion is currently unavailable.')).toBeInTheDocument();
  });

  it('renders the account email as a selectable read-only value instead of a disabled control', () => {
    const longEmail =
      'avery.long.account.email.address.for.audit.review@example-insightful-phish.test';

    render(
      <AccountSettingsPage
        profile={{
          id: 'user-1',
          firstName: 'Avery',
          lastName: 'Longemail',
          email: longEmail,
          userType: 'ORGANISATION_ADMIN',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: '2026-08-31T08:00:00.000Z',
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
        capabilities={{
          canEditProfile: true,
          canRequestEmailChange: true,
          canChangePassword: true,
          canEditSecurityPreferences: true,
          securityPreferenceEditable: {},
          blockedReasons: {},
        }}
      />,
    );

    const email = screen.getByLabelText('Email Address');
    const helper = screen.getByText('Use Change Email to request a verified email address update.');

    expect(email).toHaveValue(longEmail);
    expect(email).toHaveAttribute('readonly');
    expect(email).not.toBeDisabled();
    expect(email).toHaveAttribute('aria-describedby', helper.id);
  });

  it('keeps the email value readable when email changes are blocked by organisation policy', () => {
    render(
      <AccountSettingsPage
        profile={{
          id: 'user-1',
          firstName: 'Avery',
          lastName: 'Policy',
          email: 'avery.policy@example.com',
          userType: 'ORGANISATION_TRAINEE',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
        capabilities={{
          canEditProfile: true,
          canRequestEmailChange: false,
          canChangePassword: true,
          canEditSecurityPreferences: true,
          securityPreferenceEditable: {},
          blockedReasons: { canRequestEmailChange: 'ORGANISATION_POLICY' },
        }}
      />,
    );

    const email = screen.getByLabelText('Email Address');

    expect(email).toHaveValue('avery.policy@example.com');
    expect(email).toHaveAttribute('readonly');
    expect(email).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Change Email/i })).toBeDisabled();
    expect(screen.getByText('Email change is managed by organisation policy.')).toBeInTheDocument();
  });

  it('displays accurate delete account explanation for platform administrators without organisation-managed wording', () => {
    render(
      <AccountSettingsPage
        profile={{
          id: 'user-admin',
          firstName: 'Platform',
          lastName: 'Admin',
          email: 'admin@insightfulphish.com',
          userType: 'IP_ADMIN',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: '2026-08-31T08:00:00.000Z',
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
        capabilities={{
          canEditProfile: true,
          canRequestEmailChange: true,
          canChangePassword: true,
          canEditSecurityPreferences: true,
          canDeleteAccount: false,
          securityPreferenceEditable: {},
          blockedReasons: {
            deleteAccount: 'PLATFORM_SELF_DELETION_NOT_SUPPORTED',
          },
        }}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toBeDisabled();
    expect(screen.getByText('Platform accounts do not support self-deletion.')).toBeInTheDocument();
    expect(screen.queryByText(/organisation/i)).not.toBeInTheDocument();
  });

  it('displays accurate delete account explanation for organisation trainees', () => {
    render(
      <AccountSettingsPage
        profile={{
          id: 'user-trainee',
          firstName: 'Org',
          lastName: 'Trainee',
          email: 'trainee@example.com',
          userType: 'ORGANISATION_TRAINEE',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: '2026-08-31T08:00:00.000Z',
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
        capabilities={{
          canEditProfile: true,
          canRequestEmailChange: true,
          canChangePassword: true,
          canEditSecurityPreferences: true,
          canDeleteAccount: false,
          securityPreferenceEditable: {},
          blockedReasons: {
            deleteAccount: 'ORGANISATION_TRAINEE_MANAGED',
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeDisabled();
    expect(
      screen.getByText('Account deletion is managed by your organisation administrator.'),
    ).toBeInTheDocument();
  });

  it('displays accurate delete account explanation for general trainees', () => {
    render(
      <AccountSettingsPage
        profile={{
          id: 'user-general',
          firstName: 'General',
          lastName: 'Trainee',
          email: 'general@example.com',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: '2026-08-31T08:00:00.000Z',
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
        capabilities={{
          canEditProfile: true,
          canRequestEmailChange: true,
          canChangePassword: true,
          canEditSecurityPreferences: true,
          canDeleteAccount: false,
          securityPreferenceEditable: {},
          blockedReasons: {
            deleteAccount: 'SELF_DELETION_NOT_SUPPORTED',
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeDisabled();
    expect(screen.getByText('Account self-deletion is currently unavailable.')).toBeInTheDocument();
  });

  it('displays accurate delete account explanation for organisation administrators', () => {
    render(
      <AccountSettingsPage
        profile={{
          id: 'user-org-admin',
          firstName: 'Org',
          lastName: 'Admin',
          email: 'admin@org.test',
          userType: 'ORGANISATION_ADMIN',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: '2026-08-31T08:00:00.000Z',
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
        capabilities={{
          canEditProfile: true,
          canRequestEmailChange: true,
          canChangePassword: true,
          canEditSecurityPreferences: true,
          canDeleteAccount: false,
          securityPreferenceEditable: {},
          blockedReasons: {
            deleteAccount: 'ORGANISATION_ADMIN_MANAGED',
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeDisabled();
    expect(
      screen.getByText('Account deletion is managed by your platform administrator.'),
    ).toBeInTheDocument();
  });
});
