import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccountSettingsPage from '../../components/account-management/AccountSettingsPage';

const baseProfile = {
  id: 'user-1',
  firstName: 'Avery',
  lastName: 'User',
  email: 'avery.user@example.test',
  userType: 'GENERAL_TRAINEE',
  authStatus: 'ACTIVE',
  emailVerified: true,
  emailVerifiedAt: '2026-08-31T08:00:00.000Z',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-31T08:00:00.000Z',
};

const baseCapabilities = {
  canEditProfile: true,
  canRequestEmailChange: true,
  canChangePassword: true,
  canEditSecurityPreferences: true,
  canDeleteAccount: false,
  securityPreferenceEditable: {},
  blockedReasons: {},
};

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
        profile={{ ...baseProfile, email: longEmail, userType: 'ORGANISATION_ADMIN' }}
        capabilities={baseCapabilities}
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
        profile={{ ...baseProfile, userType: 'ORGANISATION_TRAINEE' }}
        capabilities={{
          ...baseCapabilities,
          canRequestEmailChange: false,
          blockedReasons: { canRequestEmailChange: 'ORGANISATION_POLICY' },
        }}
      />,
    );

    const email = screen.getByLabelText('Email Address');

    expect(email).toHaveValue(baseProfile.email);
    expect(email).toHaveAttribute('readonly');
    expect(email).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Change Email/i })).toBeDisabled();
    expect(screen.getByText('Email change is managed by organisation policy.')).toBeInTheDocument();
  });

  it.each([
    {
      userType: 'IP_ADMIN',
      deleteReason: 'PLATFORM_SELF_DELETION_NOT_SUPPORTED',
      expectedExplanation: 'Platform accounts do not support self-deletion.',
      assertNoOrgWord: true,
    },
    {
      userType: 'ORGANISATION_TRAINEE',
      deleteReason: 'ORGANISATION_TRAINEE_MANAGED',
      expectedExplanation: 'Account deletion is managed by your organisation administrator.',
      assertNoOrgWord: false,
    },
    {
      userType: 'GENERAL_TRAINEE',
      deleteReason: 'SELF_DELETION_NOT_SUPPORTED',
      expectedExplanation: 'Account self-deletion is currently unavailable.',
      assertNoOrgWord: false,
    },
    {
      userType: 'ORGANISATION_ADMIN',
      deleteReason: 'ORGANISATION_ADMIN_MANAGED',
      expectedExplanation: 'Account deletion is managed by your platform administrator.',
      assertNoOrgWord: false,
    },
  ])(
    'displays accurate delete account explanation for $userType',
    ({ userType, deleteReason, expectedExplanation, assertNoOrgWord }) => {
      render(
        <AccountSettingsPage
          profile={{ ...baseProfile, userType }}
          capabilities={{
            ...baseCapabilities,
            blockedReasons: { deleteAccount: deleteReason },
          }}
        />,
      );

      const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).toBeDisabled();
      expect(screen.getByText(expectedExplanation)).toBeInTheDocument();
      if (assertNoOrgWord) {
        expect(screen.queryByText(/organisation/i)).not.toBeInTheDocument();
      }
    },
  );
});
