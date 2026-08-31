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
});
