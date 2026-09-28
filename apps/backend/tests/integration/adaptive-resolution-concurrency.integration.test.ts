import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { createOrReadAdaptiveResolution } from '../../src/repositories/adaptive-campaign-resolution.repository.js';
import {
  createCampaign,
  createCampaignAssignment,
  createCampaignItem,
  createOrganisation,
  createTrainee,
  createTrainingDocument,
} from '../helpers/factories.js';

describe('adaptive resolution persistence concurrency', () => {
  it('converges competing candidates on one durable assignment occurrence resolution', async () => {
    const organisation = await createOrganisation();
    const trainee = await createTrainee({
      organisationProfile: { organisationId: organisation.id },
    });
    const campaign = await createCampaign({
      organisationId: organisation.id,
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
    });
    const campaignItem = await createCampaignItem({
      campaignId: campaign.id,
      itemType: 'ADAPTIVE',
      componentType: 'TRAINING_DOCUMENT',
    });
    const assignment = await createCampaignAssignment({
      campaignId: campaign.id,
      traineeProfileId: trainee.traineeProfile.id,
    });
    const easyDocument = await createTrainingDocument({
      organisationId: organisation.id,
      difficultyLevel: 'EASY',
      categories: ['PASSWORDS_AND_AUTHENTICATION'],
    });
    const hardDocument = await createTrainingDocument({
      organisationId: organisation.id,
      difficultyLevel: 'HARD',
      categories: ['PASSWORDS_AND_AUTHENTICATION'],
    });
    const [easyAlternative, hardAlternative] = await Promise.all([
      prisma.campaignAdaptiveAlternative.create({
        data: {
          campaignItemId: campaignItem.id,
          difficulty: 'EASY',
          trainingDocumentId: easyDocument.id,
        },
      }),
      prisma.campaignAdaptiveAlternative.create({
        data: {
          campaignItemId: campaignItem.id,
          difficulty: 'HARD',
          trainingDocumentId: hardDocument.id,
        },
      }),
    ]);

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        createOrReadAdaptiveResolution({
          campaignAssignmentId: assignment.id,
          campaignItemId: campaignItem.id,
          selectedAlternativeId: index % 2 === 0 ? easyAlternative.id : hardAlternative.id,
          evidenceStatus: 'SUFFICIENT',
          resolutionBasis: 'EVIDENCE',
        }),
      ),
    );

    const persisted = await prisma.adaptiveCampaignResolution.findMany({
      where: {
        campaignAssignmentId: assignment.id,
        campaignItemId: campaignItem.id,
      },
    });
    expect(persisted).toHaveLength(1);
    expect(new Set(outcomes.map(({ resolution }) => resolution.id))).toEqual(
      new Set([persisted[0].id]),
    );
    expect([easyAlternative.id, hardAlternative.id]).toContain(persisted[0].selectedAlternativeId);
    expect([easyDocument.id, hardDocument.id]).toContain(persisted[0].selectedContentId);
    expect(outcomes.filter(({ created }) => created)).toHaveLength(1);
  });
});
