import { StrictMode } from 'react';
import '@testing-library/jest-dom/vitest';
import { ApiError } from '../../lib/apiClient';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferred, renderWithRouter } from '../../testing/render';
import { getTokenContext, resendToken, verifyEmail } from '../../services/auth.service';
import VerifyEmailPage from '../VerifyEmailPage';
import userEvent from '@testing-library/user-event';

const { verifyEmailMock, getTokenContextMock, resendTokenMock } = vi.hoisted(() => ({
  verifyEmailMock: vi.fn(),
  getTokenContextMock: vi.fn(),
  resendTokenMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  verifyEmail: verifyEmailMock,
  getTokenContext: getTokenContextMock,
  resendToken: resendTokenMock,
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
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: false,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });
    resendTokenMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('verifies the token from the query string anf shows a login link after success', async () => {
    renderVerifyEmailPage();

    await waitFor(() => {
      expect(verifyEmail).toHaveBeenCalledWith(verificationToken);
    });
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

  it('shows resend only when token context allows it', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });

    renderVerifyEmailPage();

    expect(
      await screen.findByRole('button', { name: /resend verification link/i }),
    ).toBeInTheDocument();
    expect(getTokenContext).toHaveBeenCalledWith(verificationToken);
  });

  it('does not expose resend for an email-change token context', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_CHANGE_VERIFICATION',
    });

    renderVerifyEmailPage();

    expect(
      await screen.findByText(
        'This verification link has expired. Please request a new verification email.',
      ),
    ).toBeInTheDocument();
    expect(getTokenContext).toHaveBeenCalledWith(verificationToken);
    expect(
      screen.queryByRole('button', { name: /resend verification link/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('EMAIL_CHANGE_VERIFICATION')).not.toBeInTheDocument();
    expect(screen.queryByText(verificationToken)).not.toBeInTheDocument();
    expect(screen.queryByText('target@example.com')).not.toBeInTheDocument();
    expect(resendToken).not.toHaveBeenCalled();
  });

  it('hides resend when token context says canResend is false', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });

    renderVerifyEmailPage();

    await screen.findByText(
      'This verification link has expired. Please request a new verification email.',
    );
    expect(
      screen.queryByRole('button', { name: /resend verification link/i }),
    ).not.toBeInTheDocument();
  });

  it('resends with the raw token from the URL and shows a safe success message', async () => {
    const user = userEvent.setup();

    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });

    renderVerifyEmailPage();

    await user.click(await screen.findByRole('button', { name: /resend verification link/i }));

    expect(resendToken).toHaveBeenCalledWith(verificationToken);
    expect(
      await screen.findByText(
        'If the email is still eligible, a new verification link has been sent.',
      ),
    ).toBeInTheDocument();
  });

  it('disables resend while the resend request is pending', async () => {
    const user = userEvent.setup();
    const resendRequest = createDeferred<{ success: boolean }>();

    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });
    resendTokenMock.mockReturnValue(resendRequest.promise);

    renderVerifyEmailPage();

    const resendButton = await screen.findByRole('button', { name: /resend verification link/i });
    await user.click(resendButton);

    expect(resendButton).toBeDisabled();
    expect(resendButton).toHaveTextContent('Sending verification link...');

    resendRequest.resolve({ success: true });

    expect(
      await screen.findByText(
        'If the email is still eligible, a new verification link has been sent.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the backend cooldown duration when resend is rate limited', async () => {
    const user = userEvent.setup();

    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });
    resendTokenMock.mockRejectedValue(
      new ApiError('Resend cooldown ative. Please try again later.', {
        status: 429,
        statusText: 'Too Many Requests',
        method: 'POST',
        url: '/auth/tokens/token/resend',
        body: {
          error: 'RESEND_COOLDOWN_ACTIVE',
          message: 'Resend cooldown active. Please try again later.',
          cooldownSeconds: 40,
        },
      }),
    );

    renderVerifyEmailPage();

    await user.click(await screen.findByRole('button', { name: /resend verification link/i }));

    expect(resendToken).toHaveBeenCalledWith(verificationToken);
    expect(
      await screen.findByText(
        'Please wait 40 seconds before requesting another verification link.',
      ),
    ).toBeInTheDocument();
  });

  it('handles resend ineligible safely and hides the resend action', async () => {
    const user = userEvent.setup();

    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });
    resendTokenMock.mockRejectedValue(
      new ApiError('Token cannot be resent safely', {
        status: 400,
        statusText: 'Bad Request',
        method: 'POST',
        url: '/auth/tokens/token/resend',
        body: {
          error: 'TOKEN_RESEND_INELIGIBLE',
          message: 'Token cannot be resent safely',
          cooldownSeconds: 40,
        },
      }),
    );

    renderVerifyEmailPage();

    await user.click(await screen.findByRole('button', { name: /resend verification link/i }));

    expect(resendToken).toHaveBeenCalledWith(verificationToken);
    expect(
      await screen.findByText(
        'This verification link cannot be resent. Please request a new verification email.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend verification link/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a safe generic message when resend fails unexpectedly', async () => {
    const user = userEvent.setup();

    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });
    resendTokenMock.mockRejectedValue(new Error('Network failure'));

    renderVerifyEmailPage();

    await user.click(await screen.findByRole('button', { name: /resend verification link/i }));

    expect(resendToken).toHaveBeenCalledWith(verificationToken);
    expect(
      await screen.findByText(
        'We could not send a new verification link right now. Please try again later.',
      ),
    ).toBeInTheDocument();
  });

  it('does not crash when token context lookup fails', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockRejectedValue(new Error('Context failed'));

    renderVerifyEmailPage();

    expect(
      await screen.findByText(
        'This verification link has expired. Please request a new verification email.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend verification link/i }),
    ).not.toBeInTheDocument();
  });

  it('never renders the raw token', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });

    renderVerifyEmailPage();

    await screen.findByText(
      'This verification link has expired. Please request a new verification email.',
    );
    expect(screen.queryByText(verificationToken)).not.toBeInTheDocument();
  });

  it('updates verification state after the Strict Mode effect cycle', async () => {
    const verificationRequest = createDeferred<{ state: 'VALID' }>();
    verifyEmailMock.mockReturnValue(verificationRequest.promise);

    renderWithRouter(
      <StrictMode>
        <VerifyEmailPage />
      </StrictMode>,
      {
        initialEntry: `/verify-email?token=${verificationToken}`,
        routePath: '/verify-email',
      },
    );

    expect(screen.getByText('Verifying email address...')).toBeInTheDocument();

    await waitFor(() => {
      expect(verifyEmail).toHaveBeenCalledWith(verificationToken);
    });
    expect(verifyEmailMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(verifyEmailMock.mock.calls.length).toBeLessThanOrEqual(2);

    verificationRequest.resolve({ state: 'VALID' });

    expect(await screen.findByText('Email verified. You can now log in.')).toBeInTheDocument();
  });

  it('shows pending state while verifying the email token', async () => {
    const verificationRequest = createDeferred<{ state: 'VALID' }>();
    verifyEmailMock.mockReturnValue(verificationRequest.promise);

    renderVerifyEmailPage();

    expect(screen.getByText('Verifying email address...')).toBeInTheDocument();

    verificationRequest.resolve({ state: 'VALID' });

    expect(await screen.findByText('Email verified. You can now log in.')).toBeInTheDocument();
  });

  it('shows a token error for revoked verification links', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'REVOKED' });

    renderVerifyEmailPage();

    expect(
      await screen.findByText(
        'This verification link is no longer valid. Please request a new verification email.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a safe generic error when email verification fails unexpectedly', async () => {
    verifyEmailMock.mockRejectedValue(new Error('Verification failed'));

    renderVerifyEmailPage();

    expect(
      await screen.findByText('We could not verify your email right now. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('uses the initial backend cooldown to disable resend', async () => {
    verifyEmailMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 40,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });

    renderVerifyEmailPage();

    const resendButton = await screen.findByRole('button', {
      name: /resend verification link \(40s\)/i,
    });
    expect(resendButton).toBeDisabled();
  });
});
