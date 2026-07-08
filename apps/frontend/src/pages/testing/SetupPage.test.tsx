import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/apiClient';
import { renderWithRouter } from '../../testing/render';
import { completeSetupWithToken, getSetupTokenContext } from '../../services/auth.service';
import SetupPage from '../SetupPage';

const { getSetupTokenContextMock, completeSetupWithTokenMock } = vi.hoisted(() => ({
  getSetupTokenContextMock: vi.fn(),
  completeSetupWithTokenMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  getSetupTokenContext: getSetupTokenContextMock,
  completeSetupWithToken: completeSetupWithTokenMock,
}));

const setupToken = 'exampleSetupTokenValuewithAtLeast32Chars';
const strongPassword = 'ThisIsA$StrongPassword!301301!';

function renderSetupPage() {
  return renderWithRouter(<SetupPage />, {
    initialEntry: `/setup/token/${setupToken}`,
    routePath: '/setup/token/:token',
  });
}

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSetupTokenContextMock.mockResolvedValue({
      token: {
        state: 'VALID',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
      },
      targetEmail: 'invitee@example.com',
      targetFirstName: 'Jane',
      targetLastName: 'Doe',
      role: 'ORGANISATION_TRAINEE',
      organisationName: 'Example Organisation',
    });

    completeSetupWithTokenMock.mockResolvedValue({
      user: {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'invitee@example.com',
        userType: 'ORGANISATION_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads setup token context and disable the authoritative email input', async () => {
    renderSetupPage();

    expect(getSetupTokenContext).toHaveBeenCalledWith(setupToken);
    expect(await screen.findByDisplayValue('invitee@example.com')).toBeDisabled();
    expect(screen.getByText('Organisation Trainee for Example Organisation')).toBeInTheDocument();
  });

  it('blocks submit when password and confirm password do not match', async () => {
    const user = userEvent.setup();

    renderSetupPage();

    await screen.findByDisplayValue('invitee@example.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    expect(screen.getByText('Password Confirmation Must Match Password')).toBeInTheDocument();
    expect(completeSetupWithToken).not.toHaveBeenCalled();
  });

  it('completes setup without sending email and with confirmPassword', async () => {
    const user = userEvent.setup();

    renderSetupPage();

    await screen.findByDisplayValue('invitee@example.com');
    await user.clear(screen.getByLabelText(/first name\(s\)/i));
    await user.type(screen.getByLabelText(/first name\(s\)/i), 'Janet');
    await user.clear(screen.getByLabelText(/last name/i));
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), strongPassword);
    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    expect(completeSetupWithToken).toHaveBeenCalledWith(setupToken, {
      firstName: 'Janet',
      lastName: 'Doe',
      password: strongPassword,
      confirmPassword: strongPassword,
    });
    expect(completeSetupWithTokenMock.mock.calls[0][1]).not.toHaveProperty('email');
    expect(completeSetupWithTokenMock.mock.calls[0][1]).toHaveProperty(
      'confirmPassword',
      strongPassword,
    );
    expect(await screen.findByText('Setup complete. You can now log in.')).toBeInTheDocument();
  });

  it.each([
    [401, 'This setup link is invalid. Please request a new invitation.'],
    [403, 'This organisation is not currently accepting setup requests. Please contact support.'],
    [404, 'This setup link is invalid. Please request a new invitation.'],
    [
      409,
      'This invitation cannot be completed because the account already has a conflicting role.',
    ],
    [422, 'Please choose a password that meets the password requirements.'],
    [429, 'Too many attempts. Please wait a moment and try again.'],
  ])('shows a safe setup error for status %s', async (status, message) => {
    getSetupTokenContextMock.mockRejectedValue(
      new ApiError('Setup failed', {
        status,
        statusText: 'Error',
        method: 'GET',
        url: 'setup/toke/context',
      }),
    );

    renderSetupPage();

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('shows a safe generic setup message for network failures', async () => {
    getSetupTokenContextMock.mockRejectedValue(new Error('Network failure'));

    renderSetupPage();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});
