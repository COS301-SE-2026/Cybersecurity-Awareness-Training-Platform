import type {
  AuthMeResponseDto,
  DemotePlatformAdminResponseDto,
  InvitePlatformAdminResponseDto,
  PlatformAdminListResponseDto,
  ResendPlatformAdminInviteResponseDto,
} from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from '../../lib/apiClient';
import {
  demotePlatformAdmin,
  getPlatformAdmins,
  invitePlatformAdmin,
  resendPlatformAdminInvite,
  transferSuperAdmin,
} from '../platform-admin.service';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

const token = 'test-access-token';
const userId = '11111111-1111-4111-8111-111111111111';
const inviteId = '22222222-2222-4222-8222-222222222222';

describe('platform-admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists platform administrators', async () => {
    const response: PlatformAdminListResponseDto = {
      admins: [],
      allowedToInvite: true,
      allowedToTransfer: true,
      allowedToDemote: true,
      allowedToResendInvites: true,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(response);

    const result = await getPlatformAdmins(token);

    expect(apiClient.get).toHaveBeenCalledWith('/platform/admins', {
      authToken: token,
    });
    expect(result).toEqual(response);
  });

  it('sends only the supplied invitation request fields', async () => {
    const input = {
      email: 'new-admin@example.com',
    };
    const response: InvitePlatformAdminResponseDto = {
      type: 'new-invite',
      userId,
      email: input.email,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(response);

    const result = await invitePlatformAdmin(input, token);

    expect(apiClient.post).toHaveBeenCalledWith('/platform/admin-invitations', input, {
      authToken: token,
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/platform/admin-invitations',
      {
        email: 'new-admin@example.com',
      },
      {
        authToken: token,
      },
    );
    expect(result).toEqual(response);
  });

  it('preserves confirmUpgrade when supplied by the caller', async () => {
    const input = {
      email: 'existing-user@example.com',
      firstName: 'existing',
      lastName: 'User',
      confirmUpgrade: true,
    };
    const response: InvitePlatformAdminResponseDto = {
      type: 'upgrade-confirmation',
      userId,
      email: input.email,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(response);

    const result = await invitePlatformAdmin(input, token);

    expect(apiClient.post).toHaveBeenCalledWith('/platform/admin-invitations', input, {
      authToken: token,
    });
    expect(result).toEqual(response);
  });

  it('resends an invitation by encoded invite ID without a request body', async () => {
    const response: ResendPlatformAdminInviteResponseDto = {
      success: true,
      emailQueued: true,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(response);

    const result = await resendPlatformAdminInvite('invite/id', token);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/platform/admin-invitations/invite%2Fid/resend',
      undefined,
      {
        authToken: token,
      },
    );
    expect(result).toEqual(response);
  });

  it('transfers the super administrator role and returns the auth-me response', async () => {
    const input = {
      targetUserId: userId,
      password: 'current-password',
      confirmation: 'TRANSFER' as const,
    };
    const response: AuthMeResponseDto = {
      user: {
        id: '33333333-3333-4333-8333-333333333333',
        firstName: 'Current',
        lastName: 'Administrator',
        email: 'current-admin@example.com',
        userType: 'IP_ADMIN',
        authStatus: 'ACTIVE',
        createdAt: '2026-08-09T12:00:00.000Z',
      },
      context: {
        user: {
          id: '33333333-3333-4333-8333-333333333333',
          userType: 'IP_ADMIN',
          authStatus: 'ACTIVE',
        },
        role: 'IP_ADMIN',
        organisation: null,
        platformAdminRole: 'NORMAL_ADMIN',
        permissions: [],
        redirectTo: '/platform-administrators',
      },
      permissions: [],
      redirectTo: '/platform-administrators',
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(response);

    const result = await transferSuperAdmin(input, token);

    expect(apiClient.post).toHaveBeenCalledWith('/platform/admins/transfer-super-admin', input, {
      authToken: token,
    });
    expect(result).toBe(response);
  });

  it('demotes a platform administrator by encoded user ID', async () => {
    const input = {
      password: 'current-password',
      confirmation: 'DEMOTE' as const,
    };
    const response: DemotePlatformAdminResponseDto = {
      userId,
      email: 'target-admin@example.com',
      adminStatus: 'DISABLED',
      authStatus: 'ACTIVE',
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(response);

    const result = await demotePlatformAdmin('user/id', input, token);

    expect(apiClient.post).toHaveBeenCalledWith('/platform/admins/user%2Fid/demote', input, {
      authToken: token,
    });
    expect(result).toEqual(response);
  });

  it('rejects malformed responses for runtime-parsed platform admin endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ allowedToInvite: true });

    await expect(getPlatformAdmins(token)).rejects.toMatchObject({
      name: 'ZodError',
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      type: 'unknown-result',
      userId,
      email: 'admin@example.com',
    });

    await expect(invitePlatformAdmin({ email: 'admin@example.com' }, token)).rejects.toMatchObject({
      name: 'ZodError',
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: false,
      emailQueued: true,
    });

    await expect(resendPlatformAdminInvite(inviteId, token)).rejects.toMatchObject({
      name: 'ZodError',
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      email: 'admin@example.com',
      adminStatus: 'DISABLED',
      authStatus: 'ACTIVE',
    });

    await expect(
      demotePlatformAdmin(
        userId,
        {
          password: 'current-password',
          confirmation: 'DEMOTE',
        },
        token,
      ),
    ).rejects.toMatchObject({
      name: 'ZodError',
    });
  });

  it('propogates ApiError without rewriting it', async () => {
    const error = new ApiError('Invitation has already been user', {
      status: 409,
      statusText: 'COnflict',
      method: 'POST',
      url: `/platform/admin-invitations/${inviteId}/resend`,
      body: {
        error: 'INVITATION_ALREADY_USED',
        message: 'Invitation has already been used',
      },
    });
    vi.mocked(apiClient.post).mockRejectedValueOnce(error);

    await expect(resendPlatformAdminInvite(inviteId, token)).rejects.toBe(error);
  });
});
