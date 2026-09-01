import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PersonalSettingsPage from '../../components/account-management/PersonalSettingsPage';

describe('PersonalSettingsPage', () => {
  it('renders the page heading and description', () => {
    render(<PersonalSettingsPage />);
    expect(
      screen.getByRole('heading', { name: /Personal Information Settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Personal information associated with your account on the platform.'),
    ).toBeInTheDocument();
  });

  it('renders the first name and last name fields', () => {
    render(<PersonalSettingsPage />);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
  });

  it('renders the save personal information button', () => {
    render(<PersonalSettingsPage />);
    expect(screen.getByRole('button', { name: /Save Personal Information/i })).toBeInTheDocument();
  });

  it('renders the email as a selectable read-only value', () => {
    render(
      <PersonalSettingsPage
        profile={{
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          userType: 'ORGANISATION_ADMIN',
          authStatus: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-31T08:00:00.000Z',
        }}
      />,
    );
    const email = screen.getByLabelText('Email Address');
    expect(email).toHaveValue('john.doe@example.com');
    expect(email).toHaveAttribute('readonly');
    expect(email).not.toBeDisabled();
  });
});
