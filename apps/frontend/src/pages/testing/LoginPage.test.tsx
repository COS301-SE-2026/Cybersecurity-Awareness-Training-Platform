import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../LoginPage';
import { ApiError } from '../../lib/apiClient';

const { navigateMock, loginMock, loginUserMock, resendVerificationMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  loginMock: vi.fn(),
  loginUserMock: vi.fn(),
  resendVerificationMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

vi.mock('../../services/auth.service', () => ({
  loginUser: loginUserMock,
  resendVerification: resendVerificationMock,
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function createLoginApiError(status: number, errorCode: string) {
  return new ApiError(errorCode, {
    status,
    statusText: 'Error',
    method: 'POST',
    url: 'http://localhost:4000/auth/login',
    body: {
      error: errorCode,
      message: errorCode,
    },
  });
}

const successfulAuthResponse = {
  accessToken: 'demo-token',
  token: 'demo-token',
  user: {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'trainee@example.com',
    userType: 'GENERAL_TRAINEE',
    authStatus: 'ACTIVE',
    traineeProfile: null,
    adminProfile: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  context: {
    user: {
      id: 'user-1',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
    },
    role: 'GENERAL_TRAINEE',
    organisation: null,
    permissions: ['GENERAL_TRAINEE'],
    redirectTo: '/trainee/campaigns',
  },
  permissions: ['GENERAL_TRAINEE'],
  redirectTo: '/trainee/campaigns',
  expiresAt: '2026-01-01T01:00:00.000Z',
  sessionExpiresAt: '2026-01-08T00:00:00.000Z',
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginUserMock.mockReset();
    resendVerificationMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows validation errors before submitting invalid credentials', async () => {
    const user = userEvent.setup();

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(screen.getByText('Please Enter A Valid Email Address')).toBeInTheDocument();
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it('uses the responsive light auth frame', () => {
    renderLoginPage();

    expect(screen.getByRole('main')).toHaveClass(
      'min-h-screen',
      'overflow-y-auto',
      'bg-light-purple',
      'lg:flex-row',
    );
  });

  it('logs the trainee in and routes to campaigns after a successful login', async () => {
    const user = userEvent.setup();

    loginUserMock.mockResolvedValue(successfulAuthResponse);

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), '  TRAINEE@example.com  ');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledTimes(1);
      expect(loginMock).toHaveBeenCalledWith(successfulAuthResponse);
      expect(navigateMock).toHaveBeenCalledWith('/campaigns');
    });

    expect(loginUserMock).toHaveBeenCalledWith({
      email: 'trainee@example.com',
      password: 'legacy-password',
      rememberMe: false,
    });
  });

  it('logs the platform admin in and routes to /platform-administrators after a successful login', async () => {
    const user = userEvent.setup();

    const platformAdminAuthResponse = {
      ...successfulAuthResponse,
      user: {
        ...successfulAuthResponse.user,
        userType: 'IP_ADMIN',
      },
      context: {
        ...successfulAuthResponse.context,
        role: 'IP_ADMIN',
        redirectTo: '/platform-administrators',
      },
      redirectTo: '/platform-administrators',
    };

    loginUserMock.mockResolvedValue(platformAdminAuthResponse);

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/platform-administrators');
    });
  });

  it('logs the organisation admin in and routes to /organisation-information after a successful login', async () => {
    const user = userEvent.setup();

    const orgAdminAuthResponse = {
      ...successfulAuthResponse,
      user: {
        ...successfulAuthResponse.user,
        userType: 'ORGANISATION_ADMIN',
      },
      context: {
        ...successfulAuthResponse.context,
        role: 'ORGANISATION_ADMIN',
        redirectTo: '/organisation-information',
      },
      redirectTo: '/organisation-information',
    };

    loginUserMock.mockResolvedValue(orgAdminAuthResponse);

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'orgadmin@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/organisation-information');
    });
  });

  it('submits remember me when selected', async () => {
    const user = userEvent.setup();

    loginUserMock.mockResolvedValue(successfulAuthResponse);

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByLabelText(/remember me/i));
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledWith({
        email: 'trainee@example.com',
        password: 'legacy-password',
        rememberMe: true,
      });
    });
  });

  it('shows an invalid-credentials message when the backend returns 401', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(
      new ApiError('Invalid credentials', {
        status: 401,
        statusText: 'Unauthorized',
        method: 'POST',
        url: 'http://localhost:4000/auth/login',
      }),
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(await screen.findByText('Invalid email address or password.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows an email verification message when the backend requires verification', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByText('Email address must be verified before signing in.'),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows a disabled account message when the backend returns USER_DISABLED', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_DISABLED'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByText('This account is disabled. Please contact support.'),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows an organisation status message when the backend returns ORGANISATION_SUSPENDED', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'ORGANISATION_SUSPENDED'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByText(
        'Your organisation account is not active. Please contact your organisation administrator.',
      ),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows a validation-style message when the backend returns VALIDATION_ERROR', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(400, 'VALIDATION_ERROR'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(await screen.findByText('Please check your login details.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows a validation-style message when the backend returns 422', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(422, 'VALIDATION_ERROR'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(await screen.findByText('Please check your login details.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows a rate-limit message when the backend returns AUTH_RATE_LIMITED', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(429, 'AUTH_RATE_LIMITED'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByText('Too many login attempts. Please try again later.'),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows a safe generic message when the backend returns 404', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(404, 'AUTH_NOT_FOUND'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(await screen.findByText('Unable to sign in. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/email not found/i)).not.toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows a safe conflict message when the backend returns 409', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(409, 'AUTH_CONFLICT'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByText('We could not complete sign in right now. Please try again.'),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows the resend verification action when email is not verified', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByText('Email address must be verified before signing in.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('does not show the resend verification action for invalid credentials', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(401, 'AUTH_INVALID'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(await screen.findByText('Invalid email address or password.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend verification email/i }),
    ).not.toBeInTheDocument();
  });

  it('resends verification with the normalized failed-login email even if the input changes', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));
    resendVerificationMock.mockResolvedValue({ success: true });

    renderLoginPage();

    const emailInput = screen.getByLabelText(/email address/i);

    await user.type(emailInput, '  Trainee@Example.COM  ');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    await screen.findByRole('button', { name: /resend verification email/i });

    await user.clear(emailInput);
    await user.type(emailInput, 'changed@example.com');
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    expect(resendVerificationMock).toHaveBeenCalledWith({
      email: 'trainee@example.com',
    });
    expect(resendVerificationMock).not.toHaveBeenCalledWith({
      email: 'changed@example.com',
    });
  });

  it('clears the resend verification action on a new non-verification login failure', async () => {
    const user = userEvent.setup();

    loginUserMock
      .mockRejectedValueOnce(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'))
      .mockRejectedValueOnce(createLoginApiError(401, 'AUTH_INVALID'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(
      await screen.findByRole('button', { name: /resend verification email/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Log In/i }));

    expect(await screen.findByText('Invalid email address or password.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend verification email/i }),
    ).not.toBeInTheDocument();
    expect(resendVerificationMock).not.toHaveBeenCalled();
  });

  it('disables the resend verification action while the request is pending', async () => {
    const user = userEvent.setup();
    let resolveResend: (value: { success: boolean }) => void = () => {};

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));
    resendVerificationMock.mockReturnValue(
      new Promise((resolve) => {
        resolveResend = resolve;
      }),
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));

    const resendButton = await screen.findByRole('button', {
      name: /resend verification email/i,
    });

    await user.click(resendButton);

    expect(resendButton).toBeDisabled();
    expect(resendButton).toHaveTextContent('Sending...');

    resolveResend({ success: true });

    expect(
      await screen.findByText(
        'If the email is registered and unverified, a verification link has been queued for delivery.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a safe confirmation after resend verification succeeds', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));
    resendVerificationMock.mockResolvedValue({ success: true });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));
    await user.click(await screen.findByRole('button', { name: /resend verification email/i }));

    expect(
      await screen.findByText(
        'If the email is registered and unverified, a verification link has been queued for delivery.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a cooldown message when resend verification is rate limited', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));
    resendVerificationMock.mockRejectedValue(createLoginApiError(429, 'AUTH_RATE_LIMITED'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));
    await user.click(await screen.findByRole('button', { name: /resend verification email/i }));

    expect(
      await screen.findByText('Please wait before requesting another verification email.'),
    ).toBeInTheDocument();
  });

  it('shows a generic safe message when resend verifcation fails', async () => {
    const user = userEvent.setup();

    loginUserMock.mockRejectedValue(createLoginApiError(403, 'USER_EMAIL_NOT_VERIFIED'));
    resendVerificationMock.mockRejectedValue(new Error('Network failure'));

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /Log In/i }));
    await user.click(await screen.findByRole('button', { name: /resend verification email/i }));

    expect(
      await screen.findByText(
        'We could not send a verification email right now. Please try again later.',
      ),
    ).toBeInTheDocument();
  });
});
