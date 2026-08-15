import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';

import { prisma } from '../lib/prisma.js';

type DBClient = PrismaClient | Prisma.TransactionClient;

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
  id: string;
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

export type FindActorOrganisationAdminInput = {
  userId: string;
  organisationId: string;
};

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
  const now = new Date();

  const where: Prisma.CampaignWhereInput = {
    status: 'ACTIVE',
    OR: [
      {
        organisationId: input.organisationId,
        campaignType: 'ORGANISATION_CUSTOM',
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      {
        organisationId: null,
        campaignType: 'PREMADE_GENERAL',
      },
    ],
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
            assignments: {
              where: {
                traineeProfile: {
                  organisationTraineeProfile: {
                    organisationId: input.organisationId,
                  },
                },
              },
            },
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
  const now = new Date();
  return client.campaign.findMany({
    where: {
      id: { in: input.campaignIds },
      status: 'ACTIVE',
      OR: [
        {
          organisationId: input.organisationId,
          campaignType: 'ORGANISATION_CUSTOM',
          OR: [{ endDate: null }, { endDate: { gt: now } }],
        },
        {
          organisationId: null,
          campaignType: 'PREMADE_GENERAL',
        },
      ],
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
      OR: [{ organisationId }, { organisationId: null, campaignType: 'PREMADE_GENERAL' }],
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
    const existing =
      (await tx.campaignAssignment.findMany({
        where: {
          campaignId: { in: input.campaignIds },
          traineeProfileId: { in: input.traineeProfileIds },
          OR: [
            { campaign: { organisationId: input.organisationId } },
            { campaign: { organisationId: null, campaignType: 'PREMADE_GENERAL' } },
          ],
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

    if (missingPairs.length > 0) {
      const campaigns = await tx.campaign.findMany({
        where: { id: { in: input.campaignIds } },
        select: {
          id: true,
          organisationId: true,
          status: true,
          campaignType: true,
          endDate: true,
        },
      });

      const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));
      const now = new Date();

      for (const cId of input.campaignIds) {
        const c = campaignMap.get(cId);
        if (!c) {
          return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
            message: 'One or more specified campaigns were not found',
          };
        }
        if (c.campaignType === 'ORGANISATION_CUSTOM' && c.organisationId !== input.organisationId) {
          return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
            message: 'One or more specified custom campaigns belong to another organisation',
          };
        }
        if (c.campaignType === 'PREMADE_GENERAL' && c.organisationId !== null) {
          return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
            message: 'Invalid platform campaign scope',
          };
        }
        const isExpired = c.endDate ? now.getTime() >= c.endDate.getTime() : false;
        if (c.status !== 'ACTIVE' || isExpired) {
          return {
            success: false,
            error: 'CAMPAIGN_INACTIVE',
            message: 'One or more specified campaigns are inactive or expired',
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

    const createdRows: CampaignAssignmentResultRow[] = [];
    const alreadyAssignedRows: CampaignAssignmentResultRow[] = [];

    const verifyAssignments =
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

    const verifyMap = new Map<string, string>();
    for (const v of verifyAssignments) {
      verifyMap.set(`${v.campaignId}:${v.traineeProfileId}`, v.id);
    }

    for (const campaignId of input.campaignIds) {
      for (const traineeProfileId of input.traineeProfileIds) {
        const key = `${campaignId}:${traineeProfileId}`;
        const candidateId = candidateIdMap.get(key);
        const persistedId = verifyMap.get(key);
        const assignmentId = persistedId ?? candidateId ?? randomUUID();
        const row: CampaignAssignmentResultRow = {
          assignmentId,
          campaignId,
          traineeProfileId,
        };

        const wasCreatedByThisCall =
          !existingMap.has(key) &&
          candidateId !== undefined &&
          persistedId !== undefined &&
          candidateId === persistedId;

        if (wasCreatedByThisCall) {
          createdRows.push(row);
        } else {
          alreadyAssignedRows.push(row);
        }
      }
    }

    return {
      success: true,
      created: createdRows,
      alreadyAssigned: alreadyAssignedRows,
      summary: {
        requestedCampaigns: input.campaignIds.length,
        requestedTrainees: input.traineeProfileIds.length,
        requestedPairs: input.campaignIds.length * input.traineeProfileIds.length,
        createdCount: createdRows.length,
        alreadyAssignedCount: alreadyAssignedRows.length,
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

export async function findCampaignAssignmentsByCampaign(
  input: FindCampaignAssignmentsByCampaignInput,
  client: DBClient = prisma,
) {
  const skip = (input.page - 1) * input.limit;
  const trimmedSearch = input.search?.trim();

  const where: Prisma.CampaignAssignmentWhereInput = {
    campaignId: input.campaignId,
    campaign: {
      OR: [{ organisationId: input.organisationId }, { organisationId: null }],
    },
    traineeProfile: {
      organisationTraineeProfile: {
        organisationId: input.organisationId,
      },
    },
    ...(input.status
      ? { assignmentStatus: input.status as Prisma.EnumAssignmentStatusFilter }
      : {}),
    ...(trimmedSearch
      ? {
          OR: [
            {
              traineeProfile: {
                user: { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
              },
            },
            {
              traineeProfile: {
                user: { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
              },
            },
            {
              traineeProfile: { user: { email: { contains: trimmedSearch, mode: 'insensitive' } } },
            },
          ],
        }
      : {}),
  };

  return fetchAssignmentsPage(where, skip, input.limit, client);
}

const campaignAssignmentInclude = {
  campaign: true,
  traineeProfile: {
    include: {
      user: true,
    },
  },
} as const;

function mapCampaignAssignmentRow(
  a: Prisma.CampaignAssignmentGetPayload<{ include: typeof campaignAssignmentInclude }>,
) {
  return {
    assignmentId: a.id,
    campaignId: a.campaignId,
    campaignName: a.campaign.name,
    campaignStatus: a.campaign.status,
    campaignType: a.campaign.campaignType,
    traineeProfileId: a.traineeProfileId,
    firstName: a.traineeProfile.user.firstName,
    lastName: a.traineeProfile.user.lastName,
    email: a.traineeProfile.user.email,
    traineeStatus: a.traineeProfile.traineeStatus,
    assignmentStatus: a.assignmentStatus,
    accessType: a.accessType,
    assignedAt: a.assignedAt,
    startedAt: a.startedAt,
    completedAt: a.completedAt,
  };
}

async function fetchAssignmentsPage(
  where: Prisma.CampaignAssignmentWhereInput,
  skip: number,
  limit: number,
  client: DBClient = prisma,
) {
  const [total, assignments] = await Promise.all([
    client.campaignAssignment.count({ where }),
    client.campaignAssignment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { assignedAt: 'desc' },
      include: campaignAssignmentInclude,
    }),
  ]);

  return { items: assignments.map(mapCampaignAssignmentRow), total };
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
) {
  const skip = (input.page - 1) * input.limit;
  const trimmedSearch = input.search?.trim();

  const where: Prisma.CampaignAssignmentWhereInput = {
    traineeProfileId: input.traineeProfileId,
    campaign: {
      OR: [{ organisationId: input.organisationId }, { organisationId: null }],
      ...(trimmedSearch
        ? {
            name: { contains: trimmedSearch, mode: 'insensitive' },
          }
        : {}),
    },
    traineeProfile: {
      organisationTraineeProfile: {
        organisationId: input.organisationId,
      },
    },
    ...(input.status
      ? { assignmentStatus: input.status as Prisma.EnumAssignmentStatusFilter }
      : {}),
  };

  return fetchAssignmentsPage(where, skip, input.limit, client);
}

export type DeleteCampaignAssignmentInput = {
  organisationId: string;
  assignmentId: string;
  actorUserId: string;
};

export async function deleteCampaignAssignment(
  input: DeleteCampaignAssignmentInput,
  client: DBClient = prisma,
) {
  const runInTx = async (tx: DBClient) => {
    const assignment = await tx.campaignAssignment.findFirst({
      where: {
        id: input.assignmentId,
        traineeProfile: {
          organisationTraineeProfile: {
            organisationId: input.organisationId,
          },
        },
      },
    });

    if (!assignment || assignment.accessType === 'SELF_SELECTED') {
      return {
        success: false as const,
        error: 'ASSIGNMENT_NOT_FOUND' as const,
        message: 'Campaign assignment not found',
      };
    }

    const campaignItems = await tx.campaignItem.findMany({
      where: { campaignId: assignment.campaignId },
      select: { id: true },
    });
    const campaignItemIds = campaignItems.map((ci) => ci.id);

    const progressWhere = {
      OR: [
        { campaignAssignmentId: assignment.id },
        ...(campaignItemIds.length > 0
          ? [
              {
                traineeProfileId: assignment.traineeProfileId,
                campaignItemId: { in: campaignItemIds },
              },
            ]
          : []),
      ],
    };

    const [interactionEventsCount, classificationResponsesCount, quizAttemptsCount] =
      await Promise.all([
        tx.interactionEvent.deleteMany({
          where: progressWhere,
        }),
        tx.emailClassificationResponse.deleteMany({
          where: progressWhere,
        }),
        tx.quizAttempt.deleteMany({
          where: progressWhere,
        }),
      ]);

    try {
      await tx.campaignAssignment.delete({
        where: { id: assignment.id },
      });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2025'
      ) {
        return {
          success: false as const,
          error: 'ASSIGNMENT_NOT_FOUND' as const,
          message: 'Campaign assignment not found',
        };
      }
      throw err;
    }

    await tx.auditLogEntry.create({
      data: {
        actorUserId: input.actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: input.organisationId,
        targetType: 'CAMPAIGN',
        targetId: assignment.campaignId,
        actionType: 'REVOKED',
        outcome: 'SUCCESS',
        metadata: {
          assignmentId: assignment.id,
          traineeProfileId: assignment.traineeProfileId,
          deletedProgress: {
            interactionEvents: interactionEventsCount.count,
            emailClassificationResponses: classificationResponsesCount.count,
            quizAttempts: quizAttemptsCount.count,
          },
        },
      },
    });

    return {
      success: true as const,
      assignmentId: assignment.id,
      campaignId: assignment.campaignId,
      traineeProfileId: assignment.traineeProfileId,
      deletedProgress: {
        interactionEvents: interactionEventsCount.count,
        emailClassificationResponses: classificationResponsesCount.count,
        quizAttempts: quizAttemptsCount.count,
      },
    };
  };

  if ('$transaction' in client && typeof client.$transaction === 'function') {
    return client.$transaction(async (tx) => runInTx(tx));
  }

  return runInTx(client);
}

export async function findGeneralTraineeActorScope(userId: string, client: DBClient = prisma) {
  return client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userType: true,
      authStatus: true,
      traineeProfile: {
        select: {
          id: true,
          traineeStatus: true,
          generalTraineeProfile: {
            select: {
              id: true,
              accessSource: true,
            },
          },
        },
      },
    },
  });
}

export async function findActiveGeneralTraineeByUserId(userId: string, client: DBClient = prisma) {
  return client.traineeProfile.findFirst({
    where: {
      userId,
      traineeStatus: 'ACTIVE',
      user: {
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
      },
      generalTraineeProfile: {
        isNot: null,
      },
    },
    select: {
      id: true,
      userId: true,
      traineeStatus: true,
    },
  });
}

export type FindPlatformCampaignsForDiscoveryInput = {
  page: number;
  limit: number;
  search?: string;
  traineeProfileId: string;
};

export type PlatformCampaignDiscoveryRepositoryItem = {
  id: string;
  name: string;
  description: string | null;
  accentColor: string | null;
  campaignType: string;
  difficultyLevel: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  items: Array<{ id: string; availabilityStatus: string }>;
  assignment: {
    id: string;
    assignmentStatus: string;
    accessType: string;
    currentCampaignItemId: string | null;
    assignedAt: Date;
    dueDate: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
  } | null;
};

export type FindPlatformCampaignsForDiscoveryResult = {
  items: PlatformCampaignDiscoveryRepositoryItem[];
  total: number;
};

export async function findPlatformCampaignsForDiscovery(
  input: FindPlatformCampaignsForDiscoveryInput,
  client: DBClient = prisma,
): Promise<FindPlatformCampaignsForDiscoveryResult> {
  const trimmedSearch = input.search?.trim();
  const skip = (input.page - 1) * input.limit;

  const where: Prisma.CampaignWhereInput = {
    campaignType: 'PREMADE_GENERAL',
    organisationId: null,
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
        accentColor: true,
        campaignType: true,
        difficultyLevel: true,
        status: true,
        startDate: true,
        endDate: true,
        items: {
          where: {
            availabilityStatus: {
              not: 'ARCHIVED',
            },
          },
          select: {
            id: true,
            availabilityStatus: true,
          },
        },
        assignments: {
          where: {
            traineeProfileId: input.traineeProfileId,
          },
          select: {
            id: true,
            assignmentStatus: true,
            accessType: true,
            currentCampaignItemId: true,
            assignedAt: true,
            dueDate: true,
            startedAt: true,
            completedAt: true,
          },
          take: 1,
        },
      },
    }),
    client.campaign.count({ where }),
  ]);

  const items: PlatformCampaignDiscoveryRepositoryItem[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    accentColor: c.accentColor,
    campaignType: c.campaignType,
    difficultyLevel: c.difficultyLevel,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    items: c.items,
    assignment: c.assignments[0] ?? null,
  }));

  return { items, total };
}

export async function findPlatformCampaignById(campaignId: string, client: DBClient = prisma) {
  return client.campaign.findFirst({
    where: {
      id: campaignId,
      campaignType: 'PREMADE_GENERAL',
      organisationId: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      accentColor: true,
      campaignType: true,
      difficultyLevel: true,
      status: true,
      startDate: true,
      endDate: true,
      items: {
        where: {
          availabilityStatus: {
            not: 'ARCHIVED',
          },
        },
        select: {
          id: true,
          availabilityStatus: true,
        },
      },
    },
  });
}

export type EnrolGeneralTraineeInPlatformCampaignInput = {
  traineeProfileId: string;
  campaignId: string;
};

export type EnrolGeneralTraineeInPlatformCampaignResult =
  | {
      success: true;
      isNew: boolean;
      assignment: {
        id: string;
        campaignId: string;
        traineeProfileId: string;
        assignmentStatus: string;
        accessType: string;
        currentCampaignItemId: string | null;
        assignedAt: Date;
        dueDate: Date | null;
        startedAt: Date | null;
        completedAt: Date | null;
      };
      campaign: {
        id: string;
        name: string;
        description: string | null;
        accentColor: string | null;
        campaignType: string;
        difficultyLevel: string;
        status: string;
        startDate: Date | null;
        endDate: Date | null;
        items: Array<{ id: string; availabilityStatus: string }>;
      };
    }
  | {
      success: false;
      error: 'TRAINEE_NOT_ELIGIBLE' | 'CAMPAIGN_NOT_FOUND' | 'CAMPAIGN_INACTIVE';
      message: string;
    };

export async function enrolGeneralTraineeInPlatformCampaign(
  input: EnrolGeneralTraineeInPlatformCampaignInput,
  client: DBClient = prisma,
): Promise<EnrolGeneralTraineeInPlatformCampaignResult> {
  const runInTx = async (tx: DBClient): Promise<EnrolGeneralTraineeInPlatformCampaignResult> => {
    // 1. Authoritative verification of active general trainee
    const trainee = await tx.traineeProfile.findFirst({
      where: {
        id: input.traineeProfileId,
        traineeStatus: 'ACTIVE',
        user: {
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
        },
        generalTraineeProfile: {
          isNot: null,
        },
      },
      select: { id: true },
    });

    if (!trainee) {
      return {
        success: false,
        error: 'TRAINEE_NOT_ELIGIBLE',
        message: 'Trainee is not an active general trainee',
      };
    }

    // 2. Authoritative verification of platform campaign
    const campaign = await tx.campaign.findFirst({
      where: {
        id: input.campaignId,
        campaignType: 'PREMADE_GENERAL',
        organisationId: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        accentColor: true,
        campaignType: true,
        difficultyLevel: true,
        status: true,
        startDate: true,
        endDate: true,
        items: {
          where: {
            availabilityStatus: {
              not: 'ARCHIVED',
            },
          },
          select: {
            id: true,
            availabilityStatus: true,
          },
        },
      },
    });

    if (!campaign) {
      return {
        success: false,
        error: 'CAMPAIGN_NOT_FOUND',
        message: 'Platform campaign was not found',
      };
    }

    if (campaign.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'CAMPAIGN_INACTIVE',
        message: 'Campaign is not active',
      };
    }

    // 3. Check for existing assignment
    const existingAssignment = await tx.campaignAssignment.findUnique({
      where: {
        campaignId_traineeProfileId: {
          campaignId: input.campaignId,
          traineeProfileId: input.traineeProfileId,
        },
      },
      select: {
        id: true,
        campaignId: true,
        traineeProfileId: true,
        assignmentStatus: true,
        accessType: true,
        currentCampaignItemId: true,
        assignedAt: true,
        dueDate: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (existingAssignment) {
      // Idempotent: return existing assignment without altering accessType (ASSIGNED is not downgraded)
      return {
        success: true,
        isNew: false,
        assignment: existingAssignment,
        campaign,
      };
    }

    // 4. Create new SELF_SELECTED assignment (with concurrency handling)
    try {
      const newAssignment = await tx.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: input.campaignId,
          traineeProfileId: input.traineeProfileId,
          assignedByUserId: null,
          accessType: 'SELF_SELECTED',
          assignmentStatus: 'ASSIGNED',
        },
        select: {
          id: true,
          campaignId: true,
          traineeProfileId: true,
          assignmentStatus: true,
          accessType: true,
          currentCampaignItemId: true,
          assignedAt: true,
          dueDate: true,
          startedAt: true,
          completedAt: true,
        },
      });

      return {
        success: true,
        isNew: true,
        assignment: newAssignment,
        campaign,
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        const fallbackAssignment = await tx.campaignAssignment.findUnique({
          where: {
            campaignId_traineeProfileId: {
              campaignId: input.campaignId,
              traineeProfileId: input.traineeProfileId,
            },
          },
          select: {
            id: true,
            campaignId: true,
            traineeProfileId: true,
            assignmentStatus: true,
            accessType: true,
            currentCampaignItemId: true,
            assignedAt: true,
            dueDate: true,
            startedAt: true,
            completedAt: true,
          },
        });

        if (fallbackAssignment) {
          return {
            success: true,
            isNew: false,
            assignment: fallbackAssignment,
            campaign,
          };
        }
      }
      throw err;
    }
  };

  if ('$transaction' in client && typeof client.$transaction === 'function') {
    return client.$transaction(async (tx) => runInTx(tx));
  }

  return runInTx(client);
}
