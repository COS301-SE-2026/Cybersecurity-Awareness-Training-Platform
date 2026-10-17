import { expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { SimulationService } from '../../src/services/simulation.service.js';
import { getTraineeCampaignDetail } from '../../src/services/trainee-campaign.service.js';
import { getOrganisationCampaignStatistics } from '../../src/services/campaign-management.service.js';
import {
  createCampaign,
  createCampaignAssignment,
  createCampaignItem,
  createOrganisationAdminTestFixture,
  createSimulatedEmail,
  createSimulatedInbox,
  createSimulation,
  createTrainee,
} from '../helpers/factories.js';

it.each(['COMPONENT', 'ADAPTIVE'] as const)(
  'agrees on persisted classification completion for a %s inbox',
  async (itemType) => {
    const { organisation, user: admin } = await createOrganisationAdminTestFixture();
    const trainee = await createTrainee({
      organisationProfile: { organisationId: organisation.id },
    });
    const other = await createTrainee({ organisationProfile: { organisationId: organisation.id } });
    const campaign = await createCampaign({
      organisationId: organisation.id,
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
    });
    const simulation = await createSimulation({
      organisationId: organisation.id,
      difficultyLevel: 'MEDIUM',
    });
    const inbox = await createSimulatedInbox({ simulationId: simulation.id, status: 'ACTIVE' });
    const emails = await Promise.all(
      [0, 1].map((position) =>
        createSimulatedEmail({
          inboxId: inbox.id,
          position,
          expectedClassification: position === 0 ? 'SAFE' : 'PHISHING',
          categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
          difficultyLevel: 'MEDIUM',
        }),
      ),
    );
    const item = await createCampaignItem({
      campaignId: campaign.id,
      itemType,
      componentType: 'SIMULATED_INBOX',
      ...(itemType === 'COMPONENT' ? { simulationId: simulation.id } : {}),
    });
    const assignment = await createCampaignAssignment({
      campaignId: campaign.id,
      traineeProfileId: trainee.traineeProfile.id,
    });
    const otherAssignment = await createCampaignAssignment({
      campaignId: campaign.id,
      traineeProfileId: other.traineeProfile.id,
    });

    if (itemType === 'ADAPTIVE') {
      for (const difficulty of ['EASY', 'MEDIUM', 'HARD'] as const) {
        const source =
          difficulty === 'MEDIUM'
            ? simulation
            : await createSimulation({
                organisationId: organisation.id,
                difficultyLevel: difficulty,
              });
        if (source.id !== simulation.id) {
          const unusedInbox = await createSimulatedInbox({
            simulationId: source.id,
            status: 'ACTIVE',
          });
          await createSimulatedEmail({
            inboxId: unusedInbox.id,
            position: 0,
            categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
            difficultyLevel: difficulty,
          });
        }
        const alternative = await prisma.campaignAdaptiveAlternative.create({
          data: { campaignItemId: item.id, difficulty, simulationId: source.id },
        });
        if (difficulty === 'MEDIUM') {
          for (const occurrence of [assignment, otherAssignment]) {
            await prisma.adaptiveCampaignResolution.create({
              data: {
                campaignId: campaign.id,
                campaignAssignmentId: occurrence.id,
                campaignItemId: item.id,
                selectedAlternativeId: alternative.id,
                selectedDifficulty: difficulty,
                selectedContentId: source.id,
                evidenceStatus: 'SUFFICIENT',
                resolutionBasis: 'EVIDENCE',
              },
            });
          }
        }
      }
    }

    await prisma.interactionEvent.createMany({
      data: emails.map((email) => ({
        traineeProfileId: trainee.traineeProfile.id,
        campaignAssignmentId: assignment.id,
        campaignItemId: item.id,
        simulatedEmailId: email.id,
        eventType: 'SIMULATED_EMAIL_OPENED',
        targetType: 'SIMULATED_EMAIL',
        targetId: email.id,
      })),
    });
    const service = new SimulationService();
    const statistics = () =>
      getOrganisationCampaignStatistics(
        { userId: admin.id, userType: 'ORGANISATION_ADMIN' },
        organisation.id,
        campaign.id,
        { page: 1, limit: 20 },
      );
    expect(
      (await service.getSimulatedInbox(item.id, trainee.traineeProfile.id)).emails.map(
        (email) => email.isOpened,
      ),
    ).toEqual([false, false]);
    expect((await getTraineeCampaignDetail(trainee.user.id, campaign.id)).progressStatus).toBe(
      'IN_PROGRESS',
    );
    expect((await statistics()).summary.completedTraineeCount).toBe(0);

    await service.classifyEmail(emails[0].id, item.id, trainee.traineeProfile.id, {
      selectedClassification: 'SAFE',
      selectedRedFlagIds: [],
    });
    expect(
      (await service.getSimulatedInbox(item.id, trainee.traineeProfile.id)).emails.map(
        (email) => email.isOpened,
      ),
    ).toEqual([true, false]);
    expect((await statistics()).summary.completedTraineeCount).toBe(0);

    const incorrect = await service.classifyEmail(
      emails[1].id,
      item.id,
      trainee.traineeProfile.id,
      { selectedClassification: 'SAFE', selectedRedFlagIds: [] },
    );
    expect(incorrect.isCorrect).toBe(false);
    for (let reload = 0; reload < 2; reload++) {
      expect(
        (await service.getSimulatedInbox(item.id, trainee.traineeProfile.id)).emails.map(
          (email) => email.isOpened,
        ),
      ).toEqual([true, true]);
      expect((await getTraineeCampaignDetail(trainee.user.id, campaign.id)).progressStatus).toBe(
        'COMPLETED',
      );
      const stats = await statistics();
      expect(stats.summary).toMatchObject({
        startedTraineeCount: 1,
        completedTraineeCount: 1,
        classifiedEmailCount: 2,
        correctClassificationCount: 1,
        classificationAccuracyPercentage: 50,
      });
      expect(
        stats.trainees.find((row) => row.assignmentId === assignment.id)?.progress
          .completedItemCount,
      ).toBe(1);
      expect(
        stats.trainees.find((row) => row.assignmentId === otherAssignment.id)?.progress
          .completedItemCount,
      ).toBe(0);
      expect((await getTraineeCampaignDetail(other.user.id, campaign.id)).progressStatus).toBe(
        'NOT_STARTED',
      );
    }
  },
);
