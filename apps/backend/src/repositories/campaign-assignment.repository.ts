import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type DBClient = PrismaClient | Prisma.TransactionClient;

export type FindActorOrganisationAdminInput = {
  userId: string;
  organisationId: string;
};

export type FindAssignableCampaignsInput = {
  organisationId: string;
  page: number;
  limit: number;
  search?: string;
};

export type AssignableCampaignRepositoryItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  campaignType: string;
  startDate: Date | null;
  endDate: Date | null;
  itemCount: number;
  assignmentCount: number;
};

export type FindAssignableCampaignsResult = {
  items: AssignableCampaignRepositoryItem[];
  total: number;
};

export type FindAssignmentCandidatesInput = {
  organisationId: string;
  page: number;
  limit: number;
  search?: string;
};

export type AssignmentCandidateRepositoryItem = {
  id: string; // organisationTraineeProfileId
  traineeProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipStatus: string;
};

export type FindAssignmentCandidatesResult = {
  items: AssignmentCandidateRepositoryItem[];
  total: number;
};

export async function findOrganisationById(organisationId: string, client: DBClient = prisma) {
  return client.organisation.findUnique({
    where: { id: organisationId },
  });
}

export async function findActorOrganisationAdmin(
  input: FindActorOrganisationAdminInput,
  client: DBClient = prisma,
) {
  return client.organisationAdminProfile.findFirst({
    where: {
      userId: input.userId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      user: {
        userType: 'ORGANISATION_ADMIN',
        authStatus: 'ACTIVE',
      },
    },
    include: {
      organisation: true,
      user: true,
      permissionGrants: {
        include: {
          organisationPermission: true,
        },
      },
    },
  });
}

export async function findAssignableCampaigns(
  input: FindAssignableCampaignsInput,
  client: DBClient = prisma,
): Promise<FindAssignableCampaignsResult> {
  const trimmedSearch = input.search?.trim();

  const where: Prisma.CampaignWhereInput = {
    organisationId: input.organisationId,
    campaignType: 'ORGANISATION_CUSTOM',
    status: 'ACTIVE',
    ...(trimmedSearch
      ? {
          name: {
            contains: trimmedSearch,
            mode: 'insensitive',
          },
        }
      : {}),
  };

  const skip = (input.page - 1) * input.limit;

  const [campaigns, total] = await Promise.all([
    client.campaign.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip,
      take: input.limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        campaignType: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            items: true,
            assignments: true,
          },
        },
      },
    }),
    client.campaign.count({ where }),
  ]);

  const items: AssignableCampaignRepositoryItem[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    campaignType: c.campaignType,
    startDate: c.startDate,
    endDate: c.endDate,
    itemCount: c._count.items,
    assignmentCount: c._count.assignments,
  }));

  return { items, total };
}

export async function findAssignmentCandidates(
  input: FindAssignmentCandidatesInput,
  client: DBClient = prisma,
): Promise<FindAssignmentCandidatesResult> {
  const trimmedSearch = input.search?.trim();

  const where: Prisma.OrganisationTraineeProfileWhereInput = {
    organisationId: input.organisationId,
    membershipStatus: 'ACTIVE',
    traineeProfile: {
      traineeStatus: 'ACTIVE',
      user: {
        userType: 'ORGANISATION_TRAINEE',
        authStatus: 'ACTIVE',
      },
    },
    ...(trimmedSearch
      ? {
          OR: [
            {
              traineeProfile: {
                user: {
                  firstName: {
                    contains: trimmedSearch,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              traineeProfile: {
                user: {
                  lastName: {
                    contains: trimmedSearch,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              traineeProfile: {
                user: {
                  email: {
                    contains: trimmedSearch,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.limit;

  const [candidates, total] = await Promise.all([
    client.organisationTraineeProfile.findMany({
      where,
      orderBy: [
        { traineeProfile: { user: { firstName: 'asc' } } },
        { traineeProfile: { user: { lastName: 'asc' } } },
        { id: 'asc' },
      ],
      skip,
      take: input.limit,
      include: {
        traineeProfile: {
          include: {
            user: true,
          },
        },
      },
    }),
    client.organisationTraineeProfile.count({ where }),
  ]);

  const items: AssignmentCandidateRepositoryItem[] = candidates.map((row) => ({
    id: row.id,
    traineeProfileId: row.traineeProfileId,
    userId: row.traineeProfile.userId,
    firstName: row.traineeProfile.user.firstName,
    lastName: row.traineeProfile.user.lastName,
    email: row.traineeProfile.user.email,
    membershipStatus: row.membershipStatus,
  }));

  return { items, total };
}
