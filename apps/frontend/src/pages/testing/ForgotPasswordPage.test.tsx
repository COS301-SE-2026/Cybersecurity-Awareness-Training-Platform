import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { ApiError } from '../../lib/apiClient';
import { createDeferred } from '../../testing/render';
import ForgotPasswordPage from '../ForgotPasswordPage';

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  requestPasswordReset: requestPasswordResetMock,
}));

const successResponse = {
  message: 'If the email is registered, a password reset link has been queued for delivery.',
};

function renderForgotPasswordPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

function createForgotPasswordApiError(status: number, body: unknown) {
  return new ApiError('Forgot-password request failed', {
    status,
    statusText: 'Error',
    method: 'POST',
    url: 'http://localhost:4000/auth/forgot-password',
    body,
  });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    requestPasswordResetMock.mockReset();
    requestPasswordResetMock.mockResolvedValue(successResponse);
  });

  //  Page Renders
  it('renders the page and preserves login navigation', () => {
    renderForgotPasswordPage();

    expect(screen.getByRole('heading', { name: /forgot your password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send password reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
  });

  it.each([
    ['', 'Please enter an email address.'],
    ['not-an-email', 'Please enter a valid email address.'],
  ])('validates the email field for input %j', async (email, expectedMessage) => {
    const user = userEvent.setup();
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);

    if (email) {
      await user.type(emailInput, email);
    }

    await user.click(screen.getByRole('button', { name: /send password reset link/i }));

    const error = screen.getByText(expectedMessage);

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', error.id);
    expect(error).toHaveAttribute('role', 'alert');
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it('submits the normalized email and displays generic success', async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email address/i), '   User@example.COM  ');
    await user.click(screen.getByRole('button', { name: /send password reset link/i }));

    expect(requestPasswordResetMock).toHaveBeenCalledTimes(1);
    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      email: 'user@example.com',
    });

    expect(
      await screen.findByText(
        'If the email is registered, a password reset link has been queued for delivery.',
      ),
    ).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);

    expect(emailInput).toHaveValue('user@example.com');
    expect(emailInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /resend password reset link/i })).toBeEnabled();
  });

  it('disables submission and prevents duplicate requests while pending', async () => {
    const user = userEvent.setup();
    const request = createDeferred<typeof successResponse>();

    requestPasswordResetMock.mockReturnValue(request.promise);
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', {
      name: /send password reset link/i,
    });

    await user.type(emailInput, 'user@example.com');
    await user.dblClick(submitButton);

    expect(requestPasswordResetMock).toHaveBeenCalledTimes(1);
    expect(emailInput).toBeDisabled();

    const pendingButton = screen.getByRole('button', {
      name: /sending password reset link/i,
    });

    expect(pendingButton).toBeDisabled();
    expect(pendingButton.closest('form')).toHaveAttribute('aria-busy', 'true');

    request.resolve(successResponse);

    expect(
      await screen.findByRole('button', { name: /resend password reset link/i }),
    ).toBeEnabled();
  });

  it('resends with the stored normalized email and disables resend while pending', async () => {
    const user = userEvent.setup();
    const resendRequest = createDeferred<typeof successResponse>();

    requestPasswordResetMock
      .mockResolvedValueOnce(successResponse)
      .mockReturnValueOnce(resendRequest.promise);

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);

    await user.type(emailInput, ' User@Example.COM ');
    await user.click(screen.getByRole('button', { name: /send password reset link/i }));

    const resendButton = await screen.findByRole('button', {
      name: /resend password reset link/i,
    });

    expect(emailInput).toHaveValue('user@example.com');
    expect(emailInput).toBeDisabled();

    await user.click(resendButton);

    expect(requestPasswordResetMock).toHaveBeenCalledTimes(2);
    expect(requestPasswordResetMock).toHaveBeenNthCalledWith(1, {
      email: 'user@example.com',
    });
    expect(requestPasswordResetMock).toHaveBeenNthCalledWith(2, {
      email: 'user@example.com',
    });

    expect(screen.getByRole('button', { name: /resending password reset link/i })).toBeDisabled();
    expect(
      screen.queryByText(
        'If the email is registered, a password reset link has been queued for delivery.',
      ),
    ).not.toBeInTheDocument();
    resendRequest.resolve(successResponse);

    expect(
      await screen.findByText(
        'If the email is registered, a password reset link has been queued for delivery.',
      ),
    ).toBeInTheDocument();
  });

  it.each([
    {
      body: {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: [
          { field: 'other', message: 'Ignore this detail.' },
          { field: 'email', message: 'Email address is not accepted.' },
        ],
      },
      expectedMessage: 'Email address is not accepted.',
      hiddenMessage: 'Ignore this detail.',
    },
    {
      body: {
        error: 'VALIDATION_ERROR',
        message: 'Raw backend validation message',
        details: { field: 'email', message: 'Malformed details' },
      },
      expectedMessage: 'Please enter a valid email address.',
      hiddenMessage: 'Raw backend validation message',
    },
  ])('safely maps backend validation details', async ({ body, expectedMessage, hiddenMessage }) => {
    const user = userEvent.setup();

    requestPasswordResetMock.mockRejectedValue(createForgotPasswordApiError(400, body));

    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send password reset link/i }));

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(hiddenMessage)).not.toBeInTheDocument();
  });

  it('maps rate limiting to controlled wording', async () => {
    const user = userEvent.setup();

    requestPasswordResetMock.mockRejectedValue(
      createForgotPasswordApiError(429, {
        error: 'AUTH_RATE_LIMITED',
        message: 'Raw backend rate-limit message',
      }),
    );

    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send password reset link/i }));

    expect(
      await screen.findByText('Please wait before requesting another password reset link.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Raw backend rate-limit message')).not.toBeInTheDocument();
  });

  it.each([
    {
      condition: 'network failure',
      error: new Error('Sensitive network details'),
      rawMessage: 'Sensitive network details',
    },
    {
      condition: 'server failure',
      error: createForgotPasswordApiError(500, {
        error: 'INTERNAL_ERROR',
        message: 'Sensitive server details',
      }),
      rawMessage: 'Sensitive server details',
    },
    {
      condition: 'unexpected endpoint status',
      error: createForgotPasswordApiError(404, {
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Sensitive account details',
      }),
      rawMessage: 'Sensitive account details',
    },
  ])('maps $condition to the controlled generic failure', async ({ error, rawMessage }) => {
    const user = userEvent.setup();

    requestPasswordResetMock.mockRejectedValue(error);
    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send password reset link/i }));

    expect(
      await screen.findByText(
        'We could not request a password reset link right now. Please try again later.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(rawMessage)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'If the email is registered, a password reset link has been queued for delivery.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send password reset link/i })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: /resend password reset link/i }),
    ).not.toBeInTheDocument();
  });

  it('clears stale success when resend fails and keeps the stored email locked', async () => {
    const user = userEvent.setup();

    requestPasswordResetMock.mockResolvedValueOnce(successResponse).mockRejectedValueOnce(
      createForgotPasswordApiError(429, {
        error: 'AUTH_RATE_LIMITED',
        message: 'Raw backend rate-limit message',
      }),
    );

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);

    await user.type(emailInput, ' User@Example.COM ');
    await user.click(screen.getByRole('button', { name: /send password reset link/i }));

    const resendButton = await screen.findByRole('button', {
      name: /resend password reset link/i,
    });

    expect(
      screen.getByText(
        'If the email is registered, a password reset link has been queued for delivery.',
      ),
    ).toBeInTheDocument();
    expect(emailInput).toHaveValue('user@example.com');
    expect(emailInput).toBeDisabled();

    await user.click(resendButton);
    expect(
      await screen.findByText('Please wait before requesting another password reset link.'),
    ).toBeInTheDocument();
    expect(requestPasswordResetMock).toHaveBeenCalledTimes(2);
    expect(requestPasswordResetMock).toHaveBeenNthCalledWith(2, {
      email: 'user@example.com',
    });
    expect(
      screen.queryByText(
        'If the email is registered, a password reset link has been queued for delivery.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Raw backend rate-limit message')).not.toBeInTheDocument();
    expect(emailInput).toHaveValue('user@example.com');
    expect(emailInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /resend password reset link/i })).toBeEnabled();
  });
}); // describe
