import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  reserveEmailProviderProfileMutation: vi.fn(),
  updateEmailProviderProfile: vi.fn(),
  deleteEmailProviderProfile: vi.fn(),
}));
const secretStoreMock = vi.hoisted(() => ({
  createEmailProviderCredential: vi.fn(),
  deleteEmailProviderCredential: vi.fn(),
  getEmailProviderCredential: vi.fn(),
  replaceEmailProviderCredential: vi.fn(),
}));
const scopeMock = vi.hoisted(() => ({ requireOrganisationAdminScope: vi.fn() }));

vi.mock('../../src/repositories/email-provider-profile.repository.js', () => repositoryMock);
vi.mock('../../src/services/email-provider-secret-store.js', () => secretStoreMock);
vi.mock('../../src/services/organisation-scope.service.js', () => scopeMock);

const { removeEmailProviderProfile, updateEmailProviderProfile } =
  await import('../../src/services/email-provider-profile.service.js');

const profile = {
  id: '22222222-2222-4222-8222-222222222222',
  organisationId: '11111111-1111-4111-8111-111111111111',
  displayName: 'Primary SMTP',
  status: 'ACTIVE',
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUsername: 'mailer@example.com',
  fromAddress: 'training@example.com',
  fromName: 'Training',
  replyTo: null,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
};

describe('EmailProviderProfileService mutation rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopeMock.requireOrganisationAdminScope.mockResolvedValue(undefined);
    repositoryMock.reserveEmailProviderProfileMutation.mockResolvedValue({
      state: 'RESERVED',
      profile,
    });
    repositoryMock.updateEmailProviderProfile.mockResolvedValue(profile);
    secretStoreMock.getEmailProviderCredential.mockResolvedValue('old-secret');
    secretStoreMock.createEmailProviderCredential.mockResolvedValue(undefined);
    secretStoreMock.deleteEmailProviderCredential.mockResolvedValue(undefined);
    secretStoreMock.replaceEmailProviderCredential.mockResolvedValue(undefined);
  });

  it('restores the active profile and previous secret when a secret update fails', async () => {
    secretStoreMock.replaceEmailProviderCredential.mockRejectedValueOnce(new Error('unavailable'));

    await expect(
      updateEmailProviderProfile('user-1', profile.organisationId, profile.id, {
        credential: 'new-secret',
      }),
    ).rejects.toMatchObject({ error: 'EMAIL_PROVIDER_SECRET_STORE_UNAVAILABLE' });

    expect(secretStoreMock.replaceEmailProviderCredential).toHaveBeenNthCalledWith(2, {
      organisationId: profile.organisationId,
      profileId: profile.id,
      credential: 'old-secret',
    });
    expect(repositoryMock.updateEmailProviderProfile).toHaveBeenCalledWith({
      organisationId: profile.organisationId,
      profileId: profile.id,
      status: 'ACTIVE',
    });
  });

  it('restores the secret and active profile when database removal fails', async () => {
    repositoryMock.deleteEmailProviderProfile.mockRejectedValueOnce(new Error('database failed'));

    await expect(
      removeEmailProviderProfile('user-1', profile.organisationId, profile.id),
    ).rejects.toMatchObject({ error: 'EMAIL_PROVIDER_PROFILE_DELETE_FAILED' });

    expect(secretStoreMock.createEmailProviderCredential).toHaveBeenCalledWith({
      organisationId: profile.organisationId,
      profileId: profile.id,
      credential: 'old-secret',
    });
    expect(repositoryMock.updateEmailProviderProfile).toHaveBeenCalledWith({
      organisationId: profile.organisationId,
      profileId: profile.id,
      status: 'ACTIVE',
    });
  });
});
