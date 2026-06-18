import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../LoginPage';

const navigateMock = vi.fn();
const loginMock = vi.fn();
const fetchMock = vi.fn();

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

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
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
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs the trainee in and routes to campaigns after a successful login', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'demo-token',
        user: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'trainee@example.com',
        },
      }),
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), '  TRAINEE@example.com  ');
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(loginMock).toHaveBeenCalledWith('demo-token', {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'trainee@example.com',
      });
      expect(navigateMock).toHaveBeenCalledWith('/campaigns');
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/auth/login');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(requestInit?.body).toBeTypeOf('string');

    expect(JSON.parse(requestInit.body as string)).toEqual({
      email: 'trainee@example.com',
      password: 'legacy-password',
    });
  });

  it('shows an invalid-credentials message when the backend returns 401', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        message: 'Invalid credentials',
      }),
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('INVALID EMAIL OR PASSWORD')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
