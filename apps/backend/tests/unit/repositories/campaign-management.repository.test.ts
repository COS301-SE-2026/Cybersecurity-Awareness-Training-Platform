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
      findMany: vi.fn(),
    },
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
      category: 'MALWARE',
      search: 'invoice',
    });

    expect(prisma.trainingDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'AVAILABLE',
          AND: [
            { OR: [{ organisationId: null }, { organisationId }] },
            { category: 'MALWARE' },
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
      difficultyLevel: 'BEGINNER',
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
});
