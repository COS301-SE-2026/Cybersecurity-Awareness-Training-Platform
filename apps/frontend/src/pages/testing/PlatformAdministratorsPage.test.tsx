import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPlatformAdmins,
  invitePlatformAdmin,
  resendPlatformAdminInvite,
  transferSuperAdmin,
  demotePlatformAdmin,
} from '../../services/platform-admin.service';
import PlatformAdministratorsPage from '../PlatformAdministratorsPage';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  type ResendPlatformAdminInviteResponseDto,
  type InvitePlatformAdminResponseDto,
  type PlatformAdminListItemDto,
  type PlatformAdminListResponseDto,
  type AuthMeResponseDto,
  type DemotePlatformAdminResponseDto,
} from '@insightful-phish/shared';
import type { AuthContextType } from '../../context/auth-context';
import { createAuthContextValue, createDeferred } from '../../testing/render';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';
import { ApiError } from '../../lib/apiClient';

vi.mock('../../services/platform-admin.service', () => ({
  getPlatformAdmins: vi.fn(),
  invitePlatformAdmin: vi.fn(),
  resendPlatformAdminInvite: vi.fn(),
  transferSuperAdmin: vi.fn(),
  demotePlatformAdmin: vi.fn(),
}));

vi.mock('flowbite-react', () => ({
  Dropdown: ({ label, children }: Readonly<{ label: ReactNode; children: ReactNode }>) => (
    <div>
      <div>{label}</div>
      {children}
    </div>
  ),
  DropdownItem: ({
    children,
    onClick,
  }: Readonly<{ children: ReactNode; onClick?: () => void }>) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

const mockGetPlatformAdmins = vi.mocked(getPlatformAdmins);
const mockInvitePlatformAdmin = vi.mocked(invitePlatformAdmin);
const mockResendPlatformAdminInvite = vi.mocked(resendPlatformAdminInvite);
const actorId = '11111111-1111-4111-8111-111111111111';
const mockTransferSuperAdmin = vi.mocked(transferSuperAdmin);
const mockDemotePlatformAdmin = vi.mocked(demotePlatformAdmin);

function buildRow(overrides: Partial<PlatformAdminListItemDto> = {}): PlatformAdminListItemDto {
  return {
    id: actorId,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    platformAdminRole: 'SUPER_ADMIN',
    adminStatus: 'ACTIVE',
    authStatus: 'ACTIVE',
    invitationStatus: null,
    inviteId: null,
    allowedActions: {
      canTransferSuperAdmin: false,
      canDemote: false,
      canResendInvite: false,
    },
    ...overrides,
  };
}

function buildResponse(
  admins: PlatformAdminListItemDto[],
  capabilities: Partial<
    Pick<
      PlatformAdminListResponseDto,
      'allowedToInvite' | 'allowedToTransfer' | 'allowedToDemote' | 'allowedToResendInvites'
    >
  > = {},
): PlatformAdminListResponseDto {
  return {
    admins,
    allowedToInvite: true,
    allowedToTransfer: true,
    allowedToDemote: true,
    allowedToResendInvites: true,
    ...capabilities,
  };
}

function renderPage(
  platformAdminRole: 'SUPER_ADMIN' | 'NORMAL_ADMIN' = 'SUPER_ADMIN',
  authOverrides: Partial<AuthContextType> = {},
) {
  const auth = createAuthContextValue({
    token: 'platform-admin-token',
    authContext: {
      user: {
        id: actorId,
        userType: 'IP_ADMIN',
        authStatus: 'ACTIVE',
      },
      role: 'IP_ADMIN',
      organisation: null,
      platformAdminRole,
      permissions: [],
      redirectTo: '/platform-administrators',
    },
    ...authOverrides,
  });

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <PlatformAdministratorsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function createInviteApiError(status: number, error: string, message: string): ApiError {
  return new ApiError(message, {
    status,
    statusText: 'Request Failed',
    method: 'POST',
    url: '/platform/admin-invitations',
    body: { error, message },
  });
}

function createResendApiError(status: number, message: string): ApiError {
  return new ApiError(message, {
    status,
    statusText: 'Request Failed',
    method: 'POST',
    url: '/platform/admin-invitations/invite-id/resend',
    body: { error: 'RESEND_FAILED', message },
  });
}

function createTransferApiError(status: number, error: string, message: string): ApiError {
  return new ApiError(message, {
    status,
    statusText: 'Request Failed',
    method: 'POST',
    url: '/platform/admins/transfer-super-admin',
    body: { error, message },
  });
}

function createDemoteApiError(status: number, error: string, message: string): ApiError {
  return new ApiError(message, {
    status,
    statusText: 'Request Failed',
    method: 'POST',
    url: '/platform/admins/target-user/demote',
    body: { error, message },
  });
}

describe('PlatformAdministratorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the exact loading copy while the request is pending', async () => {
    const deferred = createDeferred<PlatformAdminListResponseDto>();
    mockGetPlatformAdmins.mockReturnValueOnce(deferred.promise);

    renderPage();

    expect(await screen.findByText('Loading platform administrators…')).toBeInTheDocument();

    deferred.resolve(buildResponse([]));

    await waitFor(() => {
      expect(screen.queryByText('Loading platform administrators…')).not.toBeInTheDocument();
    });
  });

  it('renders real rows and the required headings', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([
        buildRow(),
        buildRow({
          id: '22222222-2222-4222-8222-222222222222',
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'grace@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('grace@example.com')).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: 'Administrator' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(mockGetPlatformAdmins).toHaveBeenCalledWith('platform-admin-token');
  });

  it('shows the true-empty message', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(buildResponse([]));

    renderPage();

    expect(
      await screen.findByText('No platform administrators have been added.'),
    ).toBeInTheDocument();
  });

  it('shows the load failure, avoids mock fallback, and retries', async () => {
    mockGetPlatformAdmins.mockRejectedValueOnce(new Error('Network failure')).mockResolvedValueOnce(
      buildResponse([
        buildRow({
          firstName: 'Retry',
          lastName: 'Success',
          email: 'retry@example.com',
        }),
      ]),
    );

    renderPage();

    expect(
      await screen.findByText('Platform administrators could not be loaded. Try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Connor Bell')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Retry Success')).toBeInTheDocument();
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2);
  });

  it('searches only names and email, case-insensitively', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([
        buildRow(),
        buildRow({
          id: '22222222-2222-4222-8222-222222222222',
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'navy@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
        }),
      ]),
    );

    renderPage();
    await screen.findByText('Ada Lovelace');

    const search = screen.getByLabelText('Search Administrators');

    fireEvent.change(search, { target: { value: 'GRACE' } });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'hopper' } });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'grace hopper' } });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'NAVY@EXAMPLE.COM' } });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'ACTIVE' } });
    expect(
      screen.getByText('No platform administrators match your search or filters.'),
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'Super Administrator' } });
    expect(
      screen.getByText('No platform administrators match your search or filters.'),
    ).toBeInTheDocument();
  });

  it('filters known API roles', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([
        buildRow(),
        buildRow({
          id: '22222222-2222-4222-8222-222222222222',
          firstName: 'Normal',
          lastName: 'Admin',
          email: 'normal@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
        }),
      ]),
    );

    renderPage();
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: 'Super Administrator' }));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('Normal Admin')).not.toBeInTheDocument();
  });

  it('maps all authoritative states to the required status labels', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([
        buildRow(),
        buildRow({
          id: '22222222-2222-4222-8222-222222222222',
          firstName: 'Initial',
          lastName: 'Invite',
          email: 'invited@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
          authStatus: 'PENDING_INVITE_SETUP',
          invitationStatus: 'SENT',
          inviteId: '822222222-2222-4222-8222-222222222222',
        }),
        buildRow({
          id: '33333333-3333-4333-8333-333333333333',
          firstName: 'Failed',
          lastName: 'Invite',
          email: 'failed@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
          authStatus: 'PENDING_INVITE_SETUP',
          invitationStatus: 'FAILED_TO_SEND',
          inviteId: '833333333-3333-4333-8333-333333333333',
        }),
        buildRow({
          id: '44444444-4444-44444-84444-444444444444',
          firstName: 'Disabled',
          lastName: 'Admin',
          email: 'disabled@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
          adminStatus: 'DISABLED',
        }),
        buildRow({
          id: '55555555-5555-4555-8555-555555555553',
          firstName: 'Pending',
          lastName: 'Upgrade',
          email: 'upgrade@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
          invitationStatus: 'PENDING_UPGRADE',
          inviteId: '855555555-5553-4555-8555-555555555555',
        }),
        buildRow({
          id: '66666666-6665-4666-8666-666666666663',
          firstName: 'Unkown',
          lastName: 'State',
          email: 'unkown@example.com',
          platformAdminRole: 'NORMAL_ADMIN',
          invitationStatus: 'EXPIRED',
          inviteId: '866666666-6663-4666-8666-666666666666',
        }),
      ]),
    );

    renderPage();
    await screen.findByText('Ada Lovelace');

    expect(screen.getByRole('cell', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Invited' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Failed invitation' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Disabled' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Pending upgrade' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Unknown status' })).toBeInTheDocument();
  });

  it('filters by derived status and shows filtered-empty copy', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(buildResponse([buildRow()]));

    renderPage();
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: 'Pending upgrade' }));

    expect(
      screen.getByText('No platform administrators match your search or filters.'),
    ).toBeInTheDocument();
  });

  it('renders a normal platform administrator as read-only', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([buildRow()], {
        allowedToInvite: false,
        allowedToTransfer: false,
        allowedToDemote: false,
        allowedToResendInvites: false,
      }),
    );

    renderPage('NORMAL_ADMIN');

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent === 'View Insightful Phish platform administrators.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Invite platform administrator' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('uses super-admin subtitle while server capability controls Invite', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([buildRow()], {
        allowedToInvite: false,
        allowedToTransfer: false,
        allowedToDemote: false,
        allowedToResendInvites: false,
      }),
    );
    const firstRender = renderPage('SUPER_ADMIN');

    await screen.findByText('Ada Lovelace');

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'View, invite, and manage Insightful Phish platform administrators.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Invite platform administrator' }),
    ).not.toBeInTheDocument();

    firstRender.unmount();

    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([buildRow()], {
        allowedToInvite: true,
        allowedToTransfer: false,
        allowedToDemote: false,
        allowedToResendInvites: false,
      }),
    );

    renderPage('SUPER_ADMIN');
    expect(
      await screen.findByRole('button', { name: /Invite platform administrator/i }),
    ).toBeInTheDocument();
  });

  it('renders supported actions only on their eligible rows', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([
        buildRow(),
        buildRow({
          id: '22222222-2222-4222-8222-222222222222',
          firstName: 'Resend',
          lastName: 'Target',
          authStatus: 'PENDING_INVITE_SETUP',
          invitationStatus: 'SENT',
          inviteId: '833333333-3333-4333-8333-333333333333',
          allowedActions: {
            canTransferSuperAdmin: false,
            canDemote: false,
            canResendInvite: true,
          },
        }),
        buildRow({
          id: '44444444-4444-44444-84444-444444444444',
          firstName: 'Transfer',
          lastName: 'Target',
          platformAdminRole: 'NORMAL_ADMIN',
          allowedActions: {
            canTransferSuperAdmin: true,
            canDemote: false,
            canResendInvite: false,
          },
        }),
        buildRow({
          id: '55555555-5555-4555-8555-555555555553',
          firstName: 'Demote',
          lastName: 'Target',
          platformAdminRole: 'NORMAL_ADMIN',
          allowedActions: {
            canTransferSuperAdmin: false,
            canDemote: true,
            canResendInvite: false,
          },
        }),
      ]),
    );

    renderPage('SUPER_ADMIN');

    const resendRow = (await screen.findByText('Resend Target')).closest('tr');
    const transferRow = screen.getByText('Transfer Target').closest('tr');
    const demoteRow = screen.getByText('Demote Target').closest('tr');

    expect(resendRow).not.toBeNull();
    expect(transferRow).not.toBeNull();
    expect(demoteRow).not.toBeNull();

    expect(
      within(resendRow!).getByRole('button', { name: 'Resend invitation' }),
    ).toBeInTheDocument();
    expect(
      within(transferRow!).getByRole('button', { name: 'Transfer super administrator role' }),
    ).toBeInTheDocument();
    expect(
      within(demoteRow!).getByRole('button', { name: 'Demote administrator' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('hides unsafe and unsupported controls for an unknown status', async () => {
    mockGetPlatformAdmins.mockResolvedValueOnce(
      buildResponse([
        buildRow({
          adminStatus: 'FUTURE_ADMIN_STATUS',
          inviteId: '833333333-3333-4333-8333-333333333333',
          allowedActions: {
            canTransferSuperAdmin: true,
            canDemote: true,
            canResendInvite: true,
          },
        }),
      ]),
    );

    renderPage('SUPER_ADMIN');

    const unknownStatus = await screen.findByRole('cell', { name: 'Unknown status' });
    const row = unknownStatus.closest('tr');

    expect(row).not.toBeNull();
    expect(
      within(row!).queryByRole('button', { name: 'Resend invitation' }),
    ).not.toBeInTheDocument();
    expect(
      within(row!).queryByRole('button', { name: 'Transfer super administrator role' }),
    ).not.toBeInTheDocument();
    expect(
      within(row!).queryByRole('button', { name: 'Demote administrator' }),
    ).not.toBeInTheDocument();

    expect(screen.queryByText(/Revoke invitation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enable administrator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Disable administrator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Re-enable administrator/i)).not.toBeInTheDocument();
  });

  it('submits one invitation, reloads the list, and shows success feedback', async () => {
    mockGetPlatformAdmins.mockResolvedValue(buildResponse([buildRow()]));
    const invitation = createDeferred<InvitePlatformAdminResponseDto>();
    mockInvitePlatformAdmin.mockReturnValueOnce(invitation.promise);

    renderPage();
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: /Invite platform administrator/ }));
    const inviteDialog = screen.getByRole('dialog', { name: 'Invite platform administrator' });
    expect(inviteDialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText(/Email/)).toHaveFocus();
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: ' NEW.ADMIN@EXAMPLE.COM ' },
    });
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'New' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Admin' },
    });

    const submit = screen.getByRole('button', { name: 'Send invitation' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(mockInvitePlatformAdmin).toHaveBeenCalledTimes(1);
    expect(mockInvitePlatformAdmin).toHaveBeenCalledWith(
      {
        email: 'new.admin@example.com',
        firstName: 'New',
        lastName: 'Admin',
      },
      'platform-admin-token',
    );
    expect(screen.getByRole('button', { name: 'Sending invitation…' })).toBeDisabled();

    invitation.resolve({
      type: 'new-invite',
      userId: '22222222-2222-4222-8222-222222222222',
      email: 'new.admin@example.com',
    });

    expect(
      await screen.findByText('Invitation created for new.admin@example.com.'),
    ).toBeInTheDocument();
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2);
  });

  it('preserves values and resubmits an explicitly confirmed upgrade', async () => {
    mockGetPlatformAdmins.mockResolvedValue(buildResponse([buildRow()]));
    mockInvitePlatformAdmin
      .mockRejectedValueOnce(
        createInviteApiError(
          409,
          'UPGRADE_CONFIRMATION_REQUIRED',
          'Explicit confirmation is required.',
        ),
      )
      .mockResolvedValueOnce({
        type: 'upgrade-confirmation',
        userId: '22222222-2222-4222-8222-222222222222',
        email: 'trainee@example.com',
      });

    renderPage();
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: /Invite platform administrator/ }));
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'trainee@example.com' },
    });
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Existing' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Trainee' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(
      await screen.findByText(
        'An account already exists for this email. Confirm that it should be upgraded to a platform administrator.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveValue('trainee@example.com');
    expect(screen.getByLabelText('First name')).toHaveValue('Existing');
    expect(screen.getByLabelText('Last name')).toHaveValue('Trainee');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm upgrade' }));

    await waitFor(() => {
      expect(mockInvitePlatformAdmin).toHaveBeenLastCalledWith(
        {
          email: 'trainee@example.com',
          firstName: 'Existing',
          lastName: 'Trainee',
          confirmUpgrade: true,
        },
        'platform-admin-token',
      );
    });

    expect(
      await screen.findByText('Invitation created for trainee@example.com.'),
    ).toBeInTheDocument();
  });

  it('does not treat an ordinary conflict as upgradeable', async () => {
    mockGetPlatformAdmins.mockResolvedValue(buildResponse([buildRow()]));
    mockInvitePlatformAdmin.mockRejectedValueOnce(
      createInviteApiError(
        409,
        'EXISTING_PLATFORM_ADMIN',
        'User is already a platform administrator',
      ),
    );

    renderPage();
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: /Invite platform administrator/ }));
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Existing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'User is already a platform administrator',
    );
    expect(screen.getByLabelText(/Email/)).toHaveValue('existing@example.com');
    expect(screen.getByLabelText('First name')).toHaveValue('Existing');
    expect(screen.queryByRole('button', { name: 'Confirm upgrade' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send invitation' })).toBeEnabled();
    expect(mockInvitePlatformAdmin).toHaveBeenCalledTimes(1);
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(1);
  });

  it('resends by inviteId, prevents duplicates, reloads, and shows success', async () => {
    const inviteId = '83333333-3333-4333-8333-333333333333';
    const resendRow = buildRow({
      id: '22222222-2222-4222-8222-222222222222',
      firstName: 'Resend',
      lastName: 'Target',
      email: 'resend@example.com',
      authStatus: 'PENDING_INVITE_SETUP',
      invitationStatus: 'SENT',
      inviteId,
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: false,
        canResendInvite: true,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([resendRow]));
    const resend = createDeferred<ResendPlatformAdminInviteResponseDto>();
    mockResendPlatformAdminInvite.mockReturnValueOnce(resend.promise);

    renderPage();
    const row = (await screen.findByText('Resend Target')).closest('tr');
    const opener = within(row!).getByRole('button', { name: 'Resend invitation' });
    opener.focus();
    fireEvent.click(opener);

    await waitFor(() => {
      expect(screen.getByText('Resend invitation', { selector: 'h3' })).toBeInTheDocument();
    });
    const modal = screen.getByRole('dialog', { name: 'Resend invitation' });
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(within(modal).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Resend invitation?' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Send a new invitation link to resend@example.com? The previous link will no longer be valid.',
      ),
    ).toBeInTheDocument();

    const confirm = within(modal!).getByRole('button', { name: 'Resend invitation' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mockResendPlatformAdminInvite).toHaveBeenCalledTimes(1);
    expect(mockResendPlatformAdminInvite).toHaveBeenCalledWith(inviteId, 'platform-admin-token');
    expect(within(modal!).getByRole('button', { name: 'Processing...' })).toBeDisabled();

    resend.resolve({ success: true, emailQueued: true });

    expect(
      await screen.findByText('A new invitation was queued for resend@example.com.'),
    ).toBeInTheDocument();
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('shows a stale resend error and refreshes the authoritative list', async () => {
    const resendRow = buildRow({
      email: 'stale@example.com',
      authStatus: 'PENDING_INVITE_SETUP',
      invitationStatus: 'SENT',
      inviteId: '83333333-3333-4333-8333-333333333333',
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: false,
        canResendInvite: true,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([resendRow]));
    mockResendPlatformAdminInvite.mockRejectedValueOnce(
      createResendApiError(409, 'This invitation is no longer eligible to be resent.'),
    );

    renderPage();
    const row = (await screen.findByText('Ada Lovelace')).closest('tr');
    fireEvent.click(within(row!).getByRole('button', { name: 'Resend invitation' }));
    await waitFor(() => {
      expect(screen.getByText('Resend invitation', { selector: 'h3' })).toBeInTheDocument();
    });
    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();
    fireEvent.click(within(modal!).getByRole('button', { name: 'Resend invitation' }));

    const updatedModal = await screen.findByRole('dialog', { name: 'Resend invitation' });
    expect(await within(updatedModal).findByRole('alert')).toHaveTextContent(
      'This invitation is no longer eligible to be resent.',
    );
    expect(mockResendPlatformAdminInvite).toHaveBeenCalledTimes(1);
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2);
  });

  it('keeps resend usable after an ordinary error without refreshing', async () => {
    const resendRow = buildRow({
      email: 'limited@example.com',
      authStatus: 'PENDING_INVITE_SETUP',
      invitationStatus: 'SENT',
      inviteId: '83333333-3333-4333-8333-333333333333',
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: false,
        canResendInvite: true,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([resendRow]));
    mockResendPlatformAdminInvite.mockRejectedValueOnce(
      createResendApiError(429, 'Too many resend requests. Please try again later.'),
    );

    renderPage();
    const row = (await screen.findByText('Ada Lovelace')).closest('tr');
    fireEvent.click(within(row!).getByRole('button', { name: 'Resend invitation' }));
    await waitFor(() => {
      expect(screen.getByText('Resend invitation', { selector: 'h3' })).toBeInTheDocument();
    });
    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();
    fireEvent.click(within(modal!).getByRole('button', { name: 'Resend invitation' }));

    const updatedModal = await screen.findByRole('dialog', { name: 'Resend invitation' });
    expect(await within(updatedModal).findByRole('alert')).toHaveTextContent(
      'Too many resend requests. Please try again later.',
    );
    expect(within(updatedModal).getByRole('button', { name: 'Resend invitation' })).toBeEnabled();
    expect(mockResendPlatformAdminInvite).toHaveBeenCalledTimes(1);
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(1);
  });

  it('transfers once, locks stale actions, and refreshes auth before the list', async () => {
    const targetId = '44444444-4444-4444-8444-444444444444';
    const target = buildRow({
      id: targetId,
      firstName: 'Target',
      lastName: 'Name',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: true,
        canDemote: false,
        canResendInvite: false,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));

    const transfer = createDeferred<AuthMeResponseDto>();
    const authRefresh = createDeferred<void>();
    const refreshAuthContext = vi.fn(() => authRefresh.promise);

    mockTransferSuperAdmin.mockReturnValueOnce(transfer.promise);

    renderPage('SUPER_ADMIN', { refreshAuthContext });

    const row = (await screen.findByText('Target Name')).closest('tr');
    fireEvent.click(
      within(row!).getByRole('button', { name: 'Transfer super administrator role' }),
    );

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText('Type TRANSFER to confirm'), {
      target: { value: 'TRANSFER' },
    });

    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();

    const submit = within(modal!).getByRole('button', {
      name: 'Transfer super administrator role',
    });

    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(mockTransferSuperAdmin).toHaveBeenCalledTimes(1);
    expect(mockTransferSuperAdmin).toHaveBeenCalledWith(
      {
        targetUserId: targetId,
        password: 'current-password',
        confirmation: 'TRANSFER',
      },
      'platform-admin-token',
    );

    transfer.resolve({} as AuthMeResponseDto);

    await waitFor(() => expect(refreshAuthContext).toHaveBeenCalledTimes(1));

    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Invite platform administrator' }),
    ).not.toBeInTheDocument();

    authRefresh.resolve();

    expect(
      await screen.findByText('Super administrator role transferred to Target Name.'),
    ).toBeInTheDocument();
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2);
  });

  it('requires a password and exact TRANSFER confirmation', async () => {
    const targetId = '44444444-4444-4444-8444-444444444444';
    const target = buildRow({
      id: targetId,
      firstName: 'Target',
      lastName: 'Name',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: true,
        canDemote: false,
        canResendInvite: false,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));
    renderPage();

    const row = (await screen.findByText('Target Name')).closest('tr');
    fireEvent.click(
      within(row!).getByRole('button', { name: 'Transfer super administrator role' }),
    );

    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();

    const submit = within(modal!).getByRole('button', {
      name: 'Transfer super administrator role',
    });

    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText('Type TRANSFER to confirm'), {
      target: { value: 'transfer' },
    });

    expect(submit).toBeDisabled();
    expect(mockTransferSuperAdmin).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Type TRANSFER to confirm'), {
      target: { value: 'TRANSFER' },
    });

    expect(submit).toBeEnabled();
  });

  it('keeps transfer usable after the verified invalid-password error', async () => {
    const targetId = '44444444-4444-4444-8444-444444444444';
    const target = buildRow({
      id: targetId,
      firstName: 'Target',
      lastName: 'Name',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: true,
        canDemote: false,
        canResendInvite: false,
      },
    });
    const refreshAuthContext = vi.fn();

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));
    mockTransferSuperAdmin.mockRejectedValueOnce(
      createTransferApiError(
        403,
        'PLATFORM_ADMIN_PASSWORD_INVALID',
        'Password confirmation failed',
      ),
    );

    renderPage('SUPER_ADMIN', { refreshAuthContext });

    const row = (await screen.findByText('Target Name')).closest('tr');
    fireEvent.click(
      within(row!).getByRole('button', { name: 'Transfer super administrator role' }),
    );
    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.change(screen.getByLabelText('Type TRANSFER to confirm'), {
      target: { value: 'TRANSFER' },
    });
    fireEvent.click(
      within(modal!).getByRole('button', { name: 'Transfer super administrator role' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Password confirmation failed');
    expect(
      within(modal!).getByRole('button', { name: 'Transfer super administrator role' }),
    ).toBeEnabled();
    expect(mockTransferSuperAdmin).toHaveBeenCalledTimes(1);
    expect(refreshAuthContext).not.toHaveBeenCalled();
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(1);
  });

  it('demotes the selected user once, reloads, and shows eact feedback', async () => {
    const targetId = '55555555-5555-4555-8555-555555555555';
    const target = buildRow({
      id: targetId,
      firstName: 'Demote',
      lastName: 'Target',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: true,
        canResendInvite: false,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));

    const demotion = createDeferred<DemotePlatformAdminResponseDto>();
    mockDemotePlatformAdmin.mockReturnValueOnce(demotion.promise);

    renderPage();

    const row = (await screen.findByText('Demote Target')).closest('tr');
    fireEvent.click(within(row!).getByRole('button', { name: 'Demote administrator' }));

    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText('Type DEMOTE to confirm'), {
      target: { value: 'DEMOTE' },
    });

    const confirm = within(modal!).getByRole('button', {
      name: 'Demote administrator',
    });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mockDemotePlatformAdmin).toHaveBeenCalledTimes(1);
    expect(mockDemotePlatformAdmin).toHaveBeenCalledWith(
      targetId,
      {
        password: 'current-password',
        confirmation: 'DEMOTE',
      },
      'platform-admin-token',
    );

    demotion.resolve({
      userId: targetId,
      email: 'ada@example.com',
      adminStatus: 'DISABLED',
      authStatus: 'ACTIVE',
    });

    expect(
      await screen.findByText('Demote Target is no longer a platform administrator.'),
    ).toBeInTheDocument();
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2);
  });

  it('requires a password and exact DEMOTE confirmation', async () => {
    const targetId = '55555555-5555-4555-8555-555555555555';
    const target = buildRow({
      id: targetId,
      firstName: 'Demote',
      lastName: 'Target',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: true,
        canResendInvite: false,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));
    renderPage();

    const row = (await screen.findByText('Demote Target')).closest('tr');
    fireEvent.click(within(row!).getByRole('button', { name: 'Demote administrator' }));

    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();

    const confirm = within(modal!).getByRole('button', {
      name: 'Demote administrator',
    });

    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText('Type DEMOTE to confirm'), {
      target: { value: 'demote' },
    });

    expect(confirm).toBeDisabled();
    expect(mockDemotePlatformAdmin).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Type DEMOTE to confirm'), {
      target: { value: 'DEMOTE' },
    });

    expect(confirm).toBeEnabled();
  });

  it('keeps demotion usable after the verified invalid-password error', async () => {
    const targetId = '55555555-5555-4555-8555-555555555555';
    const target = buildRow({
      id: targetId,
      firstName: 'Demote',
      lastName: 'Target',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: true,
        canResendInvite: false,
      },
    });
    const refreshAuthContext = vi.fn();

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));
    mockDemotePlatformAdmin.mockRejectedValue(
      createDemoteApiError(403, 'PLATFORM_ADMIN_PASSWORD_INVALID', 'Password confirmation failed'),
    );

    renderPage('SUPER_ADMIN', { refreshAuthContext });

    const row = (await screen.findByText('Demote Target')).closest('tr');
    fireEvent.click(within(row!).getByRole('button', { name: 'Demote administrator' }));

    const modal = document.getElementById('popup-modal');
    expect(modal).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), {
      target: { value: 'wrong-password' },
    });
    fireEvent.change(screen.getByLabelText('Type DEMOTE to confirm'), {
      target: { value: 'DEMOTE' },
    });
    fireEvent.click(within(modal!).getByRole('button', { name: 'Demote administrator' }));

    expect(await within(modal!).findByRole('alert')).toHaveTextContent(
      'Password confirmation failed',
    );
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveValue('wrong-password');
    expect(within(modal!).getByRole('button', { name: 'Demote administrator' })).toBeEnabled();
    expect(mockDemotePlatformAdmin).toHaveBeenCalledTimes(1);
    expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(1);
    expect(refreshAuthContext).not.toHaveBeenCalled();
  });

  it('reloads the list when the demotion target no longer exists', async () => {
    const targetId = '55555555-5555-4555-8555-555555555555';
    const target = buildRow({
      id: targetId,
      firstName: 'Demote',
      lastName: 'Target',
      platformAdminRole: 'NORMAL_ADMIN',
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: true,
        canResendInvite: false,
      },
    });

    mockGetPlatformAdmins.mockResolvedValue(buildResponse([target]));
    mockDemotePlatformAdmin.mockRejectedValueOnce(
      createDemoteApiError(404, 'PLATFORM_ADMIN_NOT_FOUND', 'Platform admin not found'),
    );

    renderPage();
    const row = (await screen.findByText('Demote Target')).closest('tr');
    fireEvent.click(within(row!).getByRole('button', { name: 'Demote administrator' }));

    const modal = screen.getByRole('dialog', { name: 'Demote administrator' });

    fireEvent.change(within(modal).getByLabelText('Password'), {
      target: { value: 'current-password' },
    });
    fireEvent.change(within(modal).getByLabelText('Type DEMOTE to confirm'), {
      target: { value: 'DEMOTE' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Demote administrator' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent('Platform admin not found');
    await waitFor(() => expect(mockGetPlatformAdmins).toHaveBeenCalledTimes(2));
    expect(mockDemotePlatformAdmin).toHaveBeenCalledTimes(1);
  });
});
