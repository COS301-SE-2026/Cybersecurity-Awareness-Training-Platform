import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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
});
