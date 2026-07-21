import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../../testing/render';
import { resendToken, verifyEmailChange } from '../../services/auth.service';
import ConfirmEmailChangePage from '../ConfirmEmailChangePage';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../lib/apiClient';

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

function renderConfirmEmailChangePage(initialEntry = `/confirm-email-change?token=${changeToken}`) {
  return renderWithRouter(<ConfirmEmailChangePage />, {
    initialEntry,
    routePath: '/confirm-email-change',
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

  it('verifies the email-change token from the query string', async () => {
    renderConfirmEmailChangePage();

    await waitFor(() => {
      expect(verifyEmailChange).toHaveBeenCalledWith(changeToken);
    });
    expect(await screen.findByText('Email change confirmed.')).toBeInTheDocument();
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
        'If the email change is still eligible, a new confirmation link has been sent.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a token error for invalid email-change links', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'INVALID' });

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText('This email change link is invalid. Please request a new link.'),
    ).toBeInTheDocument();
  });

  it('shows a safe generic error when email-change verification fails unexpectedly', async () => {
    verifyEmailChangeMock.mockRejectedValue(new Error('Verification failed'));

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText(
        'We could not confirm your email change right now. Please try again later.',
      ),
    ).toBeInTheDocument();
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
