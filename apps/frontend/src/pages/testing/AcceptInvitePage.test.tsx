import { screen, waitFor, fireEvent } from '@testing-library/react';
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
      auth: {},
    });

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
      auth: {},
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
      auth: { isAuthenticated: false, user: null },
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

  it('renders CONFIRM_ROLE_CHANGE details and executes accept flow', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockResolvedValue({
      requiredAction: 'CONFIRM_ROLE_CHANGE',
      rejectAllowed: true,
      status: 'PENDING',
      invitationType: 'ORGANISATION_ADMIN_PROMOTION',
      roleGranted: 'ORGANISATION_ADMIN',
      organisationName: 'CyberCorp (Pty) Ltd',
      permissions: ['MANAGE_TRAINEES'],
    });

    vi.spyOn(invitationService, 'acceptInvitation').mockResolvedValue({
      success: true,
      message: 'Invitation accepted successfully.',
      roleGranted: 'ORGANISATION_ADMIN',
      sessionOutcome: 'REFRESH_AUTH_CONTEXT',
    });

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: {
        isAuthenticated: true,
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
      expect(screen.getByRole('heading', { name: /^Accept Invitation$/i })).toBeInTheDocument();
      expect(screen.getByText('CyberCorp (Pty) Ltd')).toBeInTheDocument();
      expect(screen.getByText('Organisation Administrator')).toBeInTheDocument();
      expect(screen.getByText('targetuser@example.com')).toBeInTheDocument();
      expect(screen.getByText('MANAGE_TRAINEES')).toBeInTheDocument();
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

  it('renders privacy-minimised error state when token is invalid or expired', async () => {
    vi.spyOn(invitationService, 'getInvitationContext').mockRejectedValue(
      new ApiError('Token expired', {
        status: 409,
        statusText: 'Conflict',
        method: 'GET',
        url: '/context',
        body: { error: 'INVITATION_EXPIRED', message: 'Invitation action token has expired.' },
      }),
    );

    renderWithRouter(<AcceptInvitePage />, {
      initialEntry: `/accept-invite?token=${testToken}`,
      auth: {},
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Invitation Expired/i })).toBeInTheDocument();
      expect(screen.getByText(/no longer valid/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/CyberCorp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/targetuser/i)).not.toBeInTheDocument();
  });
});
