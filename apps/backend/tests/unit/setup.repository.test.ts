import { describe, expect, it, vi } from 'vitest';
import {
  activateOrganisationAdminUser,
  createOrganisationAdminUser,
} from '../../src/repositories/setup.repository.js';

type CreateOrganisationAdminClient = Parameters<typeof createOrganisationAdminUser>[1];
type ActivateOrganisationAdminClient = Parameters<typeof activateOrganisationAdminUser>[1];

function createUserClient() {
  return {
    user: {
      create: vi.fn().mockResolvedValue({ id: 'user-1' }),
    },
  };
}

function createActivationClient() {
  return {
    user: {
      update: vi.fn().mockResolvedValue({ id: 'user-1' }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'user-1' }),
    },
    organisationAdminProfile: {
      // Return null: no pre-existing profile, so the cross-org conflict guard passes.
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'admin-1' }),
    },
  };
}

describe('setup repository organisation admin persistence', () => {
  it('persists initial admin setup metadata when explicitly provided', async () => {
    const client = createUserClient();

    await createOrganisationAdminUser(
      {
        email: 'initial-admin@example.test',
        firstName: 'Initial',
        lastName: 'Admin',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
        isInitialAdmin: true,
        createdFromInvitationId: 'invitation-1',
      },
      client as unknown as CreateOrganisationAdminClient,
    );

    expect(client.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationAdminProfile: {
            create: expect.objectContaining({
              organisationId: 'org-1',
              adminStatus: 'ACTIVE',
              isInitialAdmin: true,
              createdFromInvitationId: 'invitation-1',
            }),
          },
        }),
      }),
    );
  });

  it('defaults organisation admin setup metadata to non-initial values', async () => {
    const client = createUserClient();

    await createOrganisationAdminUser(
      {
        email: 'promoted-admin@example.test',
        firstName: 'Promoted',
        lastName: 'Admin',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
      },
      client as unknown as CreateOrganisationAdminClient,
    );

    expect(client.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationAdminProfile: {
            create: expect.objectContaining({
              isInitialAdmin: false,
              createdFromInvitationId: null,
            }),
          },
        }),
      }),
    );
  });

  it('activates existing admins with initial metadata only when provided', async () => {
    const client = createActivationClient();

    await activateOrganisationAdminUser(
      {
        userId: 'user-1',
        firstName: 'Initial',
        lastName: 'Admin',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
        isInitialAdmin: true,
        createdFromInvitationId: 'invitation-1',
      },
      client as unknown as ActivateOrganisationAdminClient,
    );

    expect(client.organisationAdminProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isInitialAdmin: true,
          createdFromInvitationId: 'invitation-1',
        }),
        update: expect.objectContaining({
          isInitialAdmin: true,
          createdFromInvitationId: 'invitation-1',
        }),
      }),
    );
  });
});
