import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/apiClient';
import { registerUser, resendVerification } from '../../services/auth.service';
import RegisterPage from '../RegisterPage';

const { navigateMock, registerUserMock, resendVerificationMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  registerUserMock: vi.fn(),
  resendVerificationMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../services/auth.service', () => ({
  registerUser: registerUserMock,
  resendVerification: resendVerificationMock,
}));

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
    registerUserMock.mockReset();
    resendVerificationMock.mockReset();
    registerUserMock.mockResolvedValue({ message: 'Registration accepted' });
    resendVerificationMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
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

    expect(screen.getByText('Please Enter A Valid Email Address')).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('blocks submission when the confirmation password does not match', async () => {
    const user = userEvent.setup();

    renderRegisterPage();

    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(screen.getByText('Password Confirmation Must Match Password')).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('submits the registration details and shows the email verification modal on success', async () => {
    const user = userEvent.setup();

    renderRegisterPage();

    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$StrongPassword!301301!');
    await user.type(screen.getByLabelText(/confirm password/i), 'ThisIsA$StrongPassword!301301!');

    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(registerUser).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'trainee@example.com',
      password: 'ThisIsA$StrongPassword!301301!',
      confirmPassword: 'ThisIsA$StrongPassword!301301!',
    });
    expect(registerUserMock.mock.calls[0][0]).toHaveProperty(
      'confirmPassword',
      'ThisIsA$StrongPassword!301301!',
    );
    expect(
      await screen.findByRole('heading', { name: /Check your Email Inbox/i }),
    ).toBeInTheDocument();
  });

  it('shows a safe message when registration fails with a duplicate email conflict', async () => {
    const user = userEvent.setup();
    registerUserMock.mockRejectedValue(
      new ApiError('Conflict', {
        status: 409,
        statusText: 'Conflict',
        method: 'POST',
        url: '/auth/register',
      }),
    );

    renderRegisterPage();
    await fillRegistrationForm(user);

    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$StrongPassword!301301!');
    await user.type(screen.getByLabelText(/confirm password/i), 'ThisIsA$StrongPassword!301301!');
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText(/An account may already exist/i)).toBeInTheDocument();
  });

  it('shows an error when the server cannot be reached', async () => {
    const user = userEvent.setup();
    registerUserMock.mockRejectedValue(new Error('Network Error'));

    renderRegisterPage();
    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('shows a loading state while the registration request is in progress', async () => {
    const user = userEvent.setup();

    let resolveRegister!: (value: unknown) => void;

    registerUserMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
    );

    renderRegisterPage();
    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(screen.getByRole('button', { name: /Creating Account.../i })).toBeDisabled();

    resolveRegister({ message: 'Registration accepted' });

    await screen.findByRole('heading', { name: /Check your Email Inbox/i });
  });

  it('disables the form fields while the registration request is in progress', async () => {
    const user = userEvent.setup();

    let resolveRegister!: (value: unknown) => void;

    registerUserMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
    );

    renderRegisterPage();
    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(screen.getByLabelText(/first name\(s\)/i)).toBeDisabled();
    expect(screen.getByLabelText(/last name/i)).toBeDisabled();
    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();

    resolveRegister({ message: 'Registration accepted' });

    await screen.findByRole('heading', { name: /Check your Email Inbox/i });
  });

  it('resend verification using the normalised registered email', async () => {
    const user = userEvent.setup();

    renderRegisterPage();
    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    await user.click(
      await screen.findByRole('button', { name: /Resend Email Verification Link/i }),
    );

    await waitFor(
      () => {
        expect(resendVerification).toHaveBeenCalledWith({
          email: 'trainee@example.com',
        });
      },
      { timeout: 3000 },
    );
  });

  it('shows a rate-limit message wehn resend verification is rate limited', async () => {
    const user = userEvent.setup();

    resendVerificationMock.mockRejectedValue(
      new ApiError('Too many attempts', {
        status: 429,
        statusText: 'Too Many Requests',
        method: 'POST',
        url: '/auth/resend-verification',
      }),
    );

    renderRegisterPage();
    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    await user.click(
      await screen.findByRole('button', { name: /Resend Email Verification Link/i }),
    );

    expect(
      await screen.findByText(
        'Too many attempts. Please wait a moment and try again.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });
}); //describe
