import { describe, expect, it } from 'vitest';
import {
  CampaignComponentType,
  ContentCategory,
  DifficultyLevel,
  EmailClassification,
  InboxStatus,
  RedFlagSeverity,
  SafetyStatus,
  TrainingDocumentStatus,
} from '../../src/generated/prisma/enums.js';
import { prisma } from '../../src/lib/prisma.js';
import * as CampaignManagementRepository from '../../src/repositories/campaign-management.repository.js';
import * as ContentLifecycleRepository from '../../src/repositories/content-lifecycle.repository.js';
import {
  createCampaign,
  createCampaignItem,
  createEmailRedFlag,
  createOrganisation,
  createSimulatedEmail,
  createSimulatedInbox,
  createSimulation,
  createTrainingDocument,
} from '../helpers/factories.js';

describe('Reusable content lifecycle integration', () => {
  it('isolates catalogue content by organisation while retaining platform content', async () => {
    const organisationA = await createOrganisation();
    const organisationB = await createOrganisation();
    const platformDocument = await createTrainingDocument({
      organisationId: null,
      categories: [ContentCategory.PASSWORD_SECURITY],
      status: TrainingDocumentStatus.AVAILABLE,
    });
    const organisationADocument = await createTrainingDocument({
      organisationId: organisationA.id,
      categories: [ContentCategory.PASSWORD_SECURITY],
      status: TrainingDocumentStatus.AVAILABLE,
    });
    const organisationBDocument = await createTrainingDocument({
      organisationId: organisationB.id,
      categories: [ContentCategory.PASSWORD_SECURITY],
      status: TrainingDocumentStatus.AVAILABLE,
    });

    const organisationCatalogue = await CampaignManagementRepository.findCampaignCatalogue({
      page: 1,
      limit: 10,
      type: CampaignComponentType.TRAINING_DOCUMENT,
      category: ContentCategory.PASSWORD_SECURITY,
      organisationId: organisationA.id,
    });
    const platformCatalogue = await CampaignManagementRepository.findCampaignCatalogue({
      page: 1,
      limit: 10,
      type: CampaignComponentType.TRAINING_DOCUMENT,
      category: ContentCategory.PASSWORD_SECURITY,
      organisationId: null,
    });

    expect(organisationCatalogue.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([platformDocument.id, organisationADocument.id]),
    );
    expect(organisationCatalogue.items.map((item) => item.id)).not.toContain(
      organisationBDocument.id,
    );
    expect(platformCatalogue.items.map((item) => item.id)).toEqual([platformDocument.id]);
  });

  it('copies an active simulation graph as a history-free draft', async () => {
    const targetOrganisation = await createOrganisation();
    const source = await createSimulation({
      organisationId: null,
      difficultyLevel: DifficultyLevel.ADVANCED,
      safetyStatus: SafetyStatus.APPROVED,
    });
    const inbox = await createSimulatedInbox({
      simulationId: source.id,
      status: InboxStatus.ACTIVE,
    });
    const receivedAt = new Date('2026-09-10T07:30:00.000Z');
    const email = await createSimulatedEmail({
      inboxId: inbox.id,
      receivedAt,
      expectedClassification: EmailClassification.PHISHING,
      categories: [ContentCategory.DATA_PROTECTION, ContentCategory.PHISHING],
      difficultyLevel: DifficultyLevel.ADVANCED,
    });
    const redFlag = await createEmailRedFlag({
      simulatedEmailId: email.id,
      severity: RedFlagSeverity.HIGH,
    });
    const campaign = await createCampaign();
    await createCampaignItem({
      campaignId: campaign.id,
      componentType: CampaignComponentType.SIMULATED_INBOX,
      simulationId: source.id,
    });

    const copy = await ContentLifecycleRepository.copySimulation(source.id, targetOrganisation.id);

    expect(copy).not.toBeNull();
    if (!copy?.simulatedInbox?.emails[0]) {
      throw new Error('Expected the copied simulation graph');
    }
    expect(copy).toMatchObject({
      organisationId: targetOrganisation.id,
      difficultyLevel: DifficultyLevel.ADVANCED,
      safetyStatus: SafetyStatus.DRAFT,
      simulatedInbox: {
        status: InboxStatus.ARCHIVED,
      },
    });
    expect(copy.id).not.toBe(source.id);
    expect(copy.simulatedInbox.id).not.toBe(inbox.id);
    expect(copy.simulatedInbox.emails[0]).toMatchObject({
      receivedAt,
      categories: [ContentCategory.DATA_PROTECTION, ContentCategory.PHISHING],
      difficultyLevel: DifficultyLevel.ADVANCED,
    });
    expect(copy.simulatedInbox.emails[0].id).not.toBe(email.id);
    expect(copy.simulatedInbox.emails[0].redFlags[0]?.id).not.toBe(redFlag.id);
    expect(await prisma.campaignItem.count({ where: { simulationId: copy.id } })).toBe(0);
    expect(
      await prisma.emailClassificationResponse.count({
        where: { simulatedEmailId: copy.simulatedInbox.emails[0].id },
      }),
    ).toBe(0);
    expect(
      await prisma.interactionEvent.count({
        where: { simulatedEmailId: copy.simulatedInbox.emails[0].id },
      }),
    ).toBe(0);
  });
});
