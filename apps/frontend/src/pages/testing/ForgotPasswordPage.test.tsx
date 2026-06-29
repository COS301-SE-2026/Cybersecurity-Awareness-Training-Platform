import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import ForgotPasswordPage from '../ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  // Test 1: Page Renders
  it('renders the forgot password page', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Forgot your Password?/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Password Reset Link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Login/i })).toBeInTheDocument();
  });

  // Test 2: Empty Email Validation
  it('shows a validation message when no email is entered', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Send Password Reset Link/i }));

    expect(screen.getByText(/Please Enter An Email Address/i)).toBeInTheDocument();
  });

  // Test 3: Invalid Email Validation
  it('shows a validation message for an invalid email address', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    // Type/Enter Invalid Email
    await userEvent.type(
      screen.getByPlaceholderText(/Enter your Email Address/i),
      'adrianorobertodacostajorge',
    );

    // Click Send Password Reset Link Button
    await userEvent.click(screen.getByRole('button', { name: /Send Password Reset Link/i }));

    expect(screen.getByText(/Please Enter A Valid Email Address/i)).toBeInTheDocument();
  });

  // Test 4: Loading State
  it('shows the loading state after submitting a valid email', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    // Enter/Type Valid Email
    await userEvent.type(
      screen.getByPlaceholderText(/Enter your Email Address/i),
      'adrianorobertodacostajorge@adrianorobertodacostajorge.co.za',
    );

    // Click Send Password Reset Link Button
    await userEvent.click(screen.getByRole('button', { name: /Send Password Reset Link/i }));

    expect(screen.getByRole('button', { name: /Sending Password Reset Link.../i })).toBeDisabled();
  });

  // Test 5: Accessibility Test
  // Back to Login Link is Keyboard Accessible
  it('back to login link is keyboard accessible', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    const BACK_TO_LOGIN_LINK = screen.getByRole('link', { name: /Back to Login/i });
    BACK_TO_LOGIN_LINK.focus();
    expect(BACK_TO_LOGIN_LINK).toHaveFocus();
  });
}); // describe
