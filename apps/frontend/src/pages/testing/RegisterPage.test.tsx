import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../RegisterPage';

const navigateMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

async function fillRegistrationForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name\(s\)/i), '  Jane  ');
  await user.type(screen.getByLabelText(/last name/i), '  Doe  ');
  await user.type(screen.getByLabelText(/email address/i), '  TRAINEE@example.com  ');
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows schema validation errors before submitting invalid input', async () => {
    const user = userEvent.setup();

    renderRegisterPage();

    await user.type(screen.getByLabelText(/first name\(s\)/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks submission when the confirmation password does not match', async () => {
    const user = userEvent.setup();

    renderRegisterPage();

    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(screen.getByText('Password confirmation must match password.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits registration details and redirects to login on success', async () => {
    vi.useFakeTimers();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'user-1',
        },
      }),
    });

    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/first name\(s\)/i), {
      target: { value: '  Jane  ' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: '  Doe  ' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: '  TRAINEE@example.com  ' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'StrongPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'StrongPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/auth/register');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.body).toBeTypeOf('string');

    expect(JSON.parse(requestInit.body as string)).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'trainee@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    });

    await vi.runAllTimersAsync();

    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});
