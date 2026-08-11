import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformAdmins } from '../../services/platform-admin.service';
import PlatformAdministratorsPage from '../PlatformAdministratorsPage';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  PlatformAdminListItemDto,
  PlatformAdminListResponseDto,
} from '@insightful-phish/shared';
import { createAuthContextValue, createDeferred } from '../../testing/render';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';

vi.mock('../../services/platform-admin.service', () => ({
  getPlatformAdmins: vi.fn(),
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
const actorId = '11111111-1111-4111-8111-111111111111';

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

function renderPage() {
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
      platformAdminRole: 'SUPER_ADMIN',
      permissions: [],
      redirectTo: '/platform-administrators',
    },
  });

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <PlatformAdministratorsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
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
});
