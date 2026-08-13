import { prisma } from '../lib/prisma.js';
import type {
  Prisma,
  CampaignComponentType,
  CampaignStatus,
  CampaignType,
} from '../generated/prisma/client.js';

export async function findCampaignCatalogue(input: {
  page: number;
  limit: number;
  search?: string;
  type?: CampaignComponentType;
}) {
  const skip = (input.page - 1) * input.limit;
  const searchFilter = input.search
    ? {
        OR: [
          { title: { contains: input.search, mode: 'insensitive' as const } },
          { description: { contains: input.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const fetchTrainingDocs = !input.type || input.type === 'TRAINING_DOCUMENT';
  const fetchQuizzes = !input.type || input.type === 'QUIZ';
  const fetchSimulations = !input.type || input.type === 'SIMULATED_INBOX';

  const [trainingDocs, quizzes, simulations] = await Promise.all([
    fetchTrainingDocs
      ? prisma.trainingDocument.findMany({
          where: {
            status: 'AVAILABLE',
            ...searchFilter,
          },
        })
      : [],
    fetchQuizzes
      ? prisma.quiz.findMany({
          where: {
            status: 'PUBLISHED',
            ...searchFilter,
          },
          include: {
            _count: {
              select: { questions: true },
            },
          },
        })
      : [],
    fetchSimulations
      ? prisma.simulation.findMany({
          where: {
            safetyStatus: 'APPROVED',
            simulatedInbox: {
              status: 'ACTIVE',
            },
            ...searchFilter,
          },
          include: {
            simulatedInbox: {
              include: {
                _count: {
                  select: { emails: true },
                },
              },
            },
          },
        })
      : [],
  ]);

  const combined = [
    ...trainingDocs.map((doc) => ({
      id: doc.id,
      type: 'TRAINING_DOCUMENT' as const,
      title: doc.title,
      description: doc.contentSummary,
      contentType: doc.contentType,
      estimatedReadTimeMinutes: doc.estimatedReadTimeMinutes,
      difficultyLevel: doc.difficultyLevel,
      status: doc.status,
      createdAt: doc.createdAt,
    })),
    ...quizzes.map((quiz) => ({
      id: quiz.id,
      type: 'QUIZ' as const,
      title: quiz.title,
      description: quiz.description,
      passThresholdPercentage: quiz.passThresholdPercentage,
      questionCount: quiz._count.questions,
      difficultyLevel: quiz.difficultyLevel,
      status: quiz.status,
      createdAt: quiz.createdAt,
    })),
    ...simulations.map((sim) => ({
      id: sim.id,
      type: 'SIMULATED_INBOX' as const,
      title: sim.title,
      description: sim.description,
      emailCount: sim.simulatedInbox?._count.emails ?? 0,
      difficultyLevel: sim.difficultyLevel,
      status: sim.simulatedInbox?.status ?? 'ACTIVE',
      createdAt: sim.createdAt,
    })),
  ];

  combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = combined.length;
  const paginatedItems = combined.slice(skip, skip + input.limit);

  return {
    items: paginatedItems,
    total,
  };
}

export async function findCampaigns(input: {
  organisationId?: string | null;
  platformOnly?: boolean;
  campaignType?: CampaignType;
  status?: CampaignStatus;
  page: number;
  limit: number;
  search?: string;
}) {
  const skip = (input.page - 1) * input.limit;

  const where: Prisma.CampaignWhereInput = {};

  if (input.platformOnly) {
    where.campaignType = 'PREMADE_GENERAL';
    where.organisationId = null;
  } else if (input.organisationId !== undefined) {
    where.organisationId = input.organisationId;
  }

  if (input.campaignType) {
    where.campaignType = input.campaignType;
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: 'insensitive' } },
      { description: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
  ]);

  return {
    items: items.map((campaign) => ({
      id: campaign.id,
      organisationId: campaign.organisationId,
      name: campaign.name,
      description: campaign.description,
      accentColor: campaign.accentColor,
      campaignType: campaign.campaignType,
      status: campaign.status,
      itemCount: campaign._count.items,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      createdBy: campaign.createdBy
        ? {
            id: campaign.createdBy.id,
            displayName: `${campaign.createdBy.firstName} ${campaign.createdBy.lastName}`.trim(),
            email: campaign.createdBy.email,
          }
        : null,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    })),
    total,
  };
}

export async function findCampaignById(
  campaignId: string,
  scope?: { organisationId?: string | null; platformOnly?: boolean },
) {
  const where: Prisma.CampaignWhereInput = { id: campaignId };

  if (scope?.organisationId !== undefined) {
    where.organisationId = scope.organisationId;
  }

  if (scope?.platformOnly) {
    where.campaignType = 'PREMADE_GENERAL';
    where.organisationId = null;
  }

  const campaign = await prisma.campaign.findFirst({
    where,
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        orderBy: { position: 'asc' },
        include: {
          trainingDocument: { select: { id: true, title: true, status: true } },
          quiz: { select: { id: true, title: true, description: true, status: true } },
          simulation: {
            select: {
              id: true,
              title: true,
              safetyStatus: true,
              simulatedInbox: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    return null;
  }

  return {
    id: campaign.id,
    organisationId: campaign.organisationId,
    name: campaign.name,
    description: campaign.description,
    accentColor: campaign.accentColor,
    campaignType: campaign.campaignType,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    createdBy: campaign.createdBy
      ? {
          id: campaign.createdBy.id,
          displayName: `${campaign.createdBy.firstName} ${campaign.createdBy.lastName}`.trim(),
          email: campaign.createdBy.email,
        }
      : null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    items: campaign.items.map((item: (typeof campaign.items)[0]) => {
      let title = item.title;
      let description = item.description;
      let sourceAvailable = false;

      if (item.componentType === 'TRAINING_DOCUMENT' && item.trainingDocument) {
        title = item.trainingDocument.title;
        sourceAvailable = item.trainingDocument.status === 'AVAILABLE';
      } else if (item.componentType === 'QUIZ' && item.quiz) {
        title = item.quiz.title;
        description = item.quiz.description;
        sourceAvailable = item.quiz.status === 'PUBLISHED';
      } else if (item.componentType === 'SIMULATED_INBOX' && item.simulation) {
        title = item.simulation.title;
        sourceAvailable =
          item.simulation.safetyStatus === 'APPROVED' &&
          item.simulation.simulatedInbox?.status === 'ACTIVE';
      }

      const contentId = item.trainingDocumentId ?? item.quizId ?? item.simulationId ?? '';

      return {
        campaignItemId: item.id,
        componentType: item.componentType as CampaignComponentType,
        contentId,
        title,
        description,
        position: item.position,
        isRequired: item.isRequired,
        sourceAvailable,
      };
    }),
  };
}

export async function createCampaignDraft(input: {
  organisationId?: string | null;
  createdByUserId?: string | null;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  campaignType: CampaignType;
  startDate?: Date | null;
  endDate?: Date | null;
  items: Array<{
    componentType: CampaignComponentType;
    contentId: string;
    isRequired: boolean;
  }>;
}) {
  if (input.campaignType === 'PREMADE_GENERAL' && input.organisationId !== null) {
    throw new Error('PREMADE_GENERAL campaigns must have null organisationId');
  }

  if (input.campaignType === 'ORGANISATION_CUSTOM' && !input.organisationId) {
    throw new Error('ORGANISATION_CUSTOM campaigns must have a valid organisationId');
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const campaign = await tx.campaign.create({
      data: {
        organisationId: input.organisationId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        name: input.name,
        description: input.description ?? null,
        accentColor: input.accentColor ?? null,
        campaignType: input.campaignType,
        status: 'DRAFT',
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
      },
    });

    for (let index = 0; index < input.items.length; index++) {
      const itemInput = input.items[index];
      const position = (index + 1) * 10;

      let title = `Item ${index + 1}`;
      let description: string | null = null;

      if (itemInput.componentType === 'TRAINING_DOCUMENT') {
        const doc = await tx.trainingDocument.findUnique({
          where: { id: itemInput.contentId },
        });
        if (!doc) {
          throw new Error(`TRAINING_DOCUMENT_NOT_FOUND:${itemInput.contentId}`);
        }
        title = doc.title;
        description = doc.contentSummary;
      } else if (itemInput.componentType === 'QUIZ') {
        const quiz = await tx.quiz.findUnique({
          where: { id: itemInput.contentId },
        });
        if (!quiz) {
          throw new Error(`QUIZ_NOT_FOUND:${itemInput.contentId}`);
        }
        title = quiz.title;
        description = quiz.description;
      } else if (itemInput.componentType === 'SIMULATED_INBOX') {
        const sim = await tx.simulation.findUnique({
          where: { id: itemInput.contentId },
        });
        if (!sim) {
          throw new Error(`SIMULATION_NOT_FOUND:${itemInput.contentId}`);
        }
        title = sim.title;
        description = sim.description;
      }

      await tx.campaignItem.create({
        data: {
          campaignId: campaign.id,
          itemType: 'COMPONENT',
          componentType: itemInput.componentType,
          title,
          description,
          position,
          isRequired: itemInput.isRequired,
          trainingDocumentId:
            itemInput.componentType === 'TRAINING_DOCUMENT' ? itemInput.contentId : null,
          quizId: itemInput.componentType === 'QUIZ' ? itemInput.contentId : null,
          simulationId: itemInput.componentType === 'SIMULATED_INBOX' ? itemInput.contentId : null,
        },
      });
    }

    return campaign.id;
  });
}

export async function updateCampaignDraft(input: {
  campaignId: string;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  items: Array<{
    campaignItemId?: string;
    componentType: CampaignComponentType;
    contentId: string;
    isRequired: boolean;
  }>;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.campaign.findUnique({
      where: { id: input.campaignId },
      include: { items: true },
    });

    if (!existing) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (existing.status !== 'DRAFT') {
      return { success: false, error: 'CAMPAIGN_IMMUTABLE' as const };
    }

    await tx.campaign.update({
      where: { id: input.campaignId },
      data: {
        name: input.name,
        description: input.description ?? null,
        accentColor: input.accentColor ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
      },
    });

    const keptItemIds = new Set<string>();

    for (let index = 0; index < input.items.length; index++) {
      const itemInput = input.items[index];
      const position = (index + 1) * 10;

      let title = `Item ${index + 1}`;
      let description: string | null = null;

      if (itemInput.componentType === 'TRAINING_DOCUMENT') {
        const doc = await tx.trainingDocument.findUnique({ where: { id: itemInput.contentId } });
        if (!doc) throw new Error(`TRAINING_DOCUMENT_NOT_FOUND:${itemInput.contentId}`);
        title = doc.title;
        description = doc.contentSummary;
      } else if (itemInput.componentType === 'QUIZ') {
        const quiz = await tx.quiz.findUnique({ where: { id: itemInput.contentId } });
        if (!quiz) throw new Error(`QUIZ_NOT_FOUND:${itemInput.contentId}`);
        title = quiz.title;
        description = quiz.description;
      } else if (itemInput.componentType === 'SIMULATED_INBOX') {
        const sim = await tx.simulation.findUnique({ where: { id: itemInput.contentId } });
        if (!sim) throw new Error(`SIMULATION_NOT_FOUND:${itemInput.contentId}`);
        title = sim.title;
        description = sim.description;
      }

      if (
        itemInput.campaignItemId &&
        existing.items.some((i) => i.id === itemInput.campaignItemId)
      ) {
        await tx.campaignItem.update({
          where: { id: itemInput.campaignItemId },
          data: {
            componentType: itemInput.componentType,
            title,
            description,
            position,
            isRequired: itemInput.isRequired,
            trainingDocumentId:
              itemInput.componentType === 'TRAINING_DOCUMENT' ? itemInput.contentId : null,
            quizId: itemInput.componentType === 'QUIZ' ? itemInput.contentId : null,
            simulationId:
              itemInput.componentType === 'SIMULATED_INBOX' ? itemInput.contentId : null,
          },
        });
        keptItemIds.add(itemInput.campaignItemId);
      } else {
        const newItem = await tx.campaignItem.create({
          data: {
            campaignId: input.campaignId,
            itemType: 'COMPONENT',
            componentType: itemInput.componentType,
            title,
            description,
            position,
            isRequired: itemInput.isRequired,
            trainingDocumentId:
              itemInput.componentType === 'TRAINING_DOCUMENT' ? itemInput.contentId : null,
            quizId: itemInput.componentType === 'QUIZ' ? itemInput.contentId : null,
            simulationId:
              itemInput.componentType === 'SIMULATED_INBOX' ? itemInput.contentId : null,
          },
        });
        keptItemIds.add(newItem.id);
      }
    }

    const itemIdsToDelete = existing.items
      .filter((item) => !keptItemIds.has(item.id))
      .map((item) => item.id);

    if (itemIdsToDelete.length > 0) {
      await tx.campaignItem.deleteMany({
        where: {
          id: { in: itemIdsToDelete },
        },
      });
    }

    return { success: true };
  });
}

type CampaignItemWithContent = {
  componentType: string | null;
  trainingDocument?: { status: string } | null;
  quiz?: { status: string } | null;
  simulation?: { safetyStatus: string; simulatedInbox?: { status: string } | null } | null;
};

function checkItemsContentStatus(items: CampaignItemWithContent[]): boolean {
  for (const item of items) {
    if (item.componentType === 'TRAINING_DOCUMENT') {
      if (!item.trainingDocument || item.trainingDocument.status !== 'AVAILABLE') {
        return false;
      }
    } else if (item.componentType === 'QUIZ') {
      if (!item.quiz || item.quiz.status !== 'PUBLISHED') {
        return false;
      }
    } else if (item.componentType === 'SIMULATED_INBOX') {
      if (
        !item.simulation ||
        item.simulation.safetyStatus !== 'APPROVED' ||
        !item.simulation.simulatedInbox ||
        item.simulation.simulatedInbox.status !== 'ACTIVE'
      ) {
        return false;
      }
    }
  }
  return true;
}

export async function activateCampaign(
  campaignId: string,
  _actorUserId?: string,
  _organisationId?: string | null,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      include: {
        items: {
          include: {
            trainingDocument: true,
            quiz: true,
            simulation: { include: { simulatedInbox: true } },
          },
        },
      },
    });

    if (!campaign) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (campaign.status !== 'DRAFT') {
      return { success: false, error: 'INVALID_LIFECYCLE_TRANSITION' as const };
    }

    if (campaign.items.length === 0) {
      return { success: false, error: 'EMPTY_CAMPAIGN' as const };
    }

    if (!checkItemsContentStatus(campaign.items)) {
      return { success: false, error: 'INVALID_CONTENT_STATUS' as const };
    }

    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    return { success: true, status: 'ACTIVE' as const };
  });
}

export async function archiveCampaign(
  campaignId: string,
  _actorUserId?: string,
  _organisationId?: string | null,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (campaign.status !== 'ACTIVE') {
      return { success: false, error: 'INVALID_LIFECYCLE_TRANSITION' as const };
    }

    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: 'ARCHIVED' },
    });

    return { success: true, status: 'ARCHIVED' as const };
  });
}

export async function reactivateCampaign(
  campaignId: string,
  _actorUserId?: string,
  _organisationId?: string | null,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      include: {
        items: {
          include: {
            trainingDocument: true,
            quiz: true,
            simulation: { include: { simulatedInbox: true } },
          },
        },
      },
    });

    if (!campaign) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (campaign.status !== 'ARCHIVED') {
      return { success: false, error: 'INVALID_LIFECYCLE_TRANSITION' as const };
    }

    if (!checkItemsContentStatus(campaign.items)) {
      return { success: false, error: 'INVALID_CONTENT_STATUS' as const };
    }

    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    return { success: true, status: 'ACTIVE' as const };
  });
}
