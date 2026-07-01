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

    expect(screen.getByText('Passwords Do Not Match')).toBeInTheDocument();
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

  it('shows a duplicate-account message when the backend returns 409', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        message: 'Conflict',
      }),
    });

    renderRegisterPage();

    await fillRegistrationForm(user);
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(
      await screen.findByText('An Account With This Email Address Already Exists'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
