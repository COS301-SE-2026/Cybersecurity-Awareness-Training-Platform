import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

    expect(screen.getByText('Please Enter A Valid Email Address')).toBeInTheDocument();
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

  it('submits the registration details and shows the email verification modal on success', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'user-1',
        },
      }),
    });

    renderRegisterPage();

    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069',
    );

    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(
      await screen.findByRole('heading', { name: /Check your Email Inbox/i }),
    ).toBeInTheDocument();
  });

  it('shows the backend error message when registration fails', async () => {
    const user = userEvent.setup();

    expect(JSON.parse(requestInit.body as string)).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'trainee@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    });
    renderRegisterPage();
    await fillRegistrationForm(user);

    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText('Registration Failed')).toBeInTheDocument();
  });

  it('shows an error when the server cannot be reached', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new Error('Network Error'));

    renderRegisterPage();
    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'ThisIsA$Gang$StrongPassword!42069!');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'ThisIsA$Gang$StrongPassword!42069!',
    );
    await user.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText('Unable To Connect To The Server')).toBeInTheDocument();
  });

  it('shows a loading state while the registration request is in progress', async () => {
    const user = userEvent.setup();

    let resolveFetch!: (value: unknown) => void;

    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
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

    resolveFetch({
      ok: true,
      json: async () => ({
        user: { id: 'user-1' },
      }),
    });

    await screen.findByRole('heading', { name: /Check your Email Inbox/i });
  });

  it('disables the form fields while the registration request is in progress', async () => {
    const user = userEvent.setup();

    let resolveFetch!: (value: unknown) => void;

    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
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

    resolveFetch({
      ok: true,
      json: async () => ({
        user: { id: 'user-1' },
      }),
    });

    await screen.findByRole('heading', { name: /Check your Email Inbox/i });
  });
}); //describe
