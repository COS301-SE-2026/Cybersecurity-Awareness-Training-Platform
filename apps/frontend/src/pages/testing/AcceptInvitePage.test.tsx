import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AcceptInvitePage from '../AcceptInvitePage';
import { renderWithRouter } from '../../testing/render';
import * as invitationService from '../../services/invitation.service';
import { ApiError } from '../../lib/apiClient';

vi.mock('../../services/invitation.service', () => ({
  getInvitationContext: vi.fn(),
  acceptInvitation: vi.fn(),
  rejectInvitation: vi.fn(),
}));

const testToken = 'test-token-12345678901234567890123456789012';

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state while fetching context', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthLoading: false },
    });

    expect(
      screen.getByRole('heading', { name: /Validating Invitation\.\.\./i }),
    ).toBeInTheDocument();
  });

  it('waits for isAuthLoading before loading context', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'LOGIN_REQUIRED',
      rejectAllowed: true,
      status: 'PENDING',
    });

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthLoading: true },
    });

    expect(invitationService.getInvitationContext).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: /Validating Invitation\.\.\./i }),
    ).toBeInTheDocument();
  });

  it('redirects CONTINUE_SETUP requiredAction to /setup/token/:token without accepting', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'CONTINUE_SETUP',
      rejectAllowed: false,
      status: 'PENDING',
    });

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      routePath: '/accept-invite',
      auth: { isAuthLoading: false },
    });

    await waitFor(() => {
      expect(invitationService.getInvitationContext).toHaveBeenCalledWith(testToken);
      expect(invitationService.acceptInvitation).not.toHaveBeenCalled();
    });
  });

  it('renders LOGIN_REQUIRED state with neutral wording and login button', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'LOGIN_REQUIRED',
      rejectAllowed: true,
      status: 'PENDING',
    });

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthenticated: false, user: null, isAuthLoading: false },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Authentication Required/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Log In to Continue/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/@/i)).not.toBeInTheDocument();
  });

  it('renders SWITCH_ACCOUNT state with neutral wording and signed-in account info', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'SWITCH_ACCOUNT',
      rejectAllowed: true,
      status: 'PENDING',
    });

    const logoutMock = vi.fn(async () => {});

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: {
        isAuthenticated: true,
        isAuthLoading: false,
        user: {
          id: 'u1',
          email: 'wronguser@example.com',
          firstName: 'Wrong',
          lastName: 'User',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          traineeProfile: null,
          adminProfile: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        logout: logoutMock,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wrong Account Signed In/i })).toBeInTheDocument();
      expect(
        screen.getByText(
          /This invitation cannot be accepted using the currently signed-in account/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('wronguser@example.com')).toBeInTheDocument();
    });

    const switchBtn = screen.getByRole('button', { name: /Sign Out & Switch Account/i });
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
    });
  });

  it('renders CONFIRM_ROLE_CHANGE details and executes accept flow with logout on REAUTHENTICATE', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'CONFIRM_ROLE_CHANGE',
      rejectAllowed: true,
      status: 'PENDING',
      invitationType: 'PLATFORM_ADMIN',
      roleGranted: 'PLATFORM_ADMIN',
    });

    const logoutMock = vi.fn(async () => {});

    vi.spyOn(invitationService, 'acceptInvitation').mockResolvedValue({
      success: true,
      message: 'Invitation accepted successfully.',
      roleGranted: 'PLATFORM_ADMIN',
      sessionOutcome: 'REAUTHENTICATE',
    });

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: {
        isAuthenticated: true,
        isAuthLoading: false,
        user: {
          id: 'u2',
          email: 'targetuser@example.com',
          firstName: 'Target',
          lastName: 'User',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          traineeProfile: null,
          adminProfile: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        logout: logoutMock,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Accept Invitation$/i })).toBeInTheDocument();
    });

    const acceptBtn = screen.getByRole('button', { name: /Accept Invite/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(invitationService.acceptInvitation).toHaveBeenCalledWith(testToken, {
        confirmRoleChange: true,
      });
      expect(
        screen.getByRole('heading', { name: /Invitation Successfully Accepted/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed to Login/i })).toBeInTheDocument();
    });

    const proceedBtn = screen.getByRole('button', { name: /Proceed to Login/i });
    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
    });
  });

  it('executes reject flow when decline is clicked and rejectAllowed is true', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'CONFIRM_ROLE_CHANGE',
      rejectAllowed: true,
      status: 'PENDING',
      invitationType: 'ORGANISATION_ADMIN_PROMOTION',
      roleGranted: 'ORGANISATION_ADMIN',
      organisationName: 'CyberCorp (Pty) Ltd',
    });

    vi.spyOn(invitationService, 'rejectInvitation').mockResolvedValue({
      success: true,
      message: 'Invitation rejected.',
    });

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: {
        isAuthenticated: true,
        isAuthLoading: false,
        user: {
          id: 'u2',
          email: 'targetuser@example.com',
          firstName: 'Target',
          lastName: 'User',
          userType: 'ORGANISATION_TRAINEE',
          authStatus: 'ACTIVE',
          traineeProfile: null,
          adminProfile: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Decline Invite/i })).toBeInTheDocument();
    });

    const declineBtn = screen.getByRole('button', { name: /Decline Invite/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(invitationService.rejectInvitation).toHaveBeenCalledWith(testToken, {
        rejectionReason: 'User declined invitation',
      });
      expect(screen.getByRole('heading', { name: /Invitation Declined/i })).toBeInTheDocument();
    });
  });

  it('renders clear message for ORGANISATION_SUSPENDED conflict error', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockRejectedValue(
      new ApiError('Organisation suspended', {
        status: 409,
        statusText: 'Conflict',
        method: 'GET',
        url: '/context',
        body: { error: 'ORGANISATION_SUSPENDED', message: 'Organisation is suspended.' },
      }),
    );

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthLoading: false },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Organisation Suspended/i })).toBeInTheDocument();
      expect(screen.getByText(/organisation is currently suspended/i)).toBeInTheDocument();
    });
  });

  it('renders clear message for ROLE_CONFLICT error', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockRejectedValue(
      new ApiError('Role conflict', {
        status: 409,
        statusText: 'Conflict',
        method: 'GET',
        url: '/context',
        body: { error: 'ROLE_CONFLICT', message: 'Incompatible role transition.' },
      }),
    );

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthLoading: false },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Role Conflict/i })).toBeInTheDocument();
      expect(
        screen.getByText(/cannot be accepted using your current account role configuration/i),
      ).toBeInTheDocument();
    });
  });

  it('shows matching revoked title and body copy in the result modal', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'CONFIRM_ROLE_CHANGE',
      rejectAllowed: true,
      status: 'PENDING',
      invitationType: 'PLATFORM_ADMIN',
      roleGranted: 'PLATFORM_ADMIN',
    });
    vi.spyOn(invitationService, 'acceptInvitation').mockRejectedValue(
      new ApiError('Invitation revoked', {
        status: 409,
        statusText: 'Conflict',
        method: 'POST',
        url: '/accept',
        body: { error: 'INVITATION_REVOKED', message: 'Invitation has been revoked.' },
      }),
    );

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthLoading: false },
    });

    fireEvent.click(await screen.findByRole('button', { name: /Accept Invite/i }));

    await waitFor(() => {
      expect(document.querySelector('#select-modal')).not.toBeNull();
    });

    const modal = document.querySelector('#select-modal') as HTMLElement;
    expect(within(modal).getByRole('heading', { name: 'Invitation Revoked' })).toBeInTheDocument();
    expect(
      within(modal).getByText(
        'This invitation cannot be accepted because the organisation revoked it.',
      ),
    ).toBeInTheDocument();
  });

  it.each([
    [
      'INVITATION_REVOKED',
      'Invitation Revoked',
      'This invitation cannot be accepted because the organisation revoked it.',
    ],
    [
      'INVITATION_EXPIRED',
      'Invitation Expired',
      'This invitation cannot be accepted because its validity period has ended.',
    ],
    [
      'TOKEN_USED',
      'Invitation Already Used',
      'This invitation cannot be accepted because it has already been accepted or otherwise used.',
    ],
    [
      'TOKEN_INVALID',
      'Invitation Invalid',
      'This invitation cannot be accepted because the invitation link is invalid or unavailable.',
    ],
    [
      'INVALID',
      'Invitation Invalid',
      'This invitation cannot be accepted because the invitation link is invalid or unavailable.',
    ],
    [
      'UNRECOGNISED_RESPONSE',
      'Invitation Invalid',
      'This invitation cannot be accepted because the invitation link is invalid or unavailable.',
    ],
  ])('renders accurate privacy-safe copy for %s', async (error, title, message) => {
    vi.spyOn(invitationService, 'getInvitationContext').mockRejectedValue(
      new ApiError('Invitation unavailable', {
        status: 409,
        statusText: 'Conflict',
        method: 'GET',
        url: '/context',
        body: { error, message: 'Invitation unavailable.' },
      }),
    );

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: { isAuthLoading: false },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    expect(screen.queryByText(/CyberCorp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/targetuser/i)).not.toBeInTheDocument();
  });
});
