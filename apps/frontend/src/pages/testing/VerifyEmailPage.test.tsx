import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../../testing/render';
import { verifyEmail } from '../../services/auth.service';
import VerifyEmailPage from '../VerifyEmailPage';

const { verifyEmailMock } = vi.hoisted(() => ({
  verifyEmailMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  verifyEmail: verifyEmailMock,
}));

const verificationToken = 'exampleVerificationTokeValueWithAtLeast32Chars';

function renderVerifyEmailPage(initialEntry = `/verify-email?token=${verificationToken}`) {
  return renderWithRouter(<VerifyEmailPage />, {
    initialEntry,
    routePath: '/verify-email',
  });
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmailMock.mockResolvedValue({ state: 'VALID' });
  });

  afterEach(() => {
    cleanup();
  });

  it('verifies the token from the query string anf shows a login link after success', async () => {
    renderVerifyEmailPage();

    expect(verifyEmail).toHaveBeenCalledWith(verificationToken);
    expect(await screen.findByText('Email verified. You can now log in.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a token error when the token query parameter is missing', async () => {
    renderVerifyEmailPage('/verify-email');

    expect(verifyEmail).not.toHaveBeenCalledWith();
    expect(
      await screen.findByText(
        'This verification link is missing a token. Please request a new verification email.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a safe already-complete message for used email verification links', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'USED' });

    renderVerifyEmailPage();

    expect(
      await screen.findByText(
        'This email verification link has already been used. You can log in.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to login/i })).toBeInTheDocument();
  });

  it('shows a token error for invalid verification links', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'INVALID' });

    renderVerifyEmailPage();

    expect(
      await screen.findByText(
        'This verification link is invalid. Please request a new verification email.',
      ),
    ).toBeInTheDocument();
  });
});
