import '@testing-library/jest-dom/vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferred, renderWithRouter } from '../../testing/render';
import { getTokenContext, resendToken, verifyEmailChange } from '../../services/auth.service';
import ConfirmEmailChangePage from '../ConfirmEmailChangePage';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../lib/apiClient';
import type { AuthContextType } from '../../context/auth-context';
import { StrictMode } from 'react';

const { verifyEmailChangeMock, getTokenContextMock, resendTokenMock } = vi.hoisted(() => ({
  verifyEmailChangeMock: vi.fn(),
  getTokenContextMock: vi.fn(),
  resendTokenMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  verifyEmailChange: verifyEmailChangeMock,
  getTokenContext: getTokenContextMock,
  resendToken: resendTokenMock,
}));

const changeToken = 'exampleEmailChangeTokenValueWithAtLeast32Chars';

function renderConfirmEmailChangePage(
  initialEntry = `/confirm-email-change?token=${changeToken}`,
  auth: Partial<AuthContextType> = {},
) {
  return renderWithRouter(<ConfirmEmailChangePage />, {
    initialEntry,
    routePath: '/confirm-email-change',
    auth,
  });
}

describe('ConfirmEmailChangePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmailChangeMock.mockResolvedValue({ state: 'VALID' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: false,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_CHANGE_VERIFICATION',
    });
    resendTokenMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('clears auth once and shows sign-in guidance after successful confirmation', async () => {
    const confirmationRequest = createDeferred<{ state: 'VALID' }>();
    const clearAuth = vi.fn();
    verifyEmailChangeMock.mockReturnValue(confirmationRequest.promise);

    renderWithRouter(
      <StrictMode>
        <ConfirmEmailChangePage />
      </StrictMode>,
      {
        initialEntry: `/confirm-email-change?token=${changeToken}`,
        routePath: '/confirm-email-change',
        auth: { clearAuth },
      },
    );

    await waitFor(() => {
      expect(verifyEmailChange).toHaveBeenCalledTimes(1);
      expect(verifyEmailChange).toHaveBeenCalledWith(changeToken);
    });
    expect(clearAuth).not.toHaveBeenCalled();

    await act(async () => {
      confirmationRequest.resolve({ state: 'VALID' });
      await confirmationRequest.promise;
    });

    expect(
      await screen.findByText(
        'Email change confirmed. Please sign in again using your new email address.',
      ),
    ).toBeInTheDocument();
    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /go to login/i })).toHaveAttribute('href', '/login');
    expect(screen.queryByText(changeToken)).not.toBeInTheDocument();
  });

  it('shows restart guidance for the occupied-email conflict without exposing details', async () => {
    const clearAuth = vi.fn();
    verifyEmailChangeMock.mockRejectedValue(
      new ApiError('The email is already in use by another account.', {
        status: 409,
        statusText: 'Conflicts',
        method: 'POST',
        url: '/account/verify-email-change',
        body: {
          error: 'AUTH_EMAIL_EXISTS',
          message: 'This email is already in use by another account.',
        },
      }),
    );

    renderConfirmEmailChangePage(undefined, { clearAuth });

    expect(
      await screen.findByText(
        'This email address is already in use. Please restart the email-change process.',
      ),
    ).toBeInTheDocument();
    expect(clearAuth).not.toHaveBeenCalled();
    expect(screen.queryByText('AUTH_EMAIL_EXISTS')).not.toBeInTheDocument();
    expect(screen.queryByText(changeToken)).not.toBeInTheDocument();
    expect(screen.queryByText('target@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText(/belongs to|account owns/i)).not.toBeInTheDocument();
  });

  it('shows a token error when the token query parameter is missing', async () => {
    renderConfirmEmailChangePage('/confirm-email-change');

    expect(verifyEmailChange).not.toHaveBeenCalledWith();
    expect(
      await screen.findByText(
        'This email change link is missing a token. Please request a new link.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a safe already-complete message for used email-change links', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'USED' });

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText('This email change link has already been used.'),
    ).toBeInTheDocument();
  });

  it('shows a token error expired email-change links', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'EXPIRED' });

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText('This email change link has expired. Please request a new link.'),
    ).toBeInTheDocument();
  });

  it('does not expose resend for an email-verification token context', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 35,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_VERIFICATION',
    });

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText('This email change link has expired. Please request a new link.'),
    ).toBeInTheDocument();
    expect(getTokenContext).toHaveBeenCalledWith(changeToken);
    expect(
      screen.queryByRole('button', { name: /resend email change link/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('EMAIL_VERIFICATION')).not.toBeInTheDocument();
    expect(screen.queryByText(changeToken)).not.toBeInTheDocument();
    expect(screen.queryByText('target@example.com')).not.toBeInTheDocument();
    expect(resendToken).not.toHaveBeenCalled();
  });

  it('uses email-change resend copy when resend succeeds', async () => {
    const user = userEvent.setup();

    verifyEmailChangeMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_CHANGE_VERIFICATION',
    });
    resendTokenMock.mockResolvedValue({ success: true });

    renderConfirmEmailChangePage();

    await user.click(await screen.findByRole('button', { name: /resend email change link/i }));

    expect(resendToken).toHaveBeenCalledWith(changeToken);
    expect(
      await screen.findByText(
        'If the email change is still eligible, a new confirmation link has been queued for delivery.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a token error for invalid email-change links', async () => {
    const clearAuth = vi.fn();
    verifyEmailChangeMock.mockResolvedValue({ state: 'INVALID' });

    renderConfirmEmailChangePage(undefined, { clearAuth });

    expect(
      await screen.findByText('This email change link is invalid. Please request a new link.'),
    ).toBeInTheDocument();
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('shows a safe generic error when email-change verification fails unexpectedly', async () => {
    const clearAuth = vi.fn();
    verifyEmailChangeMock.mockRejectedValue(new Error('Verification failed'));

    renderConfirmEmailChangePage(undefined, { clearAuth });

    expect(
      await screen.findByText(
        'We could not confirm your email change right now. Please try again later.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'This email address is already in use. Please restart the email-change process.',
      ),
    ).not.toBeInTheDocument();
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('uses email-change cooldown copy when resend is rate limited', async () => {
    const user = userEvent.setup();

    verifyEmailChangeMock.mockResolvedValue({ state: 'EXPIRED' });
    getTokenContextMock.mockResolvedValue({
      tokenState: 'EXPIRED',
      canResend: true,
      resendCooldownSeconds: 0,
      messageCode: 'TOKEN_EXPIRED',
      flow: 'EMAIL_CHANGE_VERIFICATION',
    });
    resendTokenMock.mockRejectedValue(
      new ApiError('resend cooldown active. Please try again later.', {
        status: 429,
        statusText: 'Too Many Request',
        method: 'POST',
        url: '/auth/tokens/token/resend',
        body: {
          error: 'RESEND_COOLDOWN_ACTIVE',
          message: 'Resend cooldown active. Please try again later.',
          cooldownSeconds: 35,
        },
      }),
    );

    renderConfirmEmailChangePage();

    await user.click(await screen.findByRole('button', { name: /resend email change link/i }));

    expect(resendToken).toHaveBeenCalledWith(changeToken);
    expect(
      await screen.findByText(
        'Please wait 35 seconds before requesting another email change link.',
      ),
    ).toBeInTheDocument();
  });

  it('never render the raw email-change token', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'EXPIRED' });

    renderConfirmEmailChangePage();

    await screen.findByText('This email change link has expired. Please request a new link.');
    expect(screen.queryByText(changeToken)).not.toBeInTheDocument();
  });
});
