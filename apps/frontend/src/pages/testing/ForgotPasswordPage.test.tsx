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
}); // describe
