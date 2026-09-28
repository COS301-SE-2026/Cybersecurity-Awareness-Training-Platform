import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findCampaignPhishingSimulationFacts,
  findPhishingSimulationDraftById,
} from '../../../src/repositories/phishing-simulation.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    phishingSimulation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('PhishingSimulationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts only raw managed portal requests with ordinary link events', async () => {
    vi.mocked(prisma.phishingSimulation.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.phishingSimulation.findMany).mockResolvedValue([]);
    const input = {
      organisationId: '11111111-1111-4111-8111-111111111111',
      campaignId: '22222222-2222-4222-8222-222222222222',
    };
    const requestCounts = {
      _count: {
        select: { trackingEvents: { where: { eventType: 'LINK_CLICKED' } } },
      },
      managedPortalLink: {
        select: {
          _count: {
            select: { events: { where: { eventType: 'MANAGED_LINK_REQUESTED' } } },
          },
        },
      },
    };

    await findPhishingSimulationDraftById({ ...input, simulationId: 'simulation-1' });
    await findCampaignPhishingSimulationFacts(input);

    expect(prisma.phishingSimulation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          messages: expect.objectContaining({ include: requestCounts }),
        }),
      }),
    );
    expect(prisma.phishingSimulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          messages: expect.objectContaining({
            select: expect.objectContaining(requestCounts),
          }),
        }),
      }),
    );
  });
});
