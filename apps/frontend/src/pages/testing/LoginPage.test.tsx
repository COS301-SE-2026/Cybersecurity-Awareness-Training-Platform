import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../LoginPage';
import { ApiError } from '../../lib/apiClient';

const { navigateMock, loginMock, loginUserMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  loginMock: vi.fn(),
  loginUserMock: vi.fn(),
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
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
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
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginUserMock.mockReset();
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

    expect(await screen.findByText('Invalid Email Address Or Password')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
