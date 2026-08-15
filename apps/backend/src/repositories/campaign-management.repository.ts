import { prisma } from '../lib/prisma.js';
import type {
  Prisma,
  CampaignComponentType,
  CampaignGroupType,
  CampaignStatus,
  CampaignType,
  CompletionRule,
} from '../generated/prisma/client.js';

export type RepositoryCampaignItemInput =
  | {
      itemType?: 'COMPONENT';
      campaignItemId?: string;
      componentType: CampaignComponentType;
      contentId: string;
      isRequired: boolean;
    }
  | {
      itemType: 'GROUP';
      campaignItemId?: string;
      title: string;
      description?: string | null;
      groupType: CampaignGroupType;
      completionRule: CompletionRule;
      isRequired: boolean;
      children: Array<{
        itemType?: 'COMPONENT';
        campaignItemId?: string;
        componentType: CampaignComponentType;
        contentId: string;
        isRequired: boolean;
      }>;
    };

export type CampaignRepositoryFailureCode =
  | 'CAMPAIGN_NOT_FOUND'
  | 'CAMPAIGN_CHANGED'
  | 'CAMPAIGN_IMMUTABLE'
  | 'CAMPAIGN_LIFECYCLE_CONFLICT'
  | 'CAMPAIGN_ITEM_IDENTITY_CHANGED'
  | 'INVALID_CAMPAIGN_ITEM_ID'
  | 'UNAVAILABLE_CONTENT'
  | 'EMPTY_CAMPAIGN';

export type CampaignRepositoryFailure = {
  success: false;
  error: CampaignRepositoryFailureCode;
  contentType?: CampaignComponentType;
};

export type CampaignRepositorySuccess = {
  success: true;
  campaignId: string;
  status: CampaignStatus;
  updatedAt: Date;
};

export type CampaignRepositoryResult = CampaignRepositorySuccess | CampaignRepositoryFailure;

export class CampaignRepositoryAbort extends Error {
  constructor(readonly result: CampaignRepositoryFailure) {
    super(result.error);
    this.name = 'CampaignRepositoryAbort';
  }
}

export type CampaignTransitionCommand = {
  campaignId: string;
  organisationId: string | null;
  expectedStatus: CampaignStatus;
  targetStatus: CampaignStatus;
  expectedUpdatedAt: Date;
  requirements: {
    requireItems: boolean;
    requireAvailableSources: boolean;
  };
};

export async function findCampaignCatalogue(input: {
  page: number;
  limit: number;
  search?: string;
  type?: CampaignComponentType;
}) {
  const skip = (input.page - 1) * input.limit;
  const trainingSearch = input.search
    ? {
        OR: [
          { title: { contains: input.search, mode: 'insensitive' as const } },
          { contentSummary: { contains: input.search, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const quizSearch = input.search
    ? {
        OR: [
          { title: { contains: input.search, mode: 'insensitive' as const } },
          { description: { contains: input.search, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const simulationSearch = input.search
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
            ...trainingSearch,
          },
          select: {
            id: true,
            title: true,
            contentSummary: true,
            contentType: true,
            estimatedReadTimeMinutes: true,
            difficultyLevel: true,
            status: true,
            createdAt: true,
          },
        })
      : [],
    fetchQuizzes
      ? prisma.quiz.findMany({
          where: {
            status: 'PUBLISHED',
            ...quizSearch,
          },
          select: {
            id: true,
            title: true,
            description: true,
            passThresholdPercentage: true,
            difficultyLevel: true,
            status: true,
            createdAt: true,
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
            ...simulationSearch,
          },
          select: {
            id: true,
            title: true,
            description: true,
            difficultyLevel: true,
            createdAt: true,
            simulatedInbox: {
              select: {
                status: true,
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
  const paginatedItems = combined
    .slice(skip, skip + input.limit)
    .map(({ createdAt: _sortKey, ...item }) => item);

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
        items: {
          select: {
            itemType: true,
            componentType: true,
            trainingDocument: {
              select: {
                status: true,
              },
            },
            quiz: {
              select: {
                status: true,
              },
            },
            simulation: {
              select: {
                safetyStatus: true,
                simulatedInbox: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
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
      sourceFacts: campaign.items,
    })),
    total,
  };
}

function mapComponentItemDetail(item: {
  id: string;
  title: string;
  description: string | null;
  componentType: string | null;
  position: number;
  isRequired: boolean;
  trainingDocumentId: string | null;
  quizId: string | null;
  simulationId: string | null;
  trainingDocument?: { id: string; title: string; status: string } | null;
  quiz?: { id: string; title: string; description: string | null; status: string } | null;
  simulation?: {
    id: string;
    title: string;
    safetyStatus: string;
    simulatedInbox?: { status: string } | null;
  } | null;
}) {
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
    itemType: 'COMPONENT' as const,
    campaignItemId: item.id,
    componentType: item.componentType as CampaignComponentType,
    contentId,
    title,
    description,
    position: item.position,
    isRequired: item.isRequired,
    sourceAvailable,
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

  const topLevelItems = campaign.items.filter((item) => !item.parentGroupId);
  const childMap = new Map<string, typeof campaign.items>();

  for (const item of campaign.items) {
    if (item.parentGroupId) {
      const list = childMap.get(item.parentGroupId) ?? [];
      list.push(item);
      childMap.set(item.parentGroupId, list);
    }
  }

  const mappedItems = topLevelItems.map((item) => {
    if (item.itemType === 'GROUP') {
      const children = (childMap.get(item.id) ?? []).map(mapComponentItemDetail);

      return {
        itemType: 'GROUP' as const,
        campaignItemId: item.id,
        title: item.title,
        description: item.description,
        groupType: item.groupType as CampaignGroupType,
        completionRule: item.completionRule as CompletionRule,
        position: item.position,
        isRequired: item.isRequired,
        children,
      };
    }

    return mapComponentItemDetail(item);
  });

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
        }
      : null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    items: mappedItems,
  };
}

type ResolvedCampaignItemDetails =
  | {
      available: true;
      title: string;
      description: string | null;
      trainingDocumentId: string | null;
      quizId: string | null;
      simulationId: string | null;
    }
  | {
      available: false;
      contentType: CampaignComponentType;
    };

async function resolveCampaignItemDetails(
  tx: Prisma.TransactionClient,
  itemInput: { componentType: CampaignComponentType; contentId: string },
  _index: number = 0,
): Promise<ResolvedCampaignItemDetails> {
  if (itemInput.componentType === 'TRAINING_DOCUMENT') {
    const doc = await tx.trainingDocument.findUnique({
      where: { id: itemInput.contentId },
      select: {
        id: true,
        title: true,
        contentSummary: true,
        status: true,
      },
    });
    if (!doc || doc.status !== 'AVAILABLE') {
      return {
        available: false,
        contentType: 'TRAINING_DOCUMENT',
      };
    }
    return {
      available: true,
      title: doc.title,
      description: doc.contentSummary,
      trainingDocumentId: doc.id,
      quizId: null,
      simulationId: null,
    };
  }

  if (itemInput.componentType === 'QUIZ') {
    const quiz = await tx.quiz.findUnique({
      where: { id: itemInput.contentId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
      },
    });
    if (!quiz || quiz.status !== 'PUBLISHED') {
      return {
        available: false,
        contentType: 'QUIZ',
      };
    }
    return {
      available: true,
      title: quiz.title,
      description: quiz.description,
      trainingDocumentId: null,
      quizId: quiz.id,
      simulationId: null,
    };
  }

  const sim = await tx.simulation.findUnique({
    where: { id: itemInput.contentId },
    select: {
      id: true,
      title: true,
      description: true,
      safetyStatus: true,
      simulatedInbox: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!sim || sim.safetyStatus !== 'APPROVED' || sim.simulatedInbox?.status !== 'ACTIVE') {
    return {
      available: false,
      contentType: 'SIMULATED_INBOX',
    };
  }

  return {
    available: true,
    title: sim.title,
    description: sim.description,
    trainingDocumentId: null,
    quizId: null,
    simulationId: sim.id,
  };
}

function campaignScopeWhere(input: {
  campaignId: string;
  organisationId: string | null;
}): Prisma.CampaignWhereInput {
  return input.organisationId === null
    ? {
        id: input.campaignId,
        organisationId: null,
        campaignType: 'PREMADE_GENERAL',
      }
    : {
        id: input.campaignId,
        organisationId: input.organisationId,
        campaignType: 'ORGANISATION_CUSTOM',
      };
}

async function reserveTemporaryPositions(
  tx: Prisma.TransactionClient,
  _campaignId: string,
  existingItemIds: string[],
): Promise<void> {
  for (let index = 0; index < existingItemIds.length; index += 1) {
    await tx.campaignItem.update({
      where: {
        id: existingItemIds[index],
      },
      data: {
        position: -(index + 1),
      },
    });
  }
}

async function persistDraftComponentItem(
  tx: Prisma.TransactionClient,
  campaignId: string,
  itemInput: {
    campaignItemId?: string;
    componentType: CampaignComponentType;
    contentId: string;
    isRequired: boolean;
  },
  position: number,
  existingItems: { id: string }[],
  keptItemIds: Set<string>,
  parentGroupId: string | null = null,
  index: number = 0,
) {
  const details = await resolveCampaignItemDetails(tx, itemInput, index);
  if (!details.available) {
    throw new CampaignRepositoryAbort({
      success: false,
      error: 'UNAVAILABLE_CONTENT',
      contentType: details.contentType,
    });
  }

  const exists =
    itemInput.campaignItemId && existingItems.some((i) => i.id === itemInput.campaignItemId);

  if (exists && itemInput.campaignItemId) {
    await tx.campaignItem.update({
      where: { id: itemInput.campaignItemId },
      data: {
        parentGroupId,
        itemType: 'COMPONENT',
        groupType: null,
        completionRule: null,
        componentType: itemInput.componentType,
        title: details.title,
        description: details.description,
        position,
        isRequired: itemInput.isRequired,
        trainingDocumentId: details.trainingDocumentId,
        quizId: details.quizId,
        simulationId: details.simulationId,
      },
    });
    keptItemIds.add(itemInput.campaignItemId);
  } else {
    const created = await tx.campaignItem.create({
      data: {
        campaignId,
        parentGroupId,
        itemType: 'COMPONENT',
        componentType: itemInput.componentType,
        title: details.title,
        description: details.description,
        position,
        isRequired: itemInput.isRequired,
        trainingDocumentId: details.trainingDocumentId,
        quizId: details.quizId,
        simulationId: details.simulationId,
      },
    });
    keptItemIds.add(created.id);
  }
}

async function persistDraftGroupItem(
  tx: Prisma.TransactionClient,
  campaignId: string,
  groupInput: Extract<RepositoryCampaignItemInput, { itemType: 'GROUP' }>,
  position: number,
  existingItems: { id: string }[],
  keptItemIds: Set<string>,
) {
  let groupId = groupInput.campaignItemId;
  const exists = groupId && existingItems.some((i) => i.id === groupId);

  if (exists && groupId) {
    await tx.campaignItem.update({
      where: { id: groupId },
      data: {
        parentGroupId: null,
        itemType: 'GROUP',
        componentType: null,
        title: groupInput.title,
        description: groupInput.description ?? null,
        groupType: groupInput.groupType,
        completionRule: groupInput.completionRule,
        position,
        isRequired: groupInput.isRequired,
        trainingDocumentId: null,
        quizId: null,
        simulationId: null,
      },
    });
  } else {
    const createdGroup = await tx.campaignItem.create({
      data: {
        campaignId,
        itemType: 'GROUP',
        groupType: groupInput.groupType,
        completionRule: groupInput.completionRule,
        title: groupInput.title,
        description: groupInput.description ?? null,
        position,
        isRequired: groupInput.isRequired,
      },
    });
    groupId = createdGroup.id;
  }
  keptItemIds.add(groupId);

  for (let cIdx = 0; cIdx < groupInput.children.length; cIdx++) {
    await persistDraftComponentItem(
      tx,
      campaignId,
      groupInput.children[cIdx],
      (cIdx + 1) * 10,
      existingItems,
      keptItemIds,
      groupId,
      cIdx,
    );
  }
}

export async function createCampaignDraft(input: {
  organisationId: string | null;
  createdByUserId?: string | null;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  campaignType: CampaignType;
  startDate?: Date | null;
  endDate?: Date | null;
  items: RepositoryCampaignItemInput[];
}): Promise<CampaignRepositoryResult> {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const campaign = await tx.campaign.create({
        data: {
          organisationId: input.organisationId,
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

      const keptItemIds = new Set<string>();

      for (let index = 0; index < input.items.length; index++) {
        const itemInput = input.items[index];
        const position = (index + 1) * 10;

        if (itemInput.itemType === 'GROUP') {
          await persistDraftGroupItem(tx, campaign.id, itemInput, position, [], keptItemIds);
        } else {
          await persistDraftComponentItem(
            tx,
            campaign.id,
            itemInput,
            position,
            [],
            keptItemIds,
            null,
            index,
          );
        }
      }

      return {
        success: true as const,
        campaignId: campaign.id,
        status: campaign.status,
        updatedAt: campaign.updatedAt,
      };
    });
  } catch (error) {
    if (error instanceof CampaignRepositoryAbort) {
      return error.result;
    }
    throw error;
  }
}

function validateExistingComponentItemIdentity(
  existingItem: {
    itemType: string;
    componentType: string | null;
    trainingDocumentId: string | null;
    quizId: string | null;
    simulationId: string | null;
  },
  itemInput: { componentType: CampaignComponentType; contentId: string },
): boolean {
  if (
    existingItem.itemType !== 'COMPONENT' ||
    existingItem.componentType !== itemInput.componentType
  ) {
    return false;
  }
  if (itemInput.componentType === 'TRAINING_DOCUMENT') {
    return existingItem.trainingDocumentId === itemInput.contentId;
  }
  if (itemInput.componentType === 'QUIZ') {
    return existingItem.quizId === itemInput.contentId;
  }
  if (itemInput.componentType === 'SIMULATED_INBOX') {
    return existingItem.simulationId === itemInput.contentId;
  }
  return false;
}

function validateCampaignDraftItemIdentities(
  existingItems: {
    id: string;
    itemType: string;
    componentType: string | null;
    trainingDocumentId: string | null;
    quizId: string | null;
    simulationId: string | null;
  }[],
  items: RepositoryCampaignItemInput[],
): { valid: boolean; error?: CampaignRepositoryFailureCode } {
  for (const itemInput of items) {
    if (itemInput.itemType === 'GROUP') {
      if (itemInput.campaignItemId) {
        const existingGroup = existingItems.find((i) => i.id === itemInput.campaignItemId);
        if (!existingGroup) {
          return { valid: false, error: 'INVALID_CAMPAIGN_ITEM_ID' };
        }
        if (existingGroup.itemType !== 'GROUP') {
          return { valid: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' };
        }
      }
      for (const child of itemInput.children) {
        if (child.campaignItemId) {
          const existingChild = existingItems.find((i) => i.id === child.campaignItemId);
          if (!existingChild) {
            return { valid: false, error: 'INVALID_CAMPAIGN_ITEM_ID' };
          }
          if (!validateExistingComponentItemIdentity(existingChild, child)) {
            return { valid: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' };
          }
        }
      }
    } else if (itemInput.campaignItemId) {
      const existingItem = existingItems.find((i) => i.id === itemInput.campaignItemId);
      if (!existingItem) {
        return { valid: false, error: 'INVALID_CAMPAIGN_ITEM_ID' };
      }
      if (!validateExistingComponentItemIdentity(existingItem, itemInput)) {
        return { valid: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' };
      }
    }
  }
  return { valid: true };
}

export async function updateCampaignDraft(input: {
  campaignId: string;
  organisationId: string | null;
  expectedUpdatedAt: Date;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  items: RepositoryCampaignItemInput[];
}): Promise<CampaignRepositoryResult> {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claimed = await tx.campaign.updateMany({
        where: {
          ...campaignScopeWhere({
            campaignId: input.campaignId,
            organisationId: input.organisationId,
          }),
          status: 'DRAFT',
          updatedAt: input.expectedUpdatedAt,
        },
        data: {
          name: input.name,
          description: input.description ?? null,
          accentColor: input.accentColor ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.campaign.findFirst({
          where: campaignScopeWhere({
            campaignId: input.campaignId,
            organisationId: input.organisationId,
          }),
          select: {
            status: true,
            updatedAt: true,
          },
        });

        if (!current) {
          return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
          } as const;
        }

        if (current.status !== 'DRAFT') {
          return {
            success: false,
            error: 'CAMPAIGN_IMMUTABLE',
          } as const;
        }

        return {
          success: false,
          error: 'CAMPAIGN_CHANGED',
        } as const;
      }

      const existingItems = await tx.campaignItem.findMany({
        where: {
          campaignId: input.campaignId,
        },
        select: {
          id: true,
          itemType: true,
          componentType: true,
          parentGroupId: true,
          position: true,
          trainingDocumentId: true,
          quizId: true,
          simulationId: true,
        },
      });

      const identityCheck = validateCampaignDraftItemIdentities(existingItems, input.items);
      if (!identityCheck.valid) {
        throw new CampaignRepositoryAbort({
          success: false,
          error: identityCheck.error as CampaignRepositoryFailureCode,
        });
      }

      await reserveTemporaryPositions(
        tx,
        input.campaignId,
        existingItems.map((item) => item.id),
      );

      const keptItemIds = new Set<string>();

      for (let index = 0; index < input.items.length; index++) {
        const itemInput = input.items[index];
        const position = (index + 1) * 10;

        if (itemInput.itemType === 'GROUP') {
          await persistDraftGroupItem(
            tx,
            input.campaignId,
            itemInput,
            position,
            existingItems,
            keptItemIds,
          );
        } else {
          await persistDraftComponentItem(
            tx,
            input.campaignId,
            itemInput,
            position,
            existingItems,
            keptItemIds,
            null,
            index,
          );
        }
      }

      const itemIdsToDelete = existingItems
        .filter((item) => !keptItemIds.has(item.id))
        .map((item) => item.id);

      if (itemIdsToDelete.length > 0) {
        await tx.campaignItem.deleteMany({
          where: {
            id: { in: itemIdsToDelete },
          },
        });
      }

      const updatedCampaign = await tx.campaign.findUniqueOrThrow({
        where: {
          id: input.campaignId,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        campaignId: updatedCampaign.id,
        status: updatedCampaign.status,
        updatedAt: updatedCampaign.updatedAt,
      } as const;
    });
  } catch (error) {
    if (error instanceof CampaignRepositoryAbort) {
      return error.result;
    }
    throw error;
  }
}

type CampaignItemWithContent = {
  itemType: string;
  componentType: string | null;
  trainingDocument?: { status: string } | null;
  quiz?: { status: string } | null;
  simulation?: { safetyStatus: string; simulatedInbox?: { status: string } | null } | null;
};

function isComponentContentAvailable(item: CampaignItemWithContent): boolean {
  if (item.componentType === 'TRAINING_DOCUMENT') {
    return item.trainingDocument?.status === 'AVAILABLE';
  }
  if (item.componentType === 'QUIZ') {
    return item.quiz?.status === 'PUBLISHED';
  }
  if (item.componentType === 'SIMULATED_INBOX') {
    return (
      item.simulation?.safetyStatus === 'APPROVED' &&
      item.simulation.simulatedInbox?.status === 'ACTIVE'
    );
  }
  return true;
}

function checkItemsContentStatus(items: CampaignItemWithContent[]): boolean {
  return items.every((item) => {
    if (item.itemType === 'GROUP') {
      return true;
    }
    return isComponentContentAvailable(item);
  });
}

export async function transitionCampaign(
  command: CampaignTransitionCommand,
): Promise<CampaignRepositoryResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.campaign.updateMany({
        where: {
          ...campaignScopeWhere({
            campaignId: command.campaignId,
            organisationId: command.organisationId,
          }),
          status: command.expectedStatus,
          updatedAt: command.expectedUpdatedAt,
        },
        data: {
          status: command.targetStatus,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.campaign.findFirst({
          where: campaignScopeWhere({
            campaignId: command.campaignId,
            organisationId: command.organisationId,
          }),
          select: {
            status: true,
            updatedAt: true,
          },
        });

        if (!current) {
          return {
            success: false,
            error: 'CAMPAIGN_NOT_FOUND',
          } as const;
        }

        if (current.status !== command.expectedStatus) {
          return {
            success: false,
            error: 'CAMPAIGN_LIFECYCLE_CONFLICT',
          } as const;
        }

        return {
          success: false,
          error: 'CAMPAIGN_CHANGED',
        } as const;
      }

      if (command.requirements.requireItems || command.requirements.requireAvailableSources) {
        const items = await tx.campaignItem.findMany({
          where: {
            campaignId: command.campaignId,
          },
          select: {
            itemType: true,
            componentType: true,
            trainingDocument: {
              select: {
                status: true,
              },
            },
            quiz: {
              select: {
                status: true,
              },
            },
            simulation: {
              select: {
                safetyStatus: true,
                simulatedInbox: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        });

        if (command.requirements.requireItems && items.length === 0) {
          throw new CampaignRepositoryAbort({
            success: false,
            error: 'EMPTY_CAMPAIGN',
          });
        }

        if (command.requirements.requireAvailableSources && !checkItemsContentStatus(items)) {
          throw new CampaignRepositoryAbort({
            success: false,
            error: 'UNAVAILABLE_CONTENT',
          });
        }
      }

      const updated = await tx.campaign.findUniqueOrThrow({
        where: {
          id: command.campaignId,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        campaignId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      };
    });
  } catch (error) {
    if (error instanceof CampaignRepositoryAbort) {
      return error.result;
    }
    throw error;
  }
}
