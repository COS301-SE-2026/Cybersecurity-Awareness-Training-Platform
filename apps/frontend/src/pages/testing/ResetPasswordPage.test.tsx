import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

import ResetPasswordPage from '../ResetPasswordPage';
import { resetPassword, getTokenContext } from '../../services/auth.service';
import { createDeferred, renderWithRouter } from '../../testing/render';
import { ApiError } from '../../lib/apiClient';

const { getTokenContextMock, resetPasswordMock } = vi.hoisted(() => ({
  getTokenContextMock: vi.fn(),
  resetPasswordMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  getTokenContext: getTokenContextMock,
  resetPassword: resetPasswordMock,
}));

const resetToken = 'exampleResetTokenValueWithAtLeast32Characters';
const validPassword = 'NewSecurePassword1!';
const differentValidPassword = 'DifferentSecurePassword2!';

const validTokenContext = {
  tokenState: 'VALID' as const,
  canResend: false,
  resendCooldownSeconds: 0,
  messageCode: 'TOKEN_VALID',
  flow: 'PASSWORD_RESET' as const,
};

function renderResetPasswordPage(initialEntry = `/reset-password?token=${resetToken}`) {
  return renderWithRouter(<ResetPasswordPage />, {
    initialEntry,
    routePath: '/reset-password',
  });
}

function createResetApiError(status: number, body: unknown, statusText = 'Request Failed') {
  return new ApiError('Reset password failed', {
    status,
    statusText,
    method: 'POST',
    url: 'http://localhost:4000/auth/reset-password',
    body,
  });
}

async function showResetForm() {
  renderResetPasswordPage();

  return screen.findByLabelText('New Password');
}

async function fillValidPasswords(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('New Password'), validPassword);
  await user.type(screen.getByLabelText('Confirm New Password'), validPassword);
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTokenContextMock.mockResolvedValue(validTokenContext);
    resetPasswordMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads valid token context before showing the reset form', async () => {
    const contextRequest = createDeferred<typeof validTokenContext>();

    getTokenContextMock.mockReturnValueOnce(contextRequest.promise);

    renderResetPasswordPage();

    expect(screen.getByText('Validating password reset link...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset Password' })).not.toBeInTheDocument();
    expect(getTokenContext).toHaveBeenCalledWith(resetToken);

    contextRequest.resolve(validTokenContext);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
    });
  });

  it('shows an invalid-link state without loading context when the token is missing', () => {
    renderResetPasswordPage('/reset-password');

    expect(getTokenContext).not.toHaveBeenCalled();
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reset Password' })).not.toBeInTheDocument();
    expect(screen.getByText('This password reset link is missing a token.')).toBeInTheDocument();
  });

  it.each([
    ['INVALID', 'PASSWORD_RESET', 'This password reset link is invalid.'],
    ['EXPIRED', 'PASSWORD_RESET', 'This password reset link has expired.'],
    ['USED', 'PASSWORD_RESET', 'This password reset link has already been used.'],
    ['VALID', 'EMAIL_VERIFICATION', 'This password reset link is invalid.'],
    ['REVOKED', 'PASSWORD_RESET', 'This password reset link is no longer valid.'],
  ])('hides the form for %s context in the %s flow', async (tokenState, flow, expectedMessage) => {
    getTokenContextMock.mockResolvedValueOnce({
      tokenState,
      canResend: false,
      resendCooldownSeconds: 0,
      messageCode: `TOKEN_${tokenState}`,
      flow,
    });

    renderResetPasswordPage();

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'RESET_TOKEN_INVALID', 'This password reset link is invalid.'],
    [401, 'RESET_TOKEN_EXPIRED', 'This password reset link has expired.'],
    [409, 'RESET_TOKEN_USED', 'This password reset link has already been used.'],
    [401, 'RESET_TOKEN_REVOKED', 'This password reset link is no longer valid.'],
  ])('maps %s %s to a terminal state', async (status, code, expectedMessage) => {
    const user = userEvent.setup();
    resetPasswordMock.mockRejectedValueOnce(
      createResetApiError(status, {
        error: code,
        message: 'Raw backend wording',
      }),
    );

    await showResetForm();
    await fillValidPasswords(user);
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });

  it('maps one backend validation response to both password fields', async () => {
    const user = userEvent.setup();
    resetPasswordMock.mockRejectedValueOnce(
      createResetApiError(422, {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: [
          { field: 'newPassword', message: 'Backend password error' },
          { field: 'confirmNewPassword', message: 'Backend confirmation error' },
        ],
      }),
    );

    await showResetForm();
    await fillValidPasswords(user);
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByText('Backend password error')).toBeInTheDocument();
    expect(screen.getByText('Backend confirmation error')).toBeInTheDocument();
  });

  it('prevents duplicate submission and permits retry after failure', async () => {
    const user = userEvent.setup();
    const firstRequest = createDeferred<{ success: true }>();
    resetPasswordMock
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce({ success: true });

    await showResetForm();
    await fillValidPasswords(user);

    const submitButton = screen.getByRole('button', { name: 'Reset Password' });
    const form = submitButton.closest('form');

    if (!form) throw new Error('Expected reset-password form');

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(resetPassword).toHaveBeenCalledTimes(1);

    firstRequest.reject(new Error('Temporary failure'));

    expect(
      await screen.findByText(
        'We could not reset your password right now. Please try again later.',
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset Password' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(resetPassword).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByText(
        'Your password has been updated. Please log in again using your new password.',
      ),
    ).toBeInTheDocument();
  });

  it('submits the exact reset payload and waits for success', async () => {
    const user = userEvent.setup();
    const resetRequest = createDeferred<{ success: true }>();

    resetPasswordMock.mockReturnValue(resetRequest.promise);

    await showResetForm();
    await fillValidPasswords(user);
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(resetPassword).toHaveBeenCalledWith({
      token: resetToken,
      newPassword: validPassword,
      confirmNewPassword: validPassword,
    });

    expect(
      screen.queryByText(
        'Your password has been updated. Please log in again using your new password.',
      ),
    ).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Resetting Password...' })).toBeDisabled();

    resetRequest.resolve({ success: true });

    expect(
      await screen.findAllByText(
        'Your password has been updated. Please log in again using your new password.',
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ['weak password', 'weak', 'weak', 'Password must be at least 12 characters long'],
    [
      'confirmation mismatch',
      validPassword,
      differentValidPassword,
      'Password confirmation must match password.',
    ],
  ])(
    'shows a field error for %s',
    async (_caseName, newPassword, confirmation, expectedMessage) => {
      const user = userEvent.setup();

      await showResetForm();
      await user.type(screen.getByLabelText('New Password'), newPassword);
      await user.type(screen.getByLabelText('Confirm New Password'), confirmation);
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
      expect(resetPassword).not.toHaveBeenCalled();
    },
  );
});
