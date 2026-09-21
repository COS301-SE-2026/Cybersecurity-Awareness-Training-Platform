import { prisma } from '../lib/prisma.js';
import type { ContentCategoryDto, DifficultyLevelDto } from '@insightful-phish/shared';
import { sharedAdaptiveSlotCategories } from '../services/adaptive-slot-categories.js';
import type {
  Prisma,
  CampaignComponentType,
  CampaignGroupType,
  CampaignStatus,
  CampaignType,
  CompletionRule,
  ContentCategory,
  QuizScorePolicy,
} from '../generated/prisma/client.js';

export type RepositoryCampaignComponentInput = {
  itemType?: 'COMPONENT';
  campaignItemId?: string;
  componentType: CampaignComponentType;
  contentId: string;
  isRequired: boolean;
} & (
  | {
      componentType: 'QUIZ';
      maxAttempts: number;
      scorePolicy: QuizScorePolicy;
    }
  | {
      componentType: Exclude<CampaignComponentType, 'QUIZ'>;
    }
);

export type RepositoryCampaignAdaptiveInput = {
  itemType: 'ADAPTIVE';
  campaignItemId?: string;
  componentType: CampaignComponentType;
  alternatives: Record<DifficultyLevelDto, { contentId: string }>;
  isRequired: boolean;
} & (
  | {
      componentType: 'QUIZ';
      maxAttempts: number;
      scorePolicy: QuizScorePolicy;
    }
  | {
      componentType: Exclude<CampaignComponentType, 'QUIZ'>;
    }
);

type RepositoryCampaignConsumableInput =
  | RepositoryCampaignComponentInput
  | RepositoryCampaignAdaptiveInput;

export type RepositoryCampaignItemInput =
  | RepositoryCampaignConsumableInput
  | {
      itemType: 'GROUP';
      campaignItemId?: string;
      title: string;
      description?: string | null;
      groupType: CampaignGroupType;
      completionRule: CompletionRule;
      isRequired: boolean;
      children: RepositoryCampaignConsumableInput[];
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

function reusableContentOwnershipWhere(organisationId: string | null) {
  return organisationId === null
    ? { organisationId: null }
    : { OR: [{ organisationId: null }, { organisationId }] };
}

export async function findCampaignCatalogue(input: {
  page: number;
  limit: number;
  search?: string;
  type?: CampaignComponentType;
  category?: ContentCategory;
  organisationId?: string | null;
}) {
  const skip = (input.page - 1) * input.limit;
  const ownershipWhere =
    input.organisationId === undefined ? {} : reusableContentOwnershipWhere(input.organisationId);

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
            AND: [
              ownershipWhere,
              input.category ? { categories: { has: input.category } } : {},
              trainingSearch,
            ],
          },
          select: {
            id: true,
            organisationId: true,
            title: true,
            contentSummary: true,
            contentType: true,
            estimatedReadTimeMinutes: true,
            difficultyLevel: true,
            categories: true,
            status: true,
            createdAt: true,
          },
        })
      : [],
    fetchQuizzes
      ? prisma.quiz.findMany({
          where: {
            status: 'PUBLISHED',
            AND: [
              ownershipWhere,
              input.category
                ? { questions: { some: { categories: { has: input.category } } } }
                : {},
              quizSearch,
            ],
          },
          select: {
            id: true,
            organisationId: true,
            title: true,
            description: true,
            passThresholdPercentage: true,
            difficultyLevel: true,
            status: true,
            createdAt: true,
            questions: {
              select: { categories: true },
            },
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
              ...(input.category
                ? { emails: { some: { categories: { has: input.category } } } }
                : {}),
            },
            AND: [ownershipWhere, simulationSearch],
          },
          select: {
            id: true,
            organisationId: true,
            title: true,
            description: true,
            difficultyLevel: true,
            createdAt: true,
            simulatedInbox: {
              select: {
                status: true,
                emails: {
                  select: { categories: true },
                },
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
      organisationId: doc.organisationId,
      type: 'TRAINING_DOCUMENT' as const,
      title: doc.title,
      description: doc.contentSummary,
      contentType: doc.contentType,
      estimatedReadTimeMinutes: doc.estimatedReadTimeMinutes,
      difficultyLevel: doc.difficultyLevel,
      categories: doc.categories,
      status: doc.status,
      createdAt: doc.createdAt,
    })),
    ...quizzes.map((quiz) => ({
      id: quiz.id,
      organisationId: quiz.organisationId,
      type: 'QUIZ' as const,
      title: quiz.title,
      description: quiz.description,
      passThresholdPercentage: quiz.passThresholdPercentage,
      questionCount: quiz._count.questions,
      difficultyLevel: quiz.difficultyLevel,
      categories: [...new Set(quiz.questions.flatMap((question) => question.categories))],
      status: quiz.status,
      createdAt: quiz.createdAt,
    })),
    ...simulations.map((sim) => ({
      id: sim.id,
      organisationId: sim.organisationId,
      type: 'SIMULATED_INBOX' as const,
      title: sim.title,
      description: sim.description,
      emailCount: sim.simulatedInbox?._count.emails ?? 0,
      difficultyLevel: sim.difficultyLevel,
      categories: [
        ...new Set((sim.simulatedInbox?.emails ?? []).flatMap((email) => email.categories)),
      ],
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
                organisationId: true,
                status: true,
              },
            },
            quiz: {
              select: {
                organisationId: true,
                status: true,
              },
            },
            simulation: {
              select: {
                organisationId: true,
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

function mapComponentItemDetail(
  item: {
    id: string;
    title: string;
    description: string | null;
    componentType: string | null;
    position: number;
    isRequired: boolean;
    trainingDocumentId: string | null;
    quizId: string | null;
    quizMaxAttempts: number;
    quizScorePolicy: QuizScorePolicy;
    simulationId: string | null;
    trainingDocument?: {
      id: string;
      organisationId: string | null;
      title: string;
      status: string;
    } | null;
    quiz?: {
      id: string;
      organisationId: string | null;
      title: string;
      description: string | null;
      status: string;
    } | null;
    simulation?: {
      id: string;
      organisationId: string | null;
      title: string;
      safetyStatus: string;
      simulatedInbox?: { status: string } | null;
    } | null;
  },
  organisationId: string | null,
) {
  let title = item.title;
  let description = item.description;
  let sourceAvailable = false;

  const isOwnedContentVisible = (contentOrganisationId: string | null) =>
    contentOrganisationId === null || contentOrganisationId === organisationId;

  if (
    item.componentType === 'TRAINING_DOCUMENT' &&
    item.trainingDocument &&
    isOwnedContentVisible(item.trainingDocument.organisationId)
  ) {
    title = item.trainingDocument.title;
    sourceAvailable = item.trainingDocument.status === 'AVAILABLE';
  } else if (
    item.componentType === 'QUIZ' &&
    item.quiz &&
    isOwnedContentVisible(item.quiz.organisationId)
  ) {
    title = item.quiz.title;
    description = item.quiz.description;
    sourceAvailable = item.quiz.status === 'PUBLISHED';
  } else if (
    item.componentType === 'SIMULATED_INBOX' &&
    item.simulation &&
    isOwnedContentVisible(item.simulation.organisationId)
  ) {
    title = item.simulation.title;
    sourceAvailable =
      item.simulation.safetyStatus === 'APPROVED' &&
      item.simulation.simulatedInbox?.status === 'ACTIVE';
  }

  const contentId = item.trainingDocumentId ?? item.quizId ?? item.simulationId ?? '';

  const common = {
    itemType: 'COMPONENT' as const,
    campaignItemId: item.id,
    contentId,
    title,
    description,
    position: item.position,
    isRequired: item.isRequired,
    sourceAvailable,
  };

  if (item.componentType === 'QUIZ') {
    return {
      ...common,
      componentType: 'QUIZ' as const,
      maxAttempts: item.quizMaxAttempts,
      scorePolicy: item.quizScorePolicy,
    };
  }

  return {
    ...common,
    componentType: item.componentType as 'TRAINING_DOCUMENT' | 'SIMULATED_INBOX',
  };
}

type AdaptiveAlternativeDetail = {
  difficulty: DifficultyLevelDto;
  trainingDocumentId: string | null;
  quizId: string | null;
  simulationId: string | null;
  trainingDocument: {
    organisationId: string | null;
    status: string;
    difficultyLevel: DifficultyLevelDto;
  } | null;
  quiz: {
    organisationId: string | null;
    status: string;
    difficultyLevel: DifficultyLevelDto;
  } | null;
  simulation: {
    organisationId: string | null;
    safetyStatus: string;
    difficultyLevel: DifficultyLevelDto;
    simulatedInbox: { status: string } | null;
  } | null;
};

function mapAdaptiveItemDetail(
  item: {
    id: string;
    title: string;
    description: string | null;
    componentType: CampaignComponentType | null;
    position: number;
    isRequired: boolean;
    quizMaxAttempts: number;
    quizScorePolicy: QuizScorePolicy;
    adaptiveAlternatives: AdaptiveAlternativeDetail[];
  },
  organisationId: string | null,
) {
  const alternatives = Object.fromEntries(
    item.adaptiveAlternatives.map((alternative) => [
      alternative.difficulty,
      {
        contentId:
          alternative.trainingDocumentId ?? alternative.quizId ?? alternative.simulationId ?? '',
      },
    ]),
  ) as Record<DifficultyLevelDto, { contentId: string }>;
  const sourceAvailable =
    item.adaptiveAlternatives.length === ADAPTIVE_DIFFICULTIES.length &&
    item.adaptiveAlternatives.every(
      (alternative) =>
        alternative.difficulty ===
          (alternative.trainingDocument?.difficultyLevel ??
            alternative.quiz?.difficultyLevel ??
            alternative.simulation?.difficultyLevel) &&
        isComponentContentAvailable(
          {
            itemType: 'ADAPTIVE',
            componentType: item.componentType,
            trainingDocument: alternative.trainingDocument,
            quiz: alternative.quiz,
            simulation: alternative.simulation,
          },
          organisationId,
        ),
    );
  const common = {
    itemType: 'ADAPTIVE' as const,
    campaignItemId: item.id,
    alternatives,
    title: item.title,
    description: item.description,
    position: item.position,
    isRequired: item.isRequired,
    sourceAvailable,
  };
  return item.componentType === 'QUIZ'
    ? {
        ...common,
        componentType: 'QUIZ' as const,
        maxAttempts: item.quizMaxAttempts,
        scorePolicy: item.quizScorePolicy,
      }
    : {
        ...common,
        componentType: item.componentType as 'TRAINING_DOCUMENT' | 'SIMULATED_INBOX',
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
          trainingDocument: {
            select: { id: true, organisationId: true, title: true, status: true },
          },
          quiz: {
            select: {
              id: true,
              organisationId: true,
              title: true,
              description: true,
              status: true,
            },
          },
          simulation: {
            select: {
              id: true,
              organisationId: true,
              title: true,
              safetyStatus: true,
              simulatedInbox: { select: { status: true } },
            },
          },
          adaptiveAlternatives: {
            select: {
              difficulty: true,
              trainingDocumentId: true,
              quizId: true,
              simulationId: true,
              trainingDocument: {
                select: { organisationId: true, status: true, difficultyLevel: true },
              },
              quiz: {
                select: { organisationId: true, status: true, difficultyLevel: true },
              },
              simulation: {
                select: {
                  organisationId: true,
                  safetyStatus: true,
                  difficultyLevel: true,
                  simulatedInbox: { select: { status: true } },
                },
              },
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
      const children = (childMap.get(item.id) ?? []).map((child) =>
        child.itemType === 'ADAPTIVE'
          ? mapAdaptiveItemDetail(child, campaign.organisationId)
          : mapComponentItemDetail(child, campaign.organisationId),
      );

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

    return item.itemType === 'ADAPTIVE'
      ? mapAdaptiveItemDetail(item, campaign.organisationId)
      : mapComponentItemDetail(item, campaign.organisationId);
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
      difficulty: DifficultyLevelDto;
      categories: ContentCategoryDto[];
    }
  | {
      available: false;
      contentType: CampaignComponentType;
    };

async function resolveCampaignItemDetails(
  tx: Prisma.TransactionClient,
  itemInput: { componentType: CampaignComponentType; contentId: string },
  organisationId: string | null,
): Promise<ResolvedCampaignItemDetails> {
  if (itemInput.componentType === 'TRAINING_DOCUMENT') {
    const doc = await tx.trainingDocument.findFirst({
      where: {
        id: itemInput.contentId,
        ...reusableContentOwnershipWhere(organisationId),
      },
      select: {
        id: true,
        title: true,
        contentSummary: true,
        status: true,
        difficultyLevel: true,
        categories: true,
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
      difficulty: doc.difficultyLevel,
      categories: doc.categories,
    };
  }

  if (itemInput.componentType === 'QUIZ') {
    const quiz = await tx.quiz.findFirst({
      where: {
        id: itemInput.contentId,
        ...reusableContentOwnershipWhere(organisationId),
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        difficultyLevel: true,
        questions: { select: { categories: true } },
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
      difficulty: quiz.difficultyLevel,
      categories: [...new Set(quiz.questions.flatMap((question) => question.categories))],
    };
  }

  const sim = await tx.simulation.findFirst({
    where: {
      id: itemInput.contentId,
      ...reusableContentOwnershipWhere(organisationId),
    },
    select: {
      id: true,
      title: true,
      description: true,
      safetyStatus: true,
      difficultyLevel: true,
      simulatedInbox: {
        select: {
          status: true,
          emails: { select: { categories: true } },
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
    difficulty: sim.difficultyLevel,
    categories: [...new Set(sim.simulatedInbox.emails.flatMap((email) => email.categories))],
  };
}

const ADAPTIVE_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

async function resolveAdaptiveAlternatives(
  tx: Prisma.TransactionClient,
  itemInput: RepositoryCampaignAdaptiveInput,
  organisationId: string | null,
) {
  const resolved = await Promise.all(
    ADAPTIVE_DIFFICULTIES.map(async (difficulty) => {
      const details = await resolveCampaignItemDetails(
        tx,
        {
          componentType: itemInput.componentType,
          contentId: itemInput.alternatives[difficulty].contentId,
        },
        organisationId,
      );
      if (!details.available || details.difficulty !== difficulty) {
        throw new CampaignRepositoryAbort({
          success: false,
          error: 'UNAVAILABLE_CONTENT',
          contentType: itemInput.componentType,
        });
      }
      return { difficulty, details };
    }),
  );
  if (!sharedAdaptiveSlotCategories(resolved.map(({ details }) => details.categories))) {
    throw new CampaignRepositoryAbort({
      success: false,
      error: 'UNAVAILABLE_CONTENT',
      contentType: itemInput.componentType,
    });
  }
  return resolved;
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
  organisationId: string | null,
  itemInput: RepositoryCampaignComponentInput,
  position: number,
  existingItems: { id: string }[],
  keptItemIds: Set<string>,
  parentGroupId: string | null = null,
) {
  const details = await resolveCampaignItemDetails(tx, itemInput, organisationId);
  if (!details.available) {
    throw new CampaignRepositoryAbort({
      success: false,
      error: 'UNAVAILABLE_CONTENT',
      contentType: details.contentType,
    });
  }

  const quizSettings =
    itemInput.componentType === 'QUIZ'
      ? {
          quizMaxAttempts: itemInput.maxAttempts,
          quizScorePolicy: itemInput.scorePolicy,
        }
      : {};

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
        ...quizSettings,
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
        ...quizSettings,
      },
    });
    keptItemIds.add(created.id);
  }
}

async function persistDraftAdaptiveItem(
  tx: Prisma.TransactionClient,
  campaignId: string,
  organisationId: string | null,
  itemInput: RepositoryCampaignAdaptiveInput,
  position: number,
  existingItems: { id: string }[],
  keptItemIds: Set<string>,
  parentGroupId: string | null = null,
) {
  const alternatives = await resolveAdaptiveAlternatives(tx, itemInput, organisationId);
  const representative = alternatives.find(({ difficulty }) => difficulty === 'MEDIUM')!.details;
  const quizSettings =
    itemInput.componentType === 'QUIZ'
      ? {
          quizMaxAttempts: itemInput.maxAttempts,
          quizScorePolicy: itemInput.scorePolicy,
        }
      : {};
  const exists =
    itemInput.campaignItemId && existingItems.some((item) => item.id === itemInput.campaignItemId);

  let campaignItemId = itemInput.campaignItemId;
  if (exists && campaignItemId) {
    await tx.campaignItem.update({
      where: { id: campaignItemId },
      data: {
        parentGroupId,
        itemType: 'ADAPTIVE',
        componentType: itemInput.componentType,
        groupType: null,
        completionRule: null,
        title: representative.title,
        description: representative.description,
        position,
        isRequired: itemInput.isRequired,
        trainingDocumentId: null,
        quizId: null,
        simulationId: null,
        ...quizSettings,
      },
    });
  } else {
    const created = await tx.campaignItem.create({
      data: {
        campaignId,
        parentGroupId,
        itemType: 'ADAPTIVE',
        componentType: itemInput.componentType,
        title: representative.title,
        description: representative.description,
        position,
        isRequired: itemInput.isRequired,
        ...quizSettings,
      },
    });
    campaignItemId = created.id;
    await tx.campaignAdaptiveAlternative.createMany({
      data: alternatives.map(({ difficulty, details }) => ({
        campaignItemId: created.id,
        difficulty,
        trainingDocumentId: details.trainingDocumentId,
        quizId: details.quizId,
        simulationId: details.simulationId,
      })),
    });
  }
  keptItemIds.add(campaignItemId);
}

async function persistDraftConsumableItem(
  tx: Prisma.TransactionClient,
  campaignId: string,
  organisationId: string | null,
  itemInput: RepositoryCampaignConsumableInput,
  position: number,
  existingItems: { id: string }[],
  keptItemIds: Set<string>,
  parentGroupId: string | null = null,
) {
  if (itemInput.itemType === 'ADAPTIVE') {
    return persistDraftAdaptiveItem(
      tx,
      campaignId,
      organisationId,
      itemInput,
      position,
      existingItems,
      keptItemIds,
      parentGroupId,
    );
  }
  return persistDraftComponentItem(
    tx,
    campaignId,
    organisationId,
    itemInput,
    position,
    existingItems,
    keptItemIds,
    parentGroupId,
  );
}

async function persistDraftGroupItem(
  tx: Prisma.TransactionClient,
  campaignId: string,
  organisationId: string | null,
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
    await persistDraftConsumableItem(
      tx,
      campaignId,
      organisationId,
      groupInput.children[cIdx],
      (cIdx + 1) * 10,
      existingItems,
      keptItemIds,
      groupId,
    );
  }
}

type createCampaignDraftRepositoryInput = {
  organisationId: string | null;
  createdByUserId?: string | null;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  campaignType: CampaignType;
  startDate?: Date | null;
  endDate?: Date | null;
  items: RepositoryCampaignItemInput[];
};

async function createCampaignDraftInTransaction(
  tx: Prisma.TransactionClient,
  input: createCampaignDraftRepositoryInput,
) {
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
      await persistDraftGroupItem(
        tx,
        campaign.id,
        input.organisationId,
        itemInput,
        position,
        [],
        keptItemIds,
      );
    } else {
      await persistDraftComponentItem(
        tx,
        campaign.id,
        input.organisationId,
        itemInput,
        position,
        [],
        keptItemIds,
        null,
      );
    }
  }

  return {
    campaign,
    result: {
      success: true as const,
      campaignId: campaign.id,
      status: campaign.status,
      updatedAt: campaign.updatedAt,
    },
  };
}

export async function createCampaignDraft(
  input: createCampaignDraftRepositoryInput,
): Promise<CampaignRepositoryResult> {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await createCampaignDraftInTransaction(tx, input);
      return created.result;
    });
  } catch (error) {
    if (error instanceof CampaignRepositoryAbort) {
      return error.result;
    }
    throw error;
  }
}

export async function copyActiveCampaignToDraft(input: {
  campaignId: string;
  organisationId: string | null;
  createdByUserId: string;
}): Promise<CampaignRepositoryResult> {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const scopedSource = await tx.campaign.findFirst({
        where: campaignScopeWhere({
          campaignId: input.campaignId,
          organisationId: input.organisationId,
        }),
        select: { id: true },
      });

      if (!scopedSource) {
        return {
          success: false,
          error: 'CAMPAIGN_NOT_FOUND',
        } as const;
      }

      await tx.$executeRaw`
      SELECT "id"
      FROM "Campaign"
      WHERE "id" = ${scopedSource.id}
      FOR UPDATE
      `;

      const source = await tx.campaign.findFirst({
        where: campaignScopeWhere({
          campaignId: input.campaignId,
          organisationId: input.organisationId,
        }),
        include: {
          items: {
            orderBy: { position: 'asc' },
          },
          prerequisites: {
            select: {
              prerequisiteCampaignId: true,
              requirementType: true,
            },
          },
        },
      });

      if (!source) {
        return {
          success: false,
          error: 'CAMPAIGN_NOT_FOUND',
        } as const;
      }

      if (source.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'CAMPAIGN_LIFECYCLE_CONFLICT',
        } as const;
      }

        if (itemInput.itemType === 'GROUP') {
          await persistDraftGroupItem(
            tx,
            campaign.id,
            input.organisationId,
            itemInput,
            position,
            [],
            keptItemIds,
          );
        } else {
          await persistDraftConsumableItem(
            tx,
            campaign.id,
            input.organisationId,
            itemInput,
            position,
            [],
            keptItemIds,
            null,
          );
        }

        if (item.componentType === 'QUIZ' && item.quizId) {
          return {
            ...common,
            componentType: 'QUIZ',
            contentId: item.quizId,
            maxAttempts: item.quizMaxAttempts,
            scorePolicy: item.quizScorePolicy,
          };
        }

        if (item.componentType === 'SIMULATED_INBOX' && item.simulationId) {
          return {
            ...common,
            componentType: 'SIMULATED_INBOX',
            contentId: item.simulationId,
          };
        }

        throw new CampaignRepositoryAbort({
          success: false,
          error: 'UNAVAILABLE_CONTENT',
          contentType: item.componentType ?? undefined,
        });
      };

      const childrenByGroupId = new Map<string, typeof source.items>();

      for (const item of source.items) {
        if (!item.parentGroupId) continue;
        const children = childrenByGroupId.get(item.parentGroupId) ?? [];
        children.push(item);
        childrenByGroupId.set(item.parentGroupId, children);
      }

      const copiedItems: RepositoryCampaignItemInput[] = source.items
        .filter((item) => !item.parentGroupId)
        .map((item) => {
          if (item.itemType !== 'GROUP') {
            return toComponentInput(item);
          }

          if (!item.groupType || !item.completionRule) {
            throw new CampaignRepositoryAbort({
              success: false,
              error: 'CAMPAIGN_LIFECYCLE_CONFLICT',
            });
          }

          return {
            itemType: 'GROUP' as const,
            title: item.title,
            description: item.description,
            groupType: item.groupType,
            completionRule: item.completionRule,
            isRequired: item.isRequired,
            children: (childrenByGroupId.get(item.id) ?? []).map(toComponentInput),
          };
        });

      const created = await createCampaignDraftInTransaction(tx, {
        organisationId: source.organisationId,
        createdByUserId: input.createdByUserId,
        name: `${source.name.slice(0, 193)} (Copy)`,
        description: source.description,
        accentColor: source.accentColor,
        campaignType: source.campaignType,
        startDate: null,
        endDate: null,
        items: copiedItems,
      });

      if (source.prerequisites.length > 0) {
        await tx.campaignPrerequisite.createMany({
          data: source.prerequisites.map((prerequisite) => ({
            campaignId: created.campaign.id,
            prerequisiteCampaignId: prerequisite.prerequisiteCampaignId,
            requirementType: prerequisite.requirementType,
          })),
        });
      }

      return created.result;
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

type ExistingCampaignItemIdentity = {
  id: string;
  itemType: string;
  componentType: string | null;
  trainingDocumentId: string | null;
  quizId: string | null;
  simulationId: string | null;
  adaptiveAlternatives: Array<{
    difficulty: DifficultyLevelDto;
    trainingDocumentId: string | null;
    quizId: string | null;
    simulationId: string | null;
  }>;
};

function validateExistingAdaptiveItemIdentity(
  existingItem: ExistingCampaignItemIdentity,
  itemInput: RepositoryCampaignAdaptiveInput,
): boolean {
  if (
    existingItem.itemType !== 'ADAPTIVE' ||
    existingItem.componentType !== itemInput.componentType ||
    existingItem.adaptiveAlternatives.length !== ADAPTIVE_DIFFICULTIES.length
  ) {
    return false;
  }
  return ADAPTIVE_DIFFICULTIES.every((difficulty) => {
    const existing = existingItem.adaptiveAlternatives.find(
      (alternative) => alternative.difficulty === difficulty,
    );
    const contentId =
      existing?.trainingDocumentId ?? existing?.quizId ?? existing?.simulationId ?? null;
    return contentId === itemInput.alternatives[difficulty].contentId;
  });
}

function validateExistingConsumableItemIdentity(
  existingItem: ExistingCampaignItemIdentity,
  itemInput: RepositoryCampaignConsumableInput,
): boolean {
  return itemInput.itemType === 'ADAPTIVE'
    ? validateExistingAdaptiveItemIdentity(existingItem, itemInput)
    : validateExistingComponentItemIdentity(existingItem, itemInput);
}

function validateCampaignDraftItemIdentities(
  existingItems: ExistingCampaignItemIdentity[],
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
          if (!validateExistingConsumableItemIdentity(existingChild, child)) {
            return { valid: false, error: 'CAMPAIGN_ITEM_IDENTITY_CHANGED' };
          }
        }
      }
    } else if (itemInput.campaignItemId) {
      const existingItem = existingItems.find((i) => i.id === itemInput.campaignItemId);
      if (!existingItem) {
        return { valid: false, error: 'INVALID_CAMPAIGN_ITEM_ID' };
      }
      if (!validateExistingConsumableItemIdentity(existingItem, itemInput)) {
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
          adaptiveAlternatives: {
            select: {
              difficulty: true,
              trainingDocumentId: true,
              quizId: true,
              simulationId: true,
            },
          },
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
            input.organisationId,
            itemInput,
            position,
            existingItems,
            keptItemIds,
          );
        } else {
          await persistDraftConsumableItem(
            tx,
            input.campaignId,
            input.organisationId,
            itemInput,
            position,
            existingItems,
            keptItemIds,
            null,
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
  trainingDocument?: {
    organisationId: string | null;
    status: string;
    difficultyLevel?: DifficultyLevelDto;
    categories?: ContentCategoryDto[];
  } | null;
  quiz?: {
    organisationId: string | null;
    status: string;
    difficultyLevel?: DifficultyLevelDto;
    questions?: Array<{ categories: ContentCategoryDto[] }>;
  } | null;
  simulation?: {
    organisationId: string | null;
    safetyStatus: string;
    difficultyLevel?: DifficultyLevelDto;
    simulatedInbox?: {
      status: string;
      emails?: Array<{ categories: ContentCategoryDto[] }>;
    } | null;
  } | null;
  adaptiveAlternatives?: Array<
    Omit<CampaignItemWithContent, 'itemType' | 'componentType' | 'adaptiveAlternatives'> & {
      difficulty: DifficultyLevelDto;
    }
  >;
};

function isReusableContentVisible(
  contentOrganisationId: string | null,
  campaignOrganisationId: string | null,
): boolean {
  return contentOrganisationId === null || contentOrganisationId === campaignOrganisationId;
}

function isComponentContentAvailable(
  item: CampaignItemWithContent,
  campaignOrganisationId: string | null,
): boolean {
  if (item.componentType === 'TRAINING_DOCUMENT') {
    return Boolean(
      item.trainingDocument &&
      isReusableContentVisible(item.trainingDocument.organisationId, campaignOrganisationId) &&
      item.trainingDocument.status === 'AVAILABLE',
    );
  }
  if (item.componentType === 'QUIZ') {
    return Boolean(
      item.quiz &&
      isReusableContentVisible(item.quiz.organisationId, campaignOrganisationId) &&
      item.quiz.status === 'PUBLISHED',
    );
  }
  if (item.componentType === 'SIMULATED_INBOX') {
    if (!item.simulation) {
      return false;
    }
    return (
      isReusableContentVisible(item.simulation.organisationId, campaignOrganisationId) &&
      item.simulation.safetyStatus === 'APPROVED' &&
      item.simulation.simulatedInbox?.status === 'ACTIVE'
    );
  }
  return true;
}

function checkItemsContentStatus(
  items: CampaignItemWithContent[],
  campaignOrganisationId: string | null,
): boolean {
  return items.every((item) => {
    if (item.itemType === 'GROUP') {
      return true;
    }
    if (item.itemType === 'ADAPTIVE') {
      const alternatives = item.adaptiveAlternatives;
      return (
        alternatives?.length === ADAPTIVE_DIFFICULTIES.length &&
        alternatives.every(
          (alternative) =>
            alternative.difficulty ===
              (alternative.trainingDocument?.difficultyLevel ??
                alternative.quiz?.difficultyLevel ??
                alternative.simulation?.difficultyLevel) &&
            isComponentContentAvailable(
              { ...alternative, itemType: 'ADAPTIVE', componentType: item.componentType },
              campaignOrganisationId,
            ),
        ) &&
        sharedAdaptiveSlotCategories(
          alternatives.map((alternative) => [
            ...(alternative.trainingDocument?.categories ?? []),
            ...(alternative.quiz?.questions?.flatMap((question) => question.categories) ?? []),
            ...(alternative.simulation?.simulatedInbox?.emails?.flatMap(
              (email) => email.categories,
            ) ?? []),
          ]),
        ) !== null
      );
    }
    return isComponentContentAvailable(item, campaignOrganisationId);
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
                organisationId: true,
                status: true,
              },
            },
            quiz: {
              select: {
                organisationId: true,
                status: true,
              },
            },
            simulation: {
              select: {
                organisationId: true,
                safetyStatus: true,
                simulatedInbox: {
                  select: {
                    status: true,
                  },
                },
              },
            },
            adaptiveAlternatives: {
              select: {
                difficulty: true,
                trainingDocument: {
                  select: {
                    organisationId: true,
                    status: true,
                    difficultyLevel: true,
                    categories: true,
                  },
                },
                quiz: {
                  select: {
                    organisationId: true,
                    status: true,
                    difficultyLevel: true,
                    questions: { select: { categories: true } },
                  },
                },
                simulation: {
                  select: {
                    organisationId: true,
                    safetyStatus: true,
                    difficultyLevel: true,
                    simulatedInbox: {
                      select: {
                        status: true,
                        emails: { select: { categories: true } },
                      },
                    },
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

        if (
          command.requirements.requireAvailableSources &&
          !checkItemsContentStatus(items, command.organisationId)
        ) {
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
