import { PORTAL_TEMPLATE_IDS, type OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import * as OrganisationEmailRepository from '../../src/repositories/organisation-email.repository.js';
import * as PhishingSimulationRepository from '../../src/repositories/phishing-simulation.repository.js';
import type { PhishingSimulationMessageQueueState } from '../../src/repositories/phishing-simulation.repository.js';
import {
  startPhishingSimulation,
  queuePhishingSimulationMessage,
} from '../../src/services/phishing-simulation.service.js';
import {
  getOrCreateRealEmailManagedPortal,
  resolvePhishingPortal,
} from '../../src/services/phishing-portal.service.js';
import { deriveManagedPortalToken } from '../../src/services/token-hash.service.js';
import { env } from '../../src/config/env.js';
import {
  addActiveLibraryEmailSnapshot,
  copyActiveSimulatedInbox,
  findSimulatedInbox,
} from '../../src/repositories/simulated-inbox-management.repository.js';
import {
  ManagedPortalLinkOccurrenceConflictError,
  createFirstPortalInteractionEvent,
  createManagedPortalLink,
  createPortalInteractionEvent,
  findManagedPortalLinkByOccurrence,
  findManagedPortalLinkByPlannedMessage,
  findManagedPortalLinkByTokenHash,
  findManagedPortalLinkResolutionByTokenHash,
  findPortalInteractionEvents,
  readCampaignPortalReportingFacts,
  setManagedPortalLinkRevokedAt,
} from '../../src/repositories/portal-persistence.repository.js';
import { createOrganisation, createTrainee } from '../helpers/factories.js';

const draft: OrganisationEmailDraftInput = {
  senderLabel: 'Security Team',
  senderAddress: 'security@example.test',
  subject: 'Review requested',
  preview: 'A document is waiting',
  bodyHtml: '<p>{{SYSTEM_LINK}}</p>',
  link: { anchorText: 'Review document' },
  expectedClassification: 'PHISHING',
  redFlags: [
    {
      redFlagType: 'LINK',
      label: 'Unexpected destination',
      description: 'The destination does not match the sender.',
      severity: 'HIGH',
    },
  ],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
  difficultyLevel: 'MEDIUM',
  portalTemplateId: null,
};

async function createPortalContext() {
  const organisation = await createOrganisation();
  const trainee = await createTrainee();
  const simulation = await prisma.simulation.create({
    data: {
      organisationId: organisation.id,
      simulationType: 'SIMULATED_INBOX',
      title: 'Portal simulation',
      description: 'Portal simulation persistence',
      difficultyLevel: 'MEDIUM',
      safetyStatus: 'DRAFT',
      simulatedInbox: {
        create: {
          title: 'Portal inbox',
          description: 'Portal inbox persistence',
          status: 'ARCHIVED',
          emails: {
            create: {
              position: 0,
              senderLabel: draft.senderLabel,
              senderAddress: draft.senderAddress,
              subject: draft.subject,
              preview: draft.preview,
              bodyHtml: draft.bodyHtml,
              linkAnchorText: draft.link?.anchorText ?? null,
              portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
              expectedClassification: draft.expectedClassification,
              categories: draft.categories,
              difficultyLevel: draft.difficultyLevel,
              redFlags: {
                create: draft.redFlags,
              },
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
      name: 'Portal campaign',
      campaignType: 'ORGANISATION_CUSTOM',
      difficultyLevel: 'MEDIUM',
      status: 'ACTIVE',
    },
  });
  const campaignItem = await prisma.campaignItem.create({
    data: {
      campaignId: campaign.id,
      itemType: 'COMPONENT',
      componentType: 'SIMULATED_INBOX',
      title: 'Portal item',
      position: 0,
      simulationId: simulation.id,
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
  const simulatedEmail = simulation.simulatedInbox?.emails[0];
  if (!simulation.simulatedInbox || !simulatedEmail) {
    throw new Error('Portal persistence fixture was not created.');
  }

  return {
    organisation,
    userId: trainee.user.id,
    traineeProfileId: trainee.traineeProfile.id,
    simulation,
    inboxId: simulation.simulatedInbox.id,
    simulatedEmail,
    campaign,
    campaignItem,
    assignment,
  };
}

async function createLink(
  context: Awaited<ReturnType<typeof createPortalContext>>,
  input: { tokenHash: string; organisationId?: string | null },
) {
  return createManagedPortalLink({
    id: `link-${input.tokenHash}`,
    tokenHash: input.tokenHash,
    publicOrigin: 'https://simulation-one.test',
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
    traineeProfileId: context.traineeProfileId,
    organisationId:
      input.organisationId === undefined ? context.organisation.id : input.organisationId,
    context: {
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: context.assignment.id,
      campaignItemId: context.campaignItem.id,
      simulatedEmailId: context.simulatedEmail.id,
    },
    expiresAt: new Date('2026-09-22T08:00:00.000Z'),
  });
}

describe('portal persistence repository integration', () => {
  it('copies a library template into the pool and planned message, then queues one stable managed URL', async () => {
    const organisation = await createOrganisation();
    const trainee = await createTrainee({
      organisationProfile: { organisationId: organisation.id },
    });
    await prisma.user.update({
      where: { id: trainee.user.id },
      data: { emailVerifiedAt: new Date() },
    });
    const campaign = await prisma.campaign.create({
      data: {
        organisationId: organisation.id,
        name: 'Real email portal campaign',
        campaignType: 'ORGANISATION_CUSTOM',
        difficultyLevel: 'MEDIUM',
        status: 'ACTIVE',
      },
    });
    await prisma.campaignAssignment.create({
      data: {
        campaignId: campaign.id,
        traineeProfileId: trainee.traineeProfile.id,
        assignmentStatus: 'ASSIGNED',
        accessType: 'ASSIGNED',
      },
    });
    const source = await prisma.organisationEmail.create({
      data: {
        organisationId: organisation.id,
        senderLabel: draft.senderLabel,
        senderAddress: draft.senderAddress,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        linkAnchorText: draft.link?.anchorText,
        expectedClassification: 'PHISHING',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        contentHash: 'real-email-portal-source',
        status: 'ACTIVE',
      },
    });
    const startedAt = new Date();
    const endAt = new Date(startedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const simulation = await prisma.phishingSimulation.create({
      data: {
        organisationId: organisation.id,
        campaignId: campaign.id,
        status: 'DRAFT',
        emailCount: 1,
        startAt: startedAt,
        endAt,
        sendFrom: '00:00',
        sendUntil: '23:59',
        weekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        providerProfileIds: ['platform-provider'],
      },
    });
    const libraryEmail = await OrganisationEmailRepository.findOrganisationEmail(
      organisation.id,
      source.id,
    );
    if (!libraryEmail) throw new Error('Library email fixture was not created');
    const copied = await PhishingSimulationRepository.addPhishingSimulationEmailSnapshot({
      organisationId: organisation.id,
      campaignId: campaign.id,
      simulationId: simulation.id,
      source: libraryEmail,
    });
    if (copied.state !== 'CREATED') throw new Error('Pool snapshot was not created');
    expect(copied.email.portalTemplateId).toBe('GENERIC_ACCOUNT_LOGIN_V1');
    const safeSource = await prisma.organisationEmail.create({
      data: {
        organisationId: organisation.id,
        senderLabel: draft.senderLabel,
        senderAddress: draft.senderAddress,
        subject: 'Safe example',
        bodyHtml: '<p>Safe example</p>',
        expectedClassification: 'SAFE',
        portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1',
        contentHash: 'safe-real-email-source',
        status: 'ACTIVE',
      },
    });
    const safeLibraryEmail = await OrganisationEmailRepository.findOrganisationEmail(
      organisation.id,
      safeSource.id,
    );
    if (!safeLibraryEmail) throw new Error('Safe library fixture was not created');
    const copiedSafe = await PhishingSimulationRepository.addPhishingSimulationEmailSnapshot({
      organisationId: organisation.id,
      campaignId: campaign.id,
      simulationId: simulation.id,
      source: safeLibraryEmail,
    });
    if (copiedSafe.state !== 'CREATED') throw new Error('Safe pool snapshot was not created');
    expect(copiedSafe.email.portalTemplateId).toBeNull();

    await prisma.organisationEmail.update({
      where: { id: source.id },
      data: { portalTemplateId: 'GENERIC_BANKING_LOGIN_V1' },
    });
    await prisma.phishingSimulation.update({
      where: { id: simulation.id },
      data: { status: 'SCHEDULED', emailCount: 2 },
    });
    expect((await startPhishingSimulation(simulation.id, startedAt)).state).toBe('RUNNING');
    const planned = await prisma.phishingSimulationMessage.findFirstOrThrow({
      where: { phishingSimulationId: simulation.id, poolEmailId: copied.email.id },
    });
    expect(planned.portalTemplateId).toBe('GENERIC_ACCOUNT_LOGIN_V1');
    expect(
      (
        await prisma.phishingSimulationMessage.findFirstOrThrow({
          where: { phishingSimulationId: simulation.id, poolEmailId: copiedSafe.email.id },
        })
      ).portalTemplateId,
    ).toBeNull();
    await prisma.phishingSimulationEmail.update({
      where: { id: copied.email.id },
      data: { portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1' },
    });
    const configuredOrigins = [...env.SIMULATION_PUBLIC_ORIGINS];
    env.SIMULATION_PUBLIC_ORIGINS.splice(
      0,
      configuredOrigins.length,
      'https://simulation-one.test',
    );
    try {
      const state: PhishingSimulationMessageQueueState = {
        message: await prisma.phishingSimulationMessage.findUniqueOrThrow({
          where: { id: planned.id },
          include: {
            recipient: true,
            phishingSimulation: {
              select: {
                id: true,
                organisationId: true,
                campaignId: true,
                status: true,
                endAt: true,
              },
            },
          },
        }),
        poolEmail: await prisma.phishingSimulationEmail.findUniqueOrThrow({
          where: { id: copied.email.id },
          include: { redFlags: true },
        }),
      };
      const concurrentUrls = await Promise.all([
        prisma.$transaction((tx) =>
          getOrCreateRealEmailManagedPortal(state, tx, planned.scheduledFor),
        ),
        prisma.$transaction((tx) =>
          getOrCreateRealEmailManagedPortal(state, tx, planned.scheduledFor),
        ),
      ]);
      expect(concurrentUrls[1]).toBe(concurrentUrls[0]);
      expect(
        await prisma.managedPortalLink.count({
          where: { phishingSimulationMessageId: planned.id },
        }),
      ).toBe(1);
      expect(
        (await queuePhishingSimulationMessage(simulation.id, planned.id, planned.scheduledFor))
          .state,
      ).toBe('QUEUED');
      const link = await findManagedPortalLinkByPlannedMessage(planned.id);
      if (!link) throw new Error('Managed portal link was not created');
      const job = await prisma.emailDeliveryJob.findFirstOrThrow({
        where: { deliveryLog: { phishingSimulationMessage: { id: planned.id } } },
      });
      expect(link?.portalTemplateId).toBe('GENERIC_ACCOUNT_LOGIN_V1');
      expect(link?.publicOrigin).toBe('https://simulation-one.test');
      expect(job.htmlBody).toContain('https://simulation-one.test/p/');
      expect(job.htmlBody).toContain(concurrentUrls[0]);
      expect(job.htmlBody).not.toContain('{{SYSTEM_LINK}}');
      expect(
        (await queuePhishingSimulationMessage(simulation.id, planned.id, planned.scheduledFor))
          .state,
      ).toBe('NO_OP');
      expect(
        (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: job.id } })).htmlBody,
      ).toBe(job.htmlBody);
      expect(
        await prisma.managedPortalLink.count({
          where: { phishingSimulationMessageId: planned.id },
        }),
      ).toBe(1);
      const token = deriveManagedPortalToken(link.id);
      const transport = { requestHostname: 'simulation-one.test' };
      expect(await resolvePhishingPortal(token, transport)).toEqual({ state: 'UNAVAILABLE' });
      expect(
        await prisma.portalInteractionEvent.count({ where: { managedPortalLinkId: link.id } }),
      ).toBe(0);
      await prisma.emailDeliveryJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCEEDED',
          lastProviderOutcome: 'PROVIDER_ACCEPTED',
          terminalAt: new Date(),
        },
      });
      await prisma.emailDeliveryLog.update({
        where: { id: job.deliveryLogId },
        data: { deliveryStatus: 'SENT', sentAt: new Date() },
      });
      await prisma.phishingSimulation.update({
        where: { id: simulation.id },
        data: { status: 'COMPLETED' },
      });
      expect((await resolvePhishingPortal(token, transport)).state).toBe('ACTIVE');
      await prisma.phishingSimulation.update({
        where: { id: simulation.id },
        data: { status: 'STOPPED' },
      });
      expect((await resolvePhishingPortal(token, transport)).state).toBe('ACTIVE');
      expect(
        (await resolvePhishingPortal(token, { requestHostname: 'different.test' })).state,
      ).toBe('UNAVAILABLE');
      expect((await findPortalInteractionEvents(link.id)).map((event) => event.eventType)).toEqual([
        'MANAGED_LINK_REQUESTED',
        'MANAGED_LINK_REQUESTED',
      ]);
      await setManagedPortalLinkRevokedAt({ id: link.id, revokedAt: new Date() });
      expect((await resolvePhishingPortal(token, transport)).state).toBe('UNAVAILABLE');
    } finally {
      env.SIMULATION_PUBLIC_ORIGINS.splice(
        0,
        env.SIMULATION_PUBLIC_ORIGINS.length,
        ...configuredOrigins,
      );
    }
  });
  it('enforces one exclusive planned-message source while preserving Inbox links', async () => {
    const context = await createPortalContext();
    const simulation = await prisma.phishingSimulation.create({
      data: {
        organisationId: context.organisation.id,
        campaignId: context.campaign.id,
        status: 'RUNNING',
      },
    });
    const poolEmail = await prisma.phishingSimulationEmail.create({
      data: {
        phishingSimulationId: simulation.id,
        senderLabel: draft.senderLabel,
        senderAddress: draft.senderAddress,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        linkAnchorText: draft.link?.anchorText,
        expectedClassification: 'PHISHING',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      },
    });
    const recipient = await prisma.phishingSimulationRecipient.create({
      data: {
        phishingSimulationId: simulation.id,
        campaignAssignmentId: context.assignment.id,
        traineeProfileId: context.traineeProfileId,
        recipientEmail: 'trainee@example.test',
        recipientFirstName: 'Trainee',
        recipientLastName: 'Example',
      },
    });
    const message = await prisma.phishingSimulationMessage.create({
      data: {
        phishingSimulationId: simulation.id,
        recipientId: recipient.id,
        poolEmailId: poolEmail.id,
        providerProfileId: 'platform-provider',
        scheduledFor: new Date('2026-09-21T08:00:00.000Z'),
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      },
    });
    const inboxLink = await createLink(context, { tokenHash: 'inbox-hash' });
    const link = await createManagedPortalLink({
      id: 'real-email-link',
      tokenHash: 'real-email-hash',
      publicOrigin: 'https://simulation-one.test',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      traineeProfileId: context.traineeProfileId,
      organisationId: context.organisation.id,
      context: { channel: 'REAL_EMAIL', phishingSimulationMessageId: message.id },
      expiresAt: new Date('2026-09-22T08:00:00.000Z'),
    });

    expect((await findManagedPortalLinkByPlannedMessage(message.id))?.context).toEqual({
      channel: 'REAL_EMAIL',
      phishingSimulationMessageId: message.id,
    });
    expect((await findManagedPortalLinkByTokenHash('inbox-hash'))?.id).toBe(inboxLink.id);
    await expect(
      createManagedPortalLink({
        id: 'duplicate-real-email-link',
        tokenHash: 'another-real-email-hash',
        publicOrigin: 'https://simulation-one.test',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: context.traineeProfileId,
        organisationId: context.organisation.id,
        context: { channel: 'REAL_EMAIL', phishingSimulationMessageId: message.id },
        expiresAt: new Date('2026-09-22T08:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(ManagedPortalLinkOccurrenceConflictError);
    await expect(
      prisma.managedPortalLink.update({
        where: { id: link.id },
        data: { campaignAssignmentId: context.assignment.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.managedPortalLink.update({
        where: { id: inboxLink.id },
        data: { campaignItemId: null },
      }),
    ).rejects.toThrow();
    const resolution = await findManagedPortalLinkResolutionByTokenHash('real-email-hash');
    expect(resolution?.context).toEqual({
      channel: 'REAL_EMAIL',
      phishingSimulationMessageId: message.id,
    });
    expect(resolution?.phishingSimulationMessage?.portalTemplateId).toBe(
      'GENERIC_ACCOUNT_LOGIN_V1',
    );
    await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'MANAGED_LINK_REQUESTED',
      clientEventId: null,
    });
    expect(
      (
        await readCampaignPortalReportingFacts({
          organisationId: context.organisation.id,
          campaignId: context.campaign.id,
        })
      ).find((fact) => fact.managedPortalLinkId === link.id)?.context,
    ).toEqual({
      channel: 'REAL_EMAIL',
      phishingSimulationMessageId: message.id,
      campaignAssignmentId: context.assignment.id,
    });
  });
  it('persists null and every canonical Organisation Email portal snapshot', async () => {
    const organisation = await createOrganisation({ name: 'Portal Email Organisation' });
    const trainee = await createTrainee({
      user: { email: 'portal-email-author@example.test' },
    });
    const templateIds = [null, ...PORTAL_TEMPLATE_IDS] as const;

    for (const [index, portalTemplateId] of templateIds.entries()) {
      const result = await OrganisationEmailRepository.registerOrganisationEmailDraft(
        {
          organisationId: organisation.id,
          createdByUserId: trainee.user.id,
          draft: { ...draft, subject: `Portal snapshot ${index}` },
          contentHash: `portal-content-${index}`,
          portalTemplateId,
        },
        () => false,
      );
      const stored = await OrganisationEmailRepository.findOrganisationEmail(
        organisation.id,
        result.record.id,
      );
      expect(stored?.portalTemplateId).toBe(portalTemplateId);
    }
  });

  it('keeps a SimulatedEmail template snapshot independent through source edits and copying', async () => {
    const context = await createPortalContext();
    const source = await prisma.organisationEmail.create({
      data: {
        organisationId: context.organisation.id,
        senderLabel: draft.senderLabel,
        senderAddress: draft.senderAddress,
        subject: draft.subject,
        preview: draft.preview,
        bodyHtml: draft.bodyHtml,
        linkAnchorText: draft.link?.anchorText ?? null,
        portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1',
        expectedClassification: draft.expectedClassification,
        categories: draft.categories,
        difficultyLevel: draft.difficultyLevel,
        contentHash: 'source-portal-content',
        status: 'ACTIVE',
      },
    });

    const created = await addActiveLibraryEmailSnapshot({
      organisationId: context.organisation.id,
      simulationId: context.simulation.id,
      organisationEmailId: source.id,
    });
    if (created.state !== 'CREATED') {
      throw new Error('SimulatedEmail snapshot was not created.');
    }
    expect(created.email.portalTemplateId).toBe('GENERIC_DOCUMENT_ACCESS_V1');

    await prisma.organisationEmail.update({
      where: { id: source.id },
      data: { portalTemplateId: 'GENERIC_BANKING_LOGIN_V1' },
    });
    const afterSourceEdit = await findSimulatedInbox(
      context.organisation.id,
      context.simulation.id,
    );
    expect(
      afterSourceEdit?.simulatedInbox?.emails.find((email) => email.id === created.email.id)
        ?.portalTemplateId,
    ).toBe('GENERIC_DOCUMENT_ACCESS_V1');

    await prisma.simulation.update({
      where: { id: context.simulation.id },
      data: { safetyStatus: 'APPROVED' },
    });
    await prisma.simulatedInbox.update({
      where: { id: context.inboxId },
      data: { status: 'ACTIVE' },
    });
    const copy = await copyActiveSimulatedInbox({
      organisationId: context.organisation.id,
      simulationId: context.simulation.id,
      createdByUserId: context.userId,
    });
    expect(
      copy?.simulatedInbox?.emails.find((email) => email.sourceOrganisationEmailId === source.id)
        ?.portalTemplateId,
    ).toBe('GENERIC_DOCUMENT_ACCESS_V1');
  });

  it('persists, resolves, revokes and idempotently records managed-link facts', async () => {
    const context = await createPortalContext();
    const secondContext = await createPortalContext();
    const link = await createLink(context, { tokenHash: 'sha256:link-one' });
    const secondLink = await createLink(secondContext, {
      tokenHash: 'sha256:link-two',
      organisationId: null,
    });

    expect(link).toMatchObject({
      tokenHash: 'sha256:link-one',
      purpose: 'PHISHING_PORTAL',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      traineeProfileId: context.traineeProfileId,
      organisationId: context.organisation.id,
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: context.assignment.id,
        campaignItemId: context.campaignItem.id,
        simulatedEmailId: context.simulatedEmail.id,
      },
      expiresAt: '2026-09-22T08:00:00.000Z',
      revokedAt: null,
    });
    await expect(findManagedPortalLinkByTokenHash('sha256:link-one')).resolves.toEqual(link);
    await expect(
      findManagedPortalLinkResolutionByTokenHash('sha256:link-one'),
    ).resolves.toMatchObject({
      simulatedEmail: {
        id: context.simulatedEmail.id,
        redFlags: [
          {
            label: 'Unexpected destination',
            description: 'The destination does not match the sender.',
          },
        ],
      },
    });
    expect(secondLink.organisationId).toBeNull();

    const recordedRevocation = new Date('2026-09-21T12:00:00.000Z');
    const revoked = await setManagedPortalLinkRevokedAt({
      id: link.id,
      revokedAt: recordedRevocation,
    });
    expect(revoked.revokedAt).toBe('2026-09-21T12:00:00.000Z');

    const firstServerEvent = await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'MANAGED_LINK_REQUESTED',
      clientEventId: null,
    });
    const secondServerEvent = await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'MANAGED_LINK_REQUESTED',
      clientEventId: null,
    });
    const browserEvent = await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'PORTAL_VISITED',
      clientEventId: 'browser-event-1',
    });
    const retry = await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'PORTAL_VISITED',
      clientEventId: 'browser-event-1',
    });
    const deliberateAction = await createPortalInteractionEvent({
      managedPortalLinkId: link.id,
      eventType: 'PORTAL_VISITED',
      clientEventId: 'browser-event-2',
    });
    const sameClientIdOnAnotherLink = await createPortalInteractionEvent({
      managedPortalLinkId: secondLink.id,
      eventType: 'PORTAL_VISITED',
      clientEventId: 'browser-event-1',
    });
    const [firstIdentifierInteraction, concurrentIdentifierRetry] = await Promise.all([
      createFirstPortalInteractionEvent({
        managedPortalLinkId: link.id,
        eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
        clientEventId: 'identifier-event-1',
      }),
      createFirstPortalInteractionEvent({
        managedPortalLinkId: link.id,
        eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
        clientEventId: 'identifier-event-2',
      }),
    ]);

    expect(firstServerEvent.record.id).not.toBe(secondServerEvent.record.id);
    expect(browserEvent.created).toBe(true);
    expect(retry).toEqual({ record: browserEvent.record, created: false });
    expect(deliberateAction.record.id).not.toBe(browserEvent.record.id);
    expect(sameClientIdOnAnotherLink.created).toBe(true);
    expect([firstIdentifierInteraction.created, concurrentIdentifierRetry.created].sort()).toEqual([
      false,
      true,
    ]);
    expect(firstIdentifierInteraction.record.id).toBe(concurrentIdentifierRetry.record.id);
    await expect(findPortalInteractionEvents(link.id)).resolves.toHaveLength(5);
  });

  it('rejects event and client identifier combinations that violate database constraints', async () => {
    const context = await createPortalContext();
    const link = await createLink(context, { tokenHash: 'sha256:constraint-link' });

    await expect(
      prisma.portalInteractionEvent.create({
        data: {
          managedPortalLinkId: link.id,
          eventType: 'PORTAL_VISITED',
          clientEventId: null,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.portalInteractionEvent.create({
        data: {
          managedPortalLinkId: link.id,
          eventType: 'MANAGED_LINK_REQUESTED',
          clientEventId: 'invalid-server-id',
        },
      }),
    ).rejects.toBeDefined();
  });

  it('converges concurrent occurrence creation on one database-enforced managed link', async () => {
    const context = await createPortalContext();

    const attempts = await Promise.allSettled([
      createLink(context, { tokenHash: 'sha256:concurrent-one' }),
      createLink(context, { tokenHash: 'sha256:concurrent-two' }),
    ]);

    const fulfilled = attempts.filter(
      (attempt): attempt is PromiseFulfilledResult<Awaited<ReturnType<typeof createLink>>> =>
        attempt.status === 'fulfilled',
    );
    const rejected = attempts.filter(
      (attempt): attempt is PromiseRejectedResult => attempt.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(ManagedPortalLinkOccurrenceConflictError);
    await expect(
      findManagedPortalLinkByOccurrence({
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: context.assignment.id,
        campaignItemId: context.campaignItem.id,
        simulatedEmailId: context.simulatedEmail.id,
      }),
    ).resolves.toMatchObject({ id: fulfilled[0]?.value.id });
    await expect(prisma.managedPortalLink.count()).resolves.toBe(1);
  });

  it('keeps all six portal facts isolated from Campaign interaction and completion state', async () => {
    const context = await createPortalContext();
    const link = await createLink(context, { tokenHash: 'sha256:progress-isolation' });
    const assignmentBefore = await prisma.campaignAssignment.findUniqueOrThrow({
      where: { id: context.assignment.id },
      select: {
        assignmentStatus: true,
        currentCampaignItemId: true,
        startedAt: true,
        completedAt: true,
      },
    });
    const eventTypes = [
      'MANAGED_LINK_REQUESTED',
      'PORTAL_VISITED',
      'PORTAL_IDENTIFIER_FIELD_INTERACTED',
      'PORTAL_CREDENTIAL_FIELD_INTERACTED',
      'CREDENTIAL_SUBMISSION_ATTEMPTED',
      'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
    ] as const;

    for (const [index, eventType] of eventTypes.entries()) {
      if (eventType === 'MANAGED_LINK_REQUESTED') {
        await createPortalInteractionEvent({
          managedPortalLinkId: link.id,
          eventType,
          clientEventId: null,
        });
      } else {
        await createPortalInteractionEvent({
          managedPortalLinkId: link.id,
          eventType,
          clientEventId: `progress-event-${index}`,
        });
      }
    }

    const assignmentAfter = await prisma.campaignAssignment.findUniqueOrThrow({
      where: { id: context.assignment.id },
      select: {
        assignmentStatus: true,
        currentCampaignItemId: true,
        startedAt: true,
        completedAt: true,
      },
    });
    expect(assignmentAfter).toEqual(assignmentBefore);
    await expect(
      prisma.interactionEvent.count({
        where: {
          campaignAssignmentId: context.assignment.id,
          campaignItemId: context.campaignItem.id,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.portalInteractionEvent.count({ where: { managedPortalLinkId: link.id } }),
    ).resolves.toBe(eventTypes.length);
  });

  it('executes Campaign reporting scope against tenant, Campaign cohort and General records', async () => {
    const requested = await createPortalContext();
    const otherOrganisation = await createPortalContext();
    const requestedLink = await createLink(requested, { tokenHash: 'sha256:report-requested' });
    const otherOrganisationLink = await createLink(otherOrganisation, {
      tokenHash: 'sha256:report-other-organisation',
    });

    const otherCampaign = await prisma.campaign.create({
      data: {
        organisationId: requested.organisation.id,
        name: 'Other portal campaign',
        campaignType: 'ORGANISATION_CUSTOM',
        difficultyLevel: 'MEDIUM',
        status: 'ACTIVE',
      },
    });
    const otherCampaignItem = await prisma.campaignItem.create({
      data: {
        campaignId: otherCampaign.id,
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        title: 'Other portal item',
        position: 0,
        simulationId: requested.simulation.id,
      },
    });
    const otherCampaignAssignment = await prisma.campaignAssignment.create({
      data: {
        campaignId: otherCampaign.id,
        traineeProfileId: requested.traineeProfileId,
        assignmentStatus: 'ASSIGNED',
        accessType: 'ASSIGNED',
      },
    });
    const otherCampaignLink = await createManagedPortalLink({
      id: 'link-report-other-campaign',
      tokenHash: 'sha256:report-other-campaign',
      publicOrigin: 'https://simulation-one.test',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      traineeProfileId: requested.traineeProfileId,
      organisationId: requested.organisation.id,
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: otherCampaignAssignment.id,
        campaignItemId: otherCampaignItem.id,
        simulatedEmailId: requested.simulatedEmail.id,
      },
      expiresAt: new Date('2026-09-22T08:00:00.000Z'),
    });
    const generalContext = await createPortalContext();
    await prisma.simulation.update({
      where: { id: generalContext.simulation.id },
      data: { organisationId: null },
    });
    await prisma.campaign.update({
      where: { id: generalContext.campaign.id },
      data: { organisationId: null, campaignType: 'PREMADE_GENERAL' },
    });
    const generalLink = await createLink(generalContext, {
      tokenHash: 'sha256:report-general',
      organisationId: null,
    });

    const requestedEvents = [
      ['MANAGED_LINK_REQUESTED', null],
      ['PORTAL_VISITED', 'visit-1'],
      ['PORTAL_IDENTIFIER_FIELD_INTERACTED', 'identifier-1'],
      ['PORTAL_CREDENTIAL_FIELD_INTERACTED', 'credential-field-1'],
      ['CREDENTIAL_SUBMISSION_ATTEMPTED', 'attempt-1'],
      ['CREDENTIAL_SUBMISSION_ATTEMPTED', 'attempt-2'],
      ['PORTAL_EDUCATIONAL_REVEAL_VIEWED', 'reveal-1'],
    ] as const;
    for (const [eventType, clientEventId] of requestedEvents) {
      if (eventType === 'MANAGED_LINK_REQUESTED') {
        await createPortalInteractionEvent({
          managedPortalLinkId: requestedLink.id,
          eventType,
          clientEventId: null,
        });
      } else {
        if (clientEventId === null) throw new Error('Browser portal event ID is required.');
        await createPortalInteractionEvent({
          managedPortalLinkId: requestedLink.id,
          eventType,
          clientEventId,
        });
      }
    }
    const retry = await createPortalInteractionEvent({
      managedPortalLinkId: requestedLink.id,
      eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
      clientEventId: 'attempt-1',
    });
    expect(retry.created).toBe(false);
    for (const link of [otherOrganisationLink, otherCampaignLink, generalLink]) {
      await createPortalInteractionEvent({
        managedPortalLinkId: link.id,
        eventType: 'PORTAL_VISITED',
        clientEventId: `visit-${link.id}`,
      });
    }

    const facts = await readCampaignPortalReportingFacts({
      organisationId: requested.organisation.id,
      campaignId: requested.campaign.id,
    });

    expect(facts).toHaveLength(requestedEvents.length);
    expect(new Set(facts.map(({ managedPortalLinkId }) => managedPortalLinkId))).toEqual(
      new Set([requestedLink.id]),
    );
    expect(facts.map(({ eventType }) => eventType)).toEqual(
      expect.arrayContaining(requestedEvents.map(([type]) => type)),
    );
    expect(
      facts.filter(({ eventType }) => eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED'),
    ).toHaveLength(2);
    expect(
      facts.every(({ traineeProfileId }) => traineeProfileId === requested.traineeProfileId),
    ).toBe(true);
    expect(facts.every(({ context }) => context.channel === 'SIMULATED_INBOX')).toBe(true);
    expect(JSON.stringify(facts)).not.toMatch(/tokenHash|clientEventId|recipient|metadata/i);
  });
});
