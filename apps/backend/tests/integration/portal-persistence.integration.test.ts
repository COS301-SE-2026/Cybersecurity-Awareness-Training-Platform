import { PORTAL_TEMPLATE_IDS, type OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import * as OrganisationEmailRepository from '../../src/repositories/organisation-email.repository.js';
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
