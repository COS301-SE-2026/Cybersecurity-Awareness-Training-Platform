import { randomUUID } from 'node:crypto';
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

export type FindActorOrganisationTraineeInput = {
  userId: string;
  organisationId: string;
};

export async function findActorOrganisationTrainee(
  input: FindActorOrganisationTraineeInput,
  client: DBClient = prisma,
) {
  return client.organisationTraineeProfile.findFirst({
    where: {
      organisationId: input.organisationId,
      membershipStatus: 'ACTIVE',
      traineeProfile: {
        userId: input.userId,
        traineeStatus: 'ACTIVE',
        user: {
          userType: 'ORGANISATION_TRAINEE',
          authStatus: 'ACTIVE',
        },
      },
    },
    include: {
      organisation: true,
      traineeProfile: {
        include: {
          user: true,
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

export type FindAssignableCampaignsByIdsInput = {
  organisationId: string;
  campaignIds: string[];
};

export async function findAssignableCampaignsByIds(
  input: FindAssignableCampaignsByIdsInput,
  client: DBClient = prisma,
) {
  if (input.campaignIds.length === 0) return [];
  return client.campaign.findMany({
    where: {
      id: { in: input.campaignIds },
      organisationId: input.organisationId,
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      status: true,
      campaignType: true,
    },
  });
}

export type FindEligibleTraineesByIdsInput = {
  organisationId: string;
  traineeProfileIds: string[];
};

export async function findEligibleTraineesByIds(
  input: FindEligibleTraineesByIdsInput,
  client: DBClient = prisma,
) {
  if (input.traineeProfileIds.length === 0) return [];
  return client.organisationTraineeProfile.findMany({
    where: {
      organisationId: input.organisationId,
      traineeProfileId: { in: input.traineeProfileIds },
      membershipStatus: 'ACTIVE',
      traineeProfile: {
        traineeStatus: 'ACTIVE',
        user: {
          userType: 'ORGANISATION_TRAINEE',
          authStatus: 'ACTIVE',
        },
      },
    },
    select: {
      id: true,
      traineeProfileId: true,
    },
  });
}

export async function findCampaignByIdInOrganisation(
  organisationId: string,
  campaignId: string,
  client: DBClient = prisma,
) {
  return client.campaign.findFirst({
    where: {
      id: campaignId,
      organisationId,
    },
    select: {
      id: true,
    },
  });
}

export async function findTraineeByIdInOrganisation(
  organisationId: string,
  traineeProfileId: string,
  client: DBClient = prisma,
) {
  return client.organisationTraineeProfile.findFirst({
    where: {
      traineeProfileId,
      organisationId,
    },
    select: {
      id: true,
    },
  });
}

export type ExecuteBulkCampaignAssignmentInput = {
  organisationId: string;
  campaignIds: string[];
  traineeProfileIds: string[];
  actorUserId: string;
};

export type CampaignAssignmentResultRow = {
  assignmentId: string;
  campaignId: string;
  traineeProfileId: string;
};

export type ExecuteBulkCampaignAssignmentResult =
  | {
      success: true;
      created: CampaignAssignmentResultRow[];
      alreadyAssigned: CampaignAssignmentResultRow[];
      summary: {
        requestedCampaigns: number;
        requestedTrainees: number;
        requestedPairs: number;
        createdCount: number;
        alreadyAssignedCount: number;
      };
    }
  | {
      success: false;
      error: 'CAMPAIGN_NOT_FOUND' | 'TRAINEE_NOT_FOUND' | 'CAMPAIGN_INACTIVE' | 'TRAINEE_DISABLED';
      message: string;
    };

export async function executeBulkCampaignAssignment(
  input: ExecuteBulkCampaignAssignmentInput,
  client: DBClient = prisma,
): Promise<ExecuteBulkCampaignAssignmentResult> {
  const runInTx = async (tx: DBClient): Promise<ExecuteBulkCampaignAssignmentResult> => {
    // 1. Fetch existing assignmets matching requested pairs, scoped to the organization on BOTH campaign and trainee
    const existing =
      (await tx.campaignAssignment.findMany({
        where: {
          campaignId: { in: input.campaignIds },
          traineeProfileId: { in: input.traineeProfileIds },
          campaign: {
            organisationId: input.organisationId,
          },
          traineeProfile: {
            organisationTraineeProfile: {
              organisationId: input.organisationId,
            },
          },
        },
        select: {
          id: true,
          campaignId: true,
          traineeProfileId: true,
        },
      })) ?? [];

    const existingMap = new Map<string, CampaignAssignmentResultRow>();
    for (const row of existing) {
      existingMap.set(`${row.campaignId}:${row.traineeProfileId}`, {
        assignmentId: row.id,
        campaignId: row.campaignId,
        traineeProfileId: row.traineeProfileId,
      });
    }

    // 2. Compute missing pairs that would need to be created, assigning a candidate ID per pair for precise ownership tracking
    const missingPairs: Array<{
      candidateId: string;
      campaignId: string;
      traineeProfileId: string;
    }> = [];
    const candidateIdMap = new Map<string, string>();

    for (const campaignId of input.campaignIds) {
      for (const traineeProfileId of input.traineeProfileIds) {
        const key = `${campaignId}:${traineeProfileId}`;
        if (!existingMap.has(key)) {
          const candidateId = randomUUID();
          missingPairs.push({ candidateId, campaignId, traineeProfileId });
          candidateIdMap.set(key, candidateId);
        }
      }
    }

    // 3. Authoritative persistence validation inside the transaction for missing pairs
    if (missingPairs.length > 0) {
      const neededCampaignIds = Array.from(new Set(missingPairs.map((p) => p.campaignId)));
      const neededTraineeProfileIds = Array.from(
        new Set(missingPairs.map((p) => p.traineeProfileId)),
      );

      const campaigns = await tx.campaign.findMany({
        where: { id: { in: input.campaignIds } },
        select: { id: true, organisationId: true, status: true, campaignType: true },
      });

      const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));

      for (const cId of input.campaignIds) {
        const c = campaignMap.get(cId);
        if (!c || c.organisationId !== input.organisationId) {
          return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
            message:
              'One or more specified campaigns were not found or belong to another organisation',
          };
        }
      }

      for (const cId of neededCampaignIds) {
        const c = campaignMap.get(cId)!;
        if (c.status !== 'ACTIVE' || c.campaignType !== 'ORGANISATION_CUSTOM') {
          return {
            success: false,
            error: 'CAMPAIGN_INACTIVE',
            message: 'One or more specified campaigns are inactive or not eligible for assignment',
          };
        }
      }

      const orgTrainees = await tx.organisationTraineeProfile.findMany({
        where: {
          organisationId: input.organisationId,
          traineeProfileId: { in: input.traineeProfileIds },
        },
        select: {
          traineeProfileId: true,
          membershipStatus: true,
          traineeProfile: {
            select: {
              traineeStatus: true,
              user: {
                select: {
                  userType: true,
                  authStatus: true,
                },
              },
            },
          },
        },
      });

      const traineeMap = new Map((orgTrainees ?? []).map((t) => [t.traineeProfileId, t]));

      for (const tId of input.traineeProfileIds) {
        const t = traineeMap.get(tId);
        if (!t) {
          return {
            success: false,
            error: 'TRAINEE_NOT_FOUND',
            message:
              'One or more specified trainees were not found or belong to another organisation',
          };
        }
      }

      for (const tId of neededTraineeProfileIds) {
        const t = traineeMap.get(tId)!;
        if (
          t.membershipStatus !== 'ACTIVE' ||
          t.traineeProfile.traineeStatus !== 'ACTIVE' ||
          t.traineeProfile.user.userType !== 'ORGANISATION_TRAINEE' ||
          t.traineeProfile.user.authStatus !== 'ACTIVE'
        ) {
          return {
            success: false,
            error: 'TRAINEE_DISABLED',
            message: 'One or more specified trainees are disabled or not eligible for assignment',
          };
        }
      }
    }

    // 4. Perform atomic insertion using createMany with candidate IDs and skipDuplicates (ON CONFLICT DO NOTHING)
    if (missingPairs.length > 0) {
      await tx.campaignAssignment.createMany({
        data: missingPairs.map((pair) => ({
          id: pair.candidateId,
          campaignId: pair.campaignId,
          traineeProfileId: pair.traineeProfileId,
          assignedByUserId: input.actorUserId,
          accessType: 'ASSIGNED',
          assignmentStatus: 'ASSIGNED',
        })),
        skipDuplicates: true,
      });
    }

    // 5. Query all assignments after insertion
    const allAssignments =
      (await tx.campaignAssignment.findMany({
        where: {
          campaignId: { in: input.campaignIds },
          traineeProfileId: { in: input.traineeProfileIds },
        },
        select: {
          id: true,
          campaignId: true,
          traineeProfileId: true,
        },
      })) ?? [];

    const created: CampaignAssignmentResultRow[] = [];
    const alreadyAssigned: CampaignAssignmentResultRow[] = [];

    for (const assignment of allAssignments) {
      const key = `${assignment.campaignId}:${assignment.traineeProfileId}`;
      const row: CampaignAssignmentResultRow = {
        assignmentId: assignment.id,
        campaignId: assignment.campaignId,
        traineeProfileId: assignment.traineeProfileId,
      };

      const candidateId = candidateIdMap.get(key);
      if (candidateId && assignment.id === candidateId) {
        created.push(row);
      } else {
        alreadyAssigned.push(row);
      }
    }

    const requestedCampaigns = input.campaignIds.length;
    const requestedTrainees = input.traineeProfileIds.length;
    const requestedPairs = requestedCampaigns * requestedTrainees;

    return {
      success: true,
      created,
      alreadyAssigned,
      summary: {
        requestedCampaigns,
        requestedTrainees,
        requestedPairs,
        createdCount: created.length,
        alreadyAssignedCount: alreadyAssigned.length,
      },
    };
  };

  if ('$transaction' in client && typeof client.$transaction === 'function') {
    return client.$transaction(async (tx) => runInTx(tx));
  }

  return runInTx(client);
}

export type FindCampaignAssignmentsByCampaignInput = {
  organisationId: string;
  campaignId: string;
  page: number;
  limit: number;
  search?: string;
  status?: string;
};

export type CampaignAssignmentRepositoryReadRow = {
  assignmentId: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  campaignType: string;
  traineeProfileId: string;
  firstName: string;
  lastName: string;
  email: string;
  traineeStatus: string;
  assignmentStatus: string;
  accessType: string;
  assignedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type FindCampaignAssignmentsReadResult = {
  items: CampaignAssignmentRepositoryReadRow[];
  total: number;
};

function mapCampaignAssignmentRowToReadRow(r: {
  id: string;
  campaignId: string;
  traineeProfileId: string;
  assignedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  assignmentStatus: string;
  accessType: string;
  campaign: { name: string; status: string; campaignType: string };
  traineeProfile: {
    traineeStatus: string;
    user: { firstName: string; lastName: string; email: string };
  };
}): CampaignAssignmentRepositoryReadRow {
  return {
    assignmentId: r.id,
    campaignId: r.campaignId,
    campaignName: r.campaign.name,
    campaignStatus: r.campaign.status,
    campaignType: r.campaign.campaignType,
    traineeProfileId: r.traineeProfileId,
    firstName: r.traineeProfile.user.firstName,
    lastName: r.traineeProfile.user.lastName,
    email: r.traineeProfile.user.email,
    traineeStatus: r.traineeProfile.traineeStatus,
    assignmentStatus: r.assignmentStatus,
    accessType: r.accessType,
    assignedAt: r.assignedAt,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  };
}

export async function findCampaignAssignmentsByCampaign(
  input: FindCampaignAssignmentsByCampaignInput,
  client: DBClient = prisma,
): Promise<FindCampaignAssignmentsReadResult> {
  const trimmedSearch = input.search?.trim();

  const where: Prisma.CampaignAssignmentWhereInput = {
    campaignId: input.campaignId,
    campaign: {
      organisationId: input.organisationId,
    },
    traineeProfile: {
      organisationTraineeProfile: {
        organisationId: input.organisationId,
      },
      ...(trimmedSearch
        ? {
            user: {
              OR: [
                { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
                { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
                { email: { contains: trimmedSearch, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
    ...(input.status
      ? { assignmentStatus: input.status as Prisma.EnumAssignmentStatusFilter }
      : {}),
  };

  const skip = (input.page - 1) * input.limit;

  const [rows, total] = await Promise.all([
    client.campaignAssignment.findMany({
      where,
      orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
      skip,
      take: input.limit,
      include: {
        campaign: true,
        traineeProfile: {
          include: {
            user: true,
          },
        },
      },
    }),
    client.campaignAssignment.count({ where }),
  ]);

  return { items: (rows ?? []).map(mapCampaignAssignmentRowToReadRow), total };
}

export type FindCampaignAssignmentsByTraineeInput = {
  organisationId: string;
  traineeProfileId: string;
  page: number;
  limit: number;
  search?: string;
  status?: string;
};

export async function findCampaignAssignmentsByTrainee(
  input: FindCampaignAssignmentsByTraineeInput,
  client: DBClient = prisma,
): Promise<FindCampaignAssignmentsReadResult> {
  const trimmedSearch = input.search?.trim();

  const where: Prisma.CampaignAssignmentWhereInput = {
    traineeProfileId: input.traineeProfileId,
    traineeProfile: {
      organisationTraineeProfile: {
        organisationId: input.organisationId,
      },
    },
    campaign: {
      organisationId: input.organisationId,
      ...(trimmedSearch
        ? {
            name: { contains: trimmedSearch, mode: 'insensitive' },
          }
        : {}),
    },
    ...(input.status
      ? { assignmentStatus: input.status as Prisma.EnumAssignmentStatusFilter }
      : {}),
  };

  const skip = (input.page - 1) * input.limit;

  const [rows, total] = await Promise.all([
    client.campaignAssignment.findMany({
      where,
      orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
      skip,
      take: input.limit,
      include: {
        campaign: true,
        traineeProfile: {
          include: {
            user: true,
          },
        },
      },
    }),
    client.campaignAssignment.count({ where }),
  ]);

  return { items: (rows ?? []).map(mapCampaignAssignmentRowToReadRow), total };
}
