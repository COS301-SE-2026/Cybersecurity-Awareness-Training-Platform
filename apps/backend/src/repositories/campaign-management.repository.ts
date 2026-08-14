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
      const children = (childMap.get(item.id) ?? []).map((child) => {
        let title = child.title;
        let description = child.description;
        let sourceAvailable = false;

        if (child.componentType === 'TRAINING_DOCUMENT' && child.trainingDocument) {
          title = child.trainingDocument.title;
          sourceAvailable = child.trainingDocument.status === 'AVAILABLE';
        } else if (child.componentType === 'QUIZ' && child.quiz) {
          title = child.quiz.title;
          description = child.quiz.description;
          sourceAvailable = child.quiz.status === 'PUBLISHED';
        } else if (child.componentType === 'SIMULATED_INBOX' && child.simulation) {
          title = child.simulation.title;
          sourceAvailable =
            child.simulation.safetyStatus === 'APPROVED' &&
            child.simulation.simulatedInbox?.status === 'ACTIVE';
        }

        const contentId = child.trainingDocumentId ?? child.quizId ?? child.simulationId ?? '';

        return {
          itemType: 'COMPONENT' as const,
          campaignItemId: child.id,
          componentType: child.componentType as CampaignComponentType,
          contentId,
          title,
          description,
          position: child.position,
          isRequired: child.isRequired,
          sourceAvailable,
        };
      });

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

async function resolveCampaignItemDetails(
  tx: Prisma.TransactionClient,
  itemInput: { componentType: CampaignComponentType; contentId: string },
  index: number,
) {
  let title = `Item ${index + 1}`;
  let description: string | null = null;

  if (itemInput.componentType === 'TRAINING_DOCUMENT') {
    const doc = await tx.trainingDocument.findUnique({ where: { id: itemInput.contentId } });
    if (!doc || doc.status !== 'AVAILABLE') {
      throw new Error(`TRAINING_DOCUMENT_UNAVAILABLE:${itemInput.contentId}`);
    }
    title = doc.title;
    description = doc.contentSummary;
  } else if (itemInput.componentType === 'QUIZ') {
    const quiz = await tx.quiz.findUnique({ where: { id: itemInput.contentId } });
    if (!quiz || quiz.status !== 'PUBLISHED') {
      throw new Error(`QUIZ_UNAVAILABLE:${itemInput.contentId}`);
    }
    title = quiz.title;
    description = quiz.description;
  } else if (itemInput.componentType === 'SIMULATED_INBOX') {
    const sim = await tx.simulation.findUnique({
      where: { id: itemInput.contentId },
      include: { simulatedInbox: true },
    });
    if (
      !sim ||
      sim.safetyStatus !== 'APPROVED' ||
      !sim.simulatedInbox ||
      sim.simulatedInbox.status !== 'ACTIVE'
    ) {
      throw new Error(`SIMULATION_UNAVAILABLE:${itemInput.contentId}`);
    }
    title = sim.title;
    description = sim.description;
  }

  return {
    title,
    description,
    trainingDocumentId:
      itemInput.componentType === 'TRAINING_DOCUMENT' ? itemInput.contentId : null,
    quizId: itemInput.componentType === 'QUIZ' ? itemInput.contentId : null,
    simulationId: itemInput.componentType === 'SIMULATED_INBOX' ? itemInput.contentId : null,
  };
}

function validateItemStructure(items: RepositoryCampaignItemInput[]): {
  valid: boolean;
  error?: string;
} {
  const seenSources = new Set<string>();
  const seenItemIds = new Set<string>();

  for (const item of items) {
    if (item.campaignItemId) {
      if (seenItemIds.has(item.campaignItemId)) {
        return { valid: false, error: 'DUPLICATE_CAMPAIGN_ITEM_ID' };
      }
      seenItemIds.add(item.campaignItemId);
    }

    if (item.itemType === 'GROUP') {
      if (!item.children || item.children.length < 2) {
        return { valid: false, error: 'GROUP_MIN_CHILDREN_REQUIRED' };
      }
      for (const child of item.children) {
        if (child.campaignItemId) {
          if (seenItemIds.has(child.campaignItemId)) {
            return { valid: false, error: 'DUPLICATE_CAMPAIGN_ITEM_ID' };
          }
          seenItemIds.add(child.campaignItemId);
        }
        const sourceKey = `${child.componentType}:${child.contentId}`;
        if (seenSources.has(sourceKey)) {
          return { valid: false, error: 'DUPLICATE_SOURCE' };
        }
        seenSources.add(sourceKey);
      }
    } else {
      const sourceKey = `${item.componentType}:${item.contentId}`;
      if (seenSources.has(sourceKey)) {
        return { valid: false, error: 'DUPLICATE_SOURCE' };
      }
      seenSources.add(sourceKey);
    }
  }

  return { valid: true };
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
  items: RepositoryCampaignItemInput[];
}) {
  if (input.campaignType === 'PREMADE_GENERAL' && input.organisationId !== null) {
    throw new Error('PREMADE_GENERAL campaigns must have null organisationId');
  }

  if (input.campaignType === 'ORGANISATION_CUSTOM' && !input.organisationId) {
    throw new Error('ORGANISATION_CUSTOM campaigns must have a valid organisationId');
  }

  const structureValidation = validateItemStructure(input.items);
  if (!structureValidation.valid) {
    throw new Error(structureValidation.error);
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

      if (itemInput.itemType === 'GROUP') {
        const group = await tx.campaignItem.create({
          data: {
            campaignId: campaign.id,
            itemType: 'GROUP',
            groupType: itemInput.groupType,
            completionRule: itemInput.completionRule,
            title: itemInput.title,
            description: itemInput.description ?? null,
            position,
            isRequired: itemInput.isRequired,
          },
        });

        for (let cIdx = 0; cIdx < itemInput.children.length; cIdx++) {
          const childInput = itemInput.children[cIdx];
          const childPosition = (cIdx + 1) * 10;
          const childDetails = await resolveCampaignItemDetails(tx, childInput, cIdx);

          await tx.campaignItem.create({
            data: {
              campaignId: campaign.id,
              parentGroupId: group.id,
              itemType: 'COMPONENT',
              componentType: childInput.componentType,
              title: childDetails.title,
              description: childDetails.description,
              position: childPosition,
              isRequired: childInput.isRequired,
              trainingDocumentId: childDetails.trainingDocumentId,
              quizId: childDetails.quizId,
              simulationId: childDetails.simulationId,
            },
          });
        }
      } else {
        const details = await resolveCampaignItemDetails(tx, itemInput, index);

        await tx.campaignItem.create({
          data: {
            campaignId: campaign.id,
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
      }
    }

    return campaign.id;
  });
}

export async function updateCampaignDraft(input: {
  campaignId: string;
  organisationId?: string | null;
  expectedUpdatedAt: Date;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  items: RepositoryCampaignItemInput[];
}) {
  const structureValidation = validateItemStructure(input.items);
  if (!structureValidation.valid) {
    return { success: false, error: structureValidation.error as string };
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.campaign.findUnique({
      where: { id: input.campaignId },
      include: { items: true },
    });

    if (!existing) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (input.organisationId !== undefined && existing.organisationId !== input.organisationId) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (existing.status !== 'DRAFT') {
      return { success: false, error: 'CAMPAIGN_IMMUTABLE' as const };
    }

    if (existing.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return { success: false, error: 'CAMPAIGN_CHANGED' as const };
    }

    for (const itemInput of input.items) {
      if (itemInput.itemType === 'GROUP') {
        if (itemInput.campaignItemId) {
          const existingGroup = existing.items.find((i) => i.id === itemInput.campaignItemId);
          if (!existingGroup) {
            return { success: false, error: 'INVALID_CAMPAIGN_ITEM_ID' as const };
          }
          if (existingGroup.itemType !== 'GROUP') {
            return { success: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' as const };
          }
        }
        for (const child of itemInput.children) {
          if (child.campaignItemId) {
            const existingChild = existing.items.find((i) => i.id === child.campaignItemId);
            if (!existingChild) {
              return { success: false, error: 'INVALID_CAMPAIGN_ITEM_ID' as const };
            }
            if (
              existingChild.itemType !== 'COMPONENT' ||
              existingChild.componentType !== child.componentType ||
              (child.componentType === 'TRAINING_DOCUMENT' &&
                existingChild.trainingDocumentId !== child.contentId) ||
              (child.componentType === 'QUIZ' && existingChild.quizId !== child.contentId) ||
              (child.componentType === 'SIMULATED_INBOX' &&
                existingChild.simulationId !== child.contentId)
            ) {
              return { success: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' as const };
            }
          }
        }
      } else {
        if (itemInput.campaignItemId) {
          const existingItem = existing.items.find((i) => i.id === itemInput.campaignItemId);
          if (!existingItem) {
            return { success: false, error: 'INVALID_CAMPAIGN_ITEM_ID' as const };
          }
          if (
            existingItem.itemType !== 'COMPONENT' ||
            existingItem.componentType !== itemInput.componentType ||
            (itemInput.componentType === 'TRAINING_DOCUMENT' &&
              existingItem.trainingDocumentId !== itemInput.contentId) ||
            (itemInput.componentType === 'QUIZ' && existingItem.quizId !== itemInput.contentId) ||
            (itemInput.componentType === 'SIMULATED_INBOX' &&
              existingItem.simulationId !== itemInput.contentId)
          ) {
            return { success: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' as const };
          }
        }
      }
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

      if (itemInput.itemType === 'GROUP') {
        let groupId = itemInput.campaignItemId;

        if (groupId && existing.items.some((i) => i.id === groupId)) {
          await tx.campaignItem.update({
            where: { id: groupId },
            data: {
              title: itemInput.title,
              description: itemInput.description ?? null,
              groupType: itemInput.groupType,
              completionRule: itemInput.completionRule,
              position,
              isRequired: itemInput.isRequired,
            },
          });
        } else {
          const newGroup = await tx.campaignItem.create({
            data: {
              campaignId: input.campaignId,
              itemType: 'GROUP',
              groupType: itemInput.groupType,
              completionRule: itemInput.completionRule,
              title: itemInput.title,
              description: itemInput.description ?? null,
              position,
              isRequired: itemInput.isRequired,
            },
          });
          groupId = newGroup.id;
        }
        keptItemIds.add(groupId);

        for (let cIdx = 0; cIdx < itemInput.children.length; cIdx++) {
          const childInput = itemInput.children[cIdx];
          const childPosition = (cIdx + 1) * 10;
          const childDetails = await resolveCampaignItemDetails(tx, childInput, cIdx);

          if (
            childInput.campaignItemId &&
            existing.items.some((i) => i.id === childInput.campaignItemId)
          ) {
            await tx.campaignItem.update({
              where: { id: childInput.campaignItemId },
              data: {
                parentGroupId: groupId,
                componentType: childInput.componentType,
                title: childDetails.title,
                description: childDetails.description,
                position: childPosition,
                isRequired: childInput.isRequired,
                trainingDocumentId: childDetails.trainingDocumentId,
                quizId: childDetails.quizId,
                simulationId: childDetails.simulationId,
              },
            });
            keptItemIds.add(childInput.campaignItemId);
          } else {
            const newChild = await tx.campaignItem.create({
              data: {
                campaignId: input.campaignId,
                parentGroupId: groupId,
                itemType: 'COMPONENT',
                componentType: childInput.componentType,
                title: childDetails.title,
                description: childDetails.description,
                position: childPosition,
                isRequired: childInput.isRequired,
                trainingDocumentId: childDetails.trainingDocumentId,
                quizId: childDetails.quizId,
                simulationId: childDetails.simulationId,
              },
            });
            keptItemIds.add(newChild.id);
          }
        }
      } else {
        const details = await resolveCampaignItemDetails(tx, itemInput, index);

        if (
          itemInput.campaignItemId &&
          existing.items.some((i) => i.id === itemInput.campaignItemId)
        ) {
          await tx.campaignItem.update({
            where: { id: itemInput.campaignItemId },
            data: {
              parentGroupId: null,
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
          const newItem = await tx.campaignItem.create({
            data: {
              campaignId: input.campaignId,
              parentGroupId: null,
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
          keptItemIds.add(newItem.id);
        }
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
  itemType: string;
  componentType: string | null;
  trainingDocument?: { status: string } | null;
  quiz?: { status: string } | null;
  simulation?: { safetyStatus: string; simulatedInbox?: { status: string } | null } | null;
};

function checkItemsContentStatus(items: CampaignItemWithContent[]): boolean {
  for (const item of items) {
    if (item.itemType === 'GROUP') {
      continue;
    }
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
  organisationId?: string | null,
  expectedUpdatedAt?: Date,
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

    if (organisationId !== undefined && campaign.organisationId !== organisationId) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (campaign.status !== 'DRAFT') {
      return { success: false, error: 'CAMPAIGN_LIFECYCLE_CONFLICT' as const };
    }

    if (expectedUpdatedAt && campaign.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return { success: false, error: 'CAMPAIGN_CHANGED' as const };
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
  organisationId?: string | null,
  expectedUpdatedAt?: Date,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (organisationId !== undefined && campaign.organisationId !== organisationId) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (campaign.status !== 'ACTIVE') {
      return { success: false, error: 'CAMPAIGN_LIFECYCLE_CONFLICT' as const };
    }

    if (expectedUpdatedAt && campaign.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return { success: false, error: 'CAMPAIGN_CHANGED' as const };
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
  organisationId?: string | null,
  expectedUpdatedAt?: Date,
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

    if (organisationId !== undefined && campaign.organisationId !== organisationId) {
      return { success: false, error: 'CAMPAIGN_NOT_FOUND' as const };
    }

    if (campaign.status !== 'ARCHIVED') {
      return { success: false, error: 'CAMPAIGN_LIFECYCLE_CONFLICT' as const };
    }

    if (expectedUpdatedAt && campaign.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return { success: false, error: 'CAMPAIGN_CHANGED' as const };
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
