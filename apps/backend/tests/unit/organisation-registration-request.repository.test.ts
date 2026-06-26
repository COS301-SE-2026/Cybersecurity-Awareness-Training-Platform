import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganisationRegistrationRequest,
  findActiveRequestByRepresentativeEmail,
  findActiveRequestByWebsiteOrDomain,
} from '../../src/repositories/organisation-registration-request.repository.js';

const prismaMock = vi.hoisted(() => ({
  organisationRegistrationRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('organisation registration request repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks representative email duplicates case-insensitively', async () => {
    await findActiveRequestByRepresentativeEmail('representative@example.test');

    expect(prismaMock.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'],
        },
        representativeEmail: {
          equals: 'representative@example.test',
          mode: 'insensitive',
        },
      },
    });
  });

  it('checks website and primary domain duplicates case-insensitively', async () => {
    await findActiveRequestByWebsiteOrDomain({
      website: 'https://example.test',
      primaryDomain: 'example.test',
    });

    expect(prismaMock.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'],
        },
        OR: [
          {
            submittedWebsite: {
              equals: 'https://example.test',
              mode: 'insensitive',
            },
          },
          {
            submittedPrimaryDomain: {
              equals: 'example.test',
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  });

  it('persists required request fields through existing onboarding columns', async () => {
    await createOrganisationRegistrationRequest({
      submittedOrganisationName: 'Example Consulting',
      submittedWebsite: 'https://example.test',
      submittedIndustry: 'Security awareness consulting team.',
      submittedEmployeeCount: 50,
      submittedPrimaryDomain: 'example.test',
      representativeFirstName: 'Adriano',
      representativeLastName: 'Jorge',
      representativeEmail: 'adriano@example.test',
    });

    expect(prismaMock.organisationRegistrationRequest.create).toHaveBeenCalledWith({
      data: {
        submittedOrganisationName: 'Example Consulting',
        submittedWebsite: 'https://example.test',
        submittedIndustry: 'Security awareness consulting team.',
        submittedEmployeeCount: 50,
        submittedPrimaryDomain: 'example.test',
        representativeFirstName: 'Adriano',
        representativeLastName: 'Jorge',
        representativeEmail: 'adriano@example.test',
        status: 'PENDING_REVIEW',
      },
    });
  });
});
