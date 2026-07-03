import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import ResetPasswordPage from '../ResetPasswordPage';

describe('ResetPasswordPage', () => {
  // Test 1: PAGE RENDERS
  it('renders the reset password page', () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Reset your Password/i })).toBeInTheDocument;
    expect(screen.getByPlaceholderText(/Enter a New Password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Re-Enter New Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Login/i })).toBeInTheDocument();
  });

  // Test 2: Empty Password Validation
  it('shows a validation message when no password is entered', async () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    // "Press" Password Reset Button
    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    expect(screen.getByText(/Please Enter A Password/i)).toBeInTheDocument();
  });

  // Test 3: Weak Password Validation
  it('shows a validation message for a weak password', async () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    // Enter a Weak Password
    await userEvent.type(screen.getByPlaceholderText(/Enter a New Password/i), 'weak');

    // Confirm Weak Password
    await userEvent.type(screen.getByPlaceholderText(/Re-Enter New Password/i), 'weak');

    // "Press" Reset Password Button
    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    expect(screen.getByText(/Password Must Be At Least 12 Characters Long/i)).toBeInTheDocument();
  });

  // Test 4: Password Mismatch Validation
  it('shows a validation message when the passwords do not match', async () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    // Enter a  Password
    await userEvent.type(screen.getByPlaceholderText(/Enter a New Password/i), 'Password-1-Test@');

    // Confirm Password
    await userEvent.type(screen.getByPlaceholderText(/Re-Enter New Password/i), 'Password-2-Test#');

    // "Press" Reset Password Button
    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    expect(screen.getByText(/Password Confirmation Must Match Password/i)).toBeInTheDocument();
  });

  // Test 5: Loading State
  it('shows the loading state after submitting a valid password', async () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    // Enter a  Password
    await userEvent.type(
      screen.getByPlaceholderText(/Enter a New Password/i),
      'Password-1-Test@!Connor-Was-Here!',
    );

    // Confirm Password
    await userEvent.type(
      screen.getByPlaceholderText(/Re-Enter New Password/i),
      'Password-1-Test@!Connor-Was-Here!',
    );

    // "Press" Reset Password Button
    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    expect(screen.getByRole('button', { name: /Resetting Password.../i })).toBeDisabled();
  });
});
