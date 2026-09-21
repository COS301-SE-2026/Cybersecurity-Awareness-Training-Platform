import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as CampaignManagementRepository from '../../../src/repositories/campaign-management.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => {
  const mockPrisma = {
    trainingDocument: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    quiz: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    simulation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    campaign: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    campaignItem: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    campaignPrerequisite: {
      createMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe('CampaignManagementRepository reusable content ownership', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.trainingDocument.findMany).mockResolvedValue([]);
    vi.mocked(prisma.quiz.findMany).mockResolvedValue([]);
    vi.mocked(prisma.simulation.findMany).mockResolvedValue([]);
  });

  it('combines ownership, category, and search filters without overwriting isolation', async () => {
    await CampaignManagementRepository.findCampaignCatalogue({
      page: 1,
      limit: 10,
      organisationId,
      category: 'DATA_DEVICE_AND_ACCOUNT_SAFETY',
      search: 'invoice',
    });

    expect(prisma.trainingDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'AVAILABLE',
          AND: [
            { OR: [{ organisationId: null }, { organisationId }] },
            { categories: { has: 'DATA_DEVICE_AND_ACCOUNT_SAFETY' } },
            {
              OR: [
                { title: { contains: 'invoice', mode: 'insensitive' } },
                { contentSummary: { contains: 'invoice', mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    );
    expect(prisma.quiz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          AND: [
            { OR: [{ organisationId: null }, { organisationId }] },
            {
              questions: {
                some: { categories: { has: 'DATA_DEVICE_AND_ACCOUNT_SAFETY' } },
              },
            },
            {
              OR: [
                { title: { contains: 'invoice', mode: 'insensitive' } },
                { description: { contains: 'invoice', mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    );
    expect(prisma.simulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          safetyStatus: 'APPROVED',
          simulatedInbox: {
            status: 'ACTIVE',
            emails: {
              some: { categories: { has: 'DATA_DEVICE_AND_ACCOUNT_SAFETY' } },
            },
          },
          AND: [
            { OR: [{ organisationId: null }, { organisationId }] },
            {
              OR: [
                { title: { contains: 'invoice', mode: 'insensitive' } },
                { description: { contains: 'invoice', mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    );
  });

  it('rejects another organisation content when persisting a campaign draft', async () => {
    vi.mocked(prisma.campaign.create).mockResolvedValue({
      id: 'campaign-1',
      organisationId,
      createdByUserId: 'user-1',
      name: 'Campaign',
      description: null,
      accentColor: null,
      campaignType: 'ORGANISATION_CUSTOM',
      difficultyLevel: 'EASY',
      status: 'DRAFT',
      startDate: null,
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.trainingDocument.findFirst).mockResolvedValue(null);

    const result = await CampaignManagementRepository.createCampaignDraft({
      organisationId,
      createdByUserId: 'user-1',
      name: 'Campaign',
      campaignType: 'ORGANISATION_CUSTOM',
      items: [
        {
          componentType: 'TRAINING_DOCUMENT',
          contentId: 'private-document-id',
          isRequired: true,
        },
      ],
    });

    expect(prisma.trainingDocument.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'private-document-id',
        OR: [{ organisationId: null }, { organisationId }],
      },
      select: {
        id: true,
        title: true,
        contentSummary: true,
        status: true,
      },
    });
    expect(result).toEqual({
      success: false,
      error: 'UNAVAILABLE_CONTENT',
      contentType: 'TRAINING_DOCUMENT',
    });
    expect(prisma.campaignItem.create).not.toHaveBeenCalled();
  });

  it('writes Quiz occurrence settings on create and update', async () => {
    const updatedAt = new Date('2026-09-18T10:00:00.000Z');
    vi.mocked(prisma.campaign.create).mockResolvedValue({
      id: 'campaign-1',
      status: 'DRAFT',
      updatedAt,
    } as never);
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      id: 'quiz-1',
      title: 'Quiz',
      description: null,
      status: 'PUBLISHED',
    } as never);
    vi.mocked(prisma.campaignItem.create).mockResolvedValue({ id: 'item-1' } as never);

    const item = {
      componentType: 'QUIZ' as const,
      contentId: 'quiz-1',
      isRequired: true,
      maxAttempts: 3,
      scorePolicy: 'LATEST' as const,
    };

    await CampaignManagementRepository.createCampaignDraft({
      organisationId,
      name: 'Campaign',
      campaignType: 'ORGANISATION_CUSTOM',
      items: [item],
    });
    expect(prisma.campaignItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quizMaxAttempts: 3,
        quizScorePolicy: 'LATEST',
      }),
    });

    vi.mocked(prisma.campaign.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.campaignItem.findMany).mockResolvedValue([
      {
        id: 'item-1',
        itemType: 'COMPONENT',
        componentType: 'QUIZ',
        quizId: 'quiz-1',
      },
    ] as never);
    vi.mocked(prisma.campaign.findUniqueOrThrow).mockResolvedValue({
      id: 'campaign-1',
      status: 'DRAFT',
      updatedAt,
    } as never);

    await CampaignManagementRepository.updateCampaignDraft({
      campaignId: 'campaign-1',
      organisationId,
      expectedUpdatedAt: updatedAt,
      name: 'Campaign',
      items: [{ ...item, campaignItemId: 'item-1' }],
    });
    expect(prisma.campaignItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        quizMaxAttempts: 3,
        quizScorePolicy: 'LATEST',
      }),
    });
  });

  it('returns persisted settings only on Quiz detail items', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'campaign-1',
      organisationId,
      name: 'Campaign',
      description: null,
      accentColor: null,
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'DRAFT',
      startDate: null,
      endDate: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'quiz-item',
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Quiz',
          description: null,
          position: 10,
          isRequired: true,
          trainingDocumentId: null,
          quizId: 'quiz-1',
          quizMaxAttempts: 3,
          quizScorePolicy: 'AVERAGE',
          simulationId: null,
          quiz: {
            id: 'quiz-1',
            organisationId,
            title: 'Quiz',
            description: null,
            status: 'PUBLISHED',
          },
        },
        {
          id: 'doc-item',
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Document',
          description: null,
          position: 20,
          isRequired: true,
          trainingDocumentId: 'doc-1',
          quizId: null,
          quizMaxAttempts: 1,
          quizScorePolicy: 'BEST',
          simulationId: null,
        },
      ],
    } as never);

    const result = await CampaignManagementRepository.findCampaignById('campaign-1', {
      organisationId,
    });
    expect(result?.items[0]).toMatchObject({
      componentType: 'QUIZ',
      maxAttempts: 3,
      scorePolicy: 'AVERAGE',
    });
    expect(result?.items[1]).not.toHaveProperty('maxAttempts');
    expect(result?.items[1]).not.toHaveProperty('scorePolicy');
  });

  it('rejects activation when a campaign references content owned by another organisation', async () => {
    vi.mocked(prisma.campaign.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.campaignItem.findMany).mockResolvedValue([
      {
        itemType: 'COMPONENT',
        componentType: 'TRAINING_DOCUMENT',
        trainingDocument: {
          organisationId: '22222222-2222-4222-8222-222222222222',
          status: 'AVAILABLE',
        },
        quiz: null,
        simulation: null,
      },
    ] as never);

    const result = await CampaignManagementRepository.transitionCampaign({
      campaignId: 'campaign-1',
      organisationId,
      expectedStatus: 'DRAFT',
      targetStatus: 'ACTIVE',
      expectedUpdatedAt: new Date('2026-09-10T12:00:00.000Z'),
      requirements: {
        requireItems: true,
        requireAvailableSources: true,
      },
    });

    expect(result).toEqual({
      success: false,
      error: 'UNAVAILABLE_CONTENT',
    });
    expect(prisma.campaign.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('distinguishes a missing copy source from a non-Active source', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValueOnce(null);

    await expect(
      CampaignManagementRepository.copyActiveCampaignToDraft({
        campaignId: 'missing-campaign',
        organisationId,
        createdByUserId: 'user-1',
      }),
    ).resolves.toEqual({
      success: false,
      error: 'CAMPAIGN_NOT_FOUND',
    });

    vi.mocked(prisma.campaign.findFirst)
      .mockResolvedValueOnce({ id: 'draft-campaign' } as never)
      .mockResolvedValueOnce({
        id: 'draft-campaign',
        status: 'DRAFT',
        items: [],
        prerequisites: [],
      } as never);

    await expect(
      CampaignManagementRepository.copyActiveCampaignToDraft({
        campaignId: 'draft-campaign',
        organisationId,
        createdByUserId: 'user-1',
      }),
    ).resolves.toEqual({
      success: false,
      error: 'CAMPAIGN_LIFECYCLE_CONFLICT',
    });

    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });

  it('atomically copies an Active campaign definition with fresh occurrence identites', async () => {
    const sourceName = 'A'.repeat(200);
    const sourceCampaignId = 'source-campaign';
    const copiedCampaignId = 'copied-campaign';

    vi.mocked(prisma.campaign.findFirst)
      .mockResolvedValueOnce({ id: sourceCampaignId } as never)
      .mockResolvedValueOnce({
        id: sourceCampaignId,
        organisationId,
        createdByUserId: 'source-author',
        name: sourceName,
        description: 'Source description',
        accentColor: '#123456',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        items: [
          {
            id: 'source-quiz-item',
            campaignId: sourceCampaignId,
            parentGroupId: null,
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            groupType: null,
            completionRule: null,
            title: 'Quiz',
            description: null,
            position: 10,
            isRequired: true,
            trainingDocumentId: null,
            quizId: 'quiz-1',
            quizMaxAttempts: 4,
            quizScorePolicy: 'AVERAGE',
            simulationId: null,
          },
          {
            id: 'source-group',
            campaignId: sourceCampaignId,
            parentGroupId: null,
            itemType: 'GROUP',
            componentType: null,
            groupType: 'MODULE',
            completionRule: 'COMPLETE_REQUIRED_ONLY',
            title: 'Module',
            description: 'Grouped content',
            position: 20,
            isRequired: false,
            trainingDocumentId: null,
            quizId: null,
            quizMaxAttempts: 1,
            quizScorePolicy: 'BEST',
            simulationId: null,
          },
          {
            id: 'source-child-doc',
            campaignId: sourceCampaignId,
            parentGroupId: 'source-group',
            itemType: 'COMPONENT',
            componentType: 'TRAINING_DOCUMENT',
            groupType: null,
            completionRule: null,
            title: 'Document',
            description: null,
            position: 10,
            isRequired: true,
            trainingDocumentId: 'doc-1',
            quizId: null,
            quizMaxAttempts: 1,
            quizScorePolicy: 'BEST',
            simulationId: null,
          },
          {
            id: 'source-child-quiz',
            campaignId: sourceCampaignId,
            parentGroupId: 'source-group',
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            groupType: null,
            completionRule: null,
            title: 'Child Quiz',
            description: null,
            position: 20,
            isRequired: false,
            trainingDocumentId: null,
            quizId: 'quiz-2',
            quizMaxAttempts: 2,
            quizScorePolicy: 'LATEST',
            simulationId: null,
          },
        ],
        prerequisites: [
          {
            prerequisiteCampaignId: 'prerequisite-campaign',
            requirementType: 'COMPLETION_REQUIRED',
          },
        ],
      } as never);

    vi.mocked(prisma.campaign.create).mockResolvedValue({
      id: copiedCampaignId,
      status: 'DRAFT',
      updatedAt: new Date('2026-09-20T10:00:00.000Z'),
    } as never);

    vi.mocked(prisma.quiz.findFirst)
      .mockResolvedValueOnce({
        id: 'quiz-1',
        title: 'Quiz',
        description: null,
        status: 'PUBLISHED',
      } as never)
      .mockResolvedValueOnce({
        id: 'quiz-2',
        title: 'Child quiz',
        description: null,
        status: 'PUBLISHED',
      } as never);

    vi.mocked(prisma.trainingDocument.findFirst).mockResolvedValue({
      id: 'doc-1',
      title: 'Document',
      contentSummary: null,
      status: 'AVAILABLE',
    } as never);

    vi.mocked(prisma.campaignItem.create)
      .mockResolvedValueOnce({ id: 'new-quiz-item' } as never)
      .mockResolvedValueOnce({ id: 'new-group' } as never)
      .mockResolvedValueOnce({ id: 'new-child-doc' } as never)
      .mockResolvedValueOnce({ id: 'new-child-quiz' } as never);

    const result = await CampaignManagementRepository.copyActiveCampaignToDraft({
      campaignId: sourceCampaignId,
      organisationId,
      createdByUserId: 'copying-admin',
    });

    expect(result).toMatchObject({
      success: true,
      campaignId: copiedCampaignId,
      status: 'DRAFT',
    });

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: {
        organisationId,
        createdByUserId: 'copying-admin',
        name: `${'A'.repeat(193)} (Copy)`,
        description: 'Source description',
        accentColor: '#123456',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'DRAFT',
        startDate: null,
        endDate: null,
      },
    });

    expect(prisma.campaignItem.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        campaignId: copiedCampaignId,
        parentGroupId: null,
        componentType: 'QUIZ',
        quizId: 'quiz-1',
        position: 10,
        quizMaxAttempts: 4,
        quizScorePolicy: 'AVERAGE',
      }),
    });
    expect(prisma.campaignItem.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        campaignId: copiedCampaignId,
        itemType: 'GROUP',
        title: 'Module',
        description: 'Grouped content',
        groupType: 'MODULE',
        completionRule: 'COMPLETE_REQUIRED_ONLY',
        position: 20,
        isRequired: false,
      }),
    });
    expect(prisma.campaignItem.create).toHaveBeenNthCalledWith(3, {
      data: expect.objectContaining({
        campaignId: copiedCampaignId,
        parentGroupId: 'new-group',
        trainingDocumentId: 'doc-1',
        position: 10,
        isRequired: true,
      }),
    });
    expect(prisma.campaignItem.create).toHaveBeenNthCalledWith(4, {
      data: expect.objectContaining({
        campaignId: copiedCampaignId,
        parentGroupId: 'new-group',
        quizId: 'quiz-2',
        position: 20,
        isRequired: false,
        quizMaxAttempts: 2,
        quizScorePolicy: 'LATEST',
      }),
    });

    expect(prisma.campaignPrerequisite.createMany).toHaveBeenCalledWith({
      data: [
        {
          campaignId: copiedCampaignId,
          prerequisiteCampaignId: 'prerequisite-campaign',
          requirementType: 'COMPLETION_REQUIRED',
        },
      ],
    });

    expect(prisma.campaign.updateMany).not.toHaveBeenCalled();
  });
});
