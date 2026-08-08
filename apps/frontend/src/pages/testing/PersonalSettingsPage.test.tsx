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
});
