import { expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/prisma.js';
import { findEmailClassificationResponses } from '../../../src/repositories/trainee-campaign.repository.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { emailClassificationResponse: { findMany: vi.fn() } },
}));

it('scopes classification completion evidence to the trainee, assignment, and item occurrences', async () => {
  vi.mocked(prisma.emailClassificationResponse.findMany).mockResolvedValue([]);
  await findEmailClassificationResponses({
    traineeProfileId: 'trainee',
    campaignAssignmentId: 'current-assignment',
    campaignItemIds: ['current-item'],
  });
  expect(prisma.emailClassificationResponse.findMany).toHaveBeenCalledWith({
    where: {
      traineeProfileId: 'trainee',
      campaignAssignmentId: 'current-assignment',
      campaignItemId: { in: ['current-item'] },
    },
    select: { campaignItemId: true, simulatedEmailId: true },
  });
});
