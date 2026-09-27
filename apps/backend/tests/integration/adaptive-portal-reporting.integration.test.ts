import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import {
  createManagedPortalLink,
  createPortalInteractionEvent,
  readCampaignPortalReportingFacts,
} from '../../src/repositories/portal-persistence.repository.js';
import { createOrganisation, createTrainee } from '../helpers/factories.js';

describe('adaptive portal reporting persistence', () => {
  it('reports retained facts after the live assignment and resolution are deleted', async () => {
    const organisation = await createOrganisation();
    const trainee = await createTrainee();
    const simulation = await prisma.simulation.create({
      data: {
        organisationId: organisation.id,
        simulationType: 'SIMULATED_INBOX',
        title: 'Adaptive portal simulation',
        difficultyLevel: 'MEDIUM',
        safetyStatus: 'APPROVED',
        simulatedInbox: {
          create: {
            title: 'Adaptive portal inbox',
            status: 'ACTIVE',
            emails: {
              create: {
                position: 0,
                senderLabel: 'Security Team',
                senderAddress: 'security@example.test',
                subject: 'Review requested',
                bodyHtml: '<p>{{SYSTEM_LINK}}</p>',
                linkAnchorText: 'Review',
                portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
                expectedClassification: 'PHISHING',
                categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
                difficultyLevel: 'MEDIUM',
              },
            },
          },
        },
      },
      include: { simulatedInbox: { include: { emails: true } } },
    });
    const campaign = await prisma.campaign.create({
      data: {
        organisationId: organisation.id,
        name: 'Adaptive portal campaign',
        campaignType: 'ORGANISATION_CUSTOM',
        difficultyLevel: 'MEDIUM',
        status: 'ACTIVE',
      },
    });
    const campaignItem = await prisma.campaignItem.create({
      data: {
        campaignId: campaign.id,
        itemType: 'ADAPTIVE',
        componentType: 'SIMULATED_INBOX',
        title: 'Adaptive portal occurrence',
        position: 0,
      },
    });
    const assignment = await prisma.campaignAssignment.create({
      data: {
        campaignId: campaign.id,
        traineeProfileId: trainee.traineeProfile.id,
        assignmentStatus: 'ASSIGNED',
        accessType: 'ASSIGNED',
      },
    });
    await prisma.adaptiveCampaignResolution.create({
      data: {
        campaignId: campaign.id,
        campaignAssignmentId: assignment.id,
        campaignItemId: campaignItem.id,
        selectedDifficulty: 'MEDIUM',
        selectedContentId: simulation.id,
        evidenceStatus: 'SUFFICIENT',
        resolutionBasis: 'EVIDENCE',
      },
    });
    const simulatedEmail = simulation.simulatedInbox?.emails[0];
    if (!simulatedEmail) throw new Error('Expected a simulated email fixture.');
    const link = await createManagedPortalLink({
      id: 'adaptive-history-link',
      tokenHash: 'sha256:adaptive-history',
      publicOrigin: 'https://simulation-one.test',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      traineeProfileId: trainee.traineeProfile.id,
      organisationId: organisation.id,
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: assignment.id,
        campaignItemId: campaignItem.id,
        simulatedEmailId: simulatedEmail.id,
      },
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'PORTAL_VISITED',
      clientEventId: 'adaptive-history-visit',
    });

    await prisma.managedPortalLink.update({
      where: { id: link.id },
      data: { revokedAt: new Date(), campaignAssignmentId: null },
    });
    await prisma.campaignAssignment.delete({ where: { id: assignment.id } });

    await expect(
      prisma.adaptiveCampaignResolution.count({ where: { campaignAssignmentId: assignment.id } }),
    ).resolves.toBe(0);
    await expect(
      readCampaignPortalReportingFacts({
        organisationId: organisation.id,
        campaignId: campaign.id,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        managedPortalLinkId: link.id,
        traineeProfileId: trainee.traineeProfile.id,
        context: {
          channel: 'SIMULATED_INBOX',
          campaignAssignmentId: assignment.id,
          campaignItemId: campaignItem.id,
          simulatedEmailId: simulatedEmail.id,
        },
        eventType: 'PORTAL_VISITED',
      }),
    ]);
  });
});
