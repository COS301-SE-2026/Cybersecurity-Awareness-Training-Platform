import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import {
  findCampaignPhishingSimulationFacts,
  preparePhishingSimulationMessageAttempt,
  stopPhishingSimulation,
} from '../../src/repositories/phishing-simulation.repository.js';
import {
  claimDueEmailDeliveryJobs,
  reconcileAcceptedEmailDelivery,
  recordEmailDeliveryAccepted,
  recoverExpiredEmailDeliveryLeases,
} from '../../src/repositories/email-delivery.repository.js';
import {
  getPhishingSimulationFeedback,
  getPhishingSimulationMessageAttemptDecision,
  resolveManagedPhishingSimulationTrackingLink,
} from '../../src/services/phishing-simulation.service.js';
import { hashOpaqueToken } from '../../src/services/token-hash.service.js';
import { isRealEmailPortalSourceEligible } from '../../src/services/phishing-portal.service.js';
import { createOrganisation } from '../helpers/factories.js';

async function fixture() {
  const organisation = await createOrganisation();
  const campaign = await prisma.campaign.create({
    data: {
      organisationId: organisation.id,
      name: `Delivery handoff ${randomUUID()}`,
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
    },
  });
  const simulation = await prisma.phishingSimulation.create({
    data: {
      organisationId: organisation.id,
      campaignId: campaign.id,
      status: 'RUNNING',
      endAt: new Date(Date.now() + 86_400_000),
      sendFrom: '00:00',
      sendUntil: '23:59',
      weekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    },
  });
  const pool = await prisma.phishingSimulationEmail.create({
    data: {
      phishingSimulationId: simulation.id,
      senderLabel: 'Security',
      senderAddress: 'security@example.test',
      subject: 'Review account',
      bodyHtml: '<a href="{{SYSTEM_LINK}}">Review</a>',
      expectedClassification: 'PHISHING',
    },
  });
  const recipient = await prisma.phishingSimulationRecipient.create({
    data: {
      phishingSimulationId: simulation.id,
      campaignAssignmentId: randomUUID(),
      traineeProfileId: randomUUID(),
      recipientEmail: 'recipient@example.test',
      recipientFirstName: 'Test',
      recipientLastName: 'Recipient',
    },
  });
  const log = await prisma.emailDeliveryLog.create({
    data: { recipientEmail: recipient.recipientEmail, emailType: 'PHISHING_SIMULATION_MESSAGE' },
  });
  const job = await prisma.emailDeliveryJob.create({
    data: {
      deliveryLogId: log.id,
      emailType: 'PHISHING_SIMULATION_MESSAGE',
      recipientEmail: recipient.recipientEmail,
      subject: pool.subject,
      textBody: 'Review account',
      status: 'PROCESSING',
      leaseOwner: 'dispatcher-1',
      leasedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60_000),
      attemptCount: 1,
      simulationHandoffClaim: true,
    },
  });
  const token = `ordinary-${randomUUID()}`;
  const message = await prisma.phishingSimulationMessage.create({
    data: {
      phishingSimulationId: simulation.id,
      recipientId: recipient.id,
      poolEmailId: pool.id,
      providerProfileId: '00000000-0000-4000-8000-000000000000',
      scheduledFor: new Date(),
      dispatchStatus: 'QUEUED',
      emailDeliveryLogId: log.id,
      trackingTokenHash: hashOpaqueToken(token),
      trackingTokenExpiresAt: new Date(Date.now() + 86_400_000),
      publicOrigin: 'http://localhost:4000',
    },
  });
  const stop = (reason: 'ADMIN_STOPPED' | 'CAMPAIGN_INACTIVE' = 'ADMIN_STOPPED') =>
    stopPhishingSimulation({
      organisationId: organisation.id,
      campaignId: campaign.id,
      simulationId: simulation.id,
      stoppedAt: new Date(),
      stopReason: reason,
      deliveryReasonCode: reason,
      validate: () => undefined,
    });
  const handoff = () =>
    preparePhishingSimulationMessageAttempt({
      phishingSimulationId: simulation.id,
      messageId: message.id,
      providerProfileId: message.providerProfileId,
      deliveryLogId: log.id,
      jobId: job.id,
      leaseOwner: 'dispatcher-1',
      attemptCount: 1,
      checkedAt: new Date(),
      actualFromAddress: 'sender@example.test',
      actualFromName: null,
      actualReplyTo: null,
      validate: getPhishingSimulationMessageAttemptDecision,
    });
  return { organisation, campaign, simulation, message, log, job, token, stop, handoff };
}

describe('simulation delivery handoff', () => {
  it('serializes a concurrent Stop and handoff under the simulation lock', async () => {
    const state = await fixture();
    const [preparation, stopped] = await Promise.all([state.handoff(), state.stop()]);
    if (preparation.state === 'READY') {
      expect(stopped.state).toBe('STOPPING');
      expect(
        (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } })).status,
      ).toBe('SUBMITTING');
    } else {
      expect(stopped.state).toBe('STOPPED');
      expect(
        (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } })).status,
      ).toBe('CANCELLED');
    }
  });

  it('cancels a claimed attempt when Stop commits first', async () => {
    const state = await fixture();
    expect((await state.stop()).state).toBe('STOPPED');
    expect((await state.handoff()).state).not.toBe('READY');
    expect(
      (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } })).status,
    ).toBe('CANCELLED');
    expect(
      (
        await prisma.phishingSimulationMessage.findUniqueOrThrow({
          where: { id: state.message.id },
        })
      ).dispatchStatus,
    ).toBe('CANCELLED');
  });

  it('holds Stop behind a durable handoff, then preserves accepted history', async () => {
    const state = await fixture();
    expect((await state.handoff()).state).toBe('READY');
    expect((await state.stop()).state).toBe('STOPPING');
    expect((await state.handoff()).state).not.toBe('READY');
    expect(
      await recordEmailDeliveryAccepted({
        jobId: state.job.id,
        deliveryLogId: state.log.id,
        providerMessageId: 'smtp-accepted-1',
        leaseOwner: 'dispatcher-1',
        attemptCount: 1,
      }),
    ).toBe(true);
    expect((await state.stop()).state).toBe('STOPPED');
    expect(
      (
        await prisma.phishingSimulationMessage.findUniqueOrThrow({
          where: { id: state.message.id },
        })
      ).dispatchStatus,
    ).toBe('SUBMITTED');
    expect(
      (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } }))
        .lastProviderOutcome,
    ).toBe('PROVIDER_ACCEPTED');
  });

  it('applies Campaign invalidation to the same handoff and recovers an expired submission as ambiguous', async () => {
    const state = await fixture();
    await prisma.campaign.update({
      where: { id: state.campaign.id },
      data: { status: 'COMPLETED' },
    });
    expect((await state.handoff()).state).toBe('CANCELLED');
    expect((await state.stop('CAMPAIGN_INACTIVE')).state).toBe('STOPPED');

    const second = await fixture();
    expect((await second.handoff()).state).toBe('READY');
    await prisma.campaign.update({
      where: { id: second.campaign.id },
      data: { status: 'COMPLETED' },
    });
    expect((await second.stop('CAMPAIGN_INACTIVE')).state).toBe('STOPPING');
    await recoverExpiredEmailDeliveryLeases({ now: new Date(Date.now() + 120_000) });
    const recovered = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: second.job.id },
    });
    expect(recovered.status).toBe('FAILED');
    expect(recovered.lastProviderOutcome).toBe('PROVIDER_AMBIGUOUS');
    expect((await second.stop('CAMPAIGN_INACTIVE')).state).toBe('STOPPED');
  });

  it('releases an expired pre-handoff claim for a new attempt without submitting the expired claim', async () => {
    const state = await fixture();
    const now = new Date(Date.now() + 120_000);
    await recoverExpiredEmailDeliveryLeases({ now });
    const recovered = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: state.job.id },
    });
    expect(recovered.status).toBe('RETRY_SCHEDULED');
    expect(recovered.lastProviderOutcome).toBeNull();
    expect(recovered.leaseOwner).toBeNull();
    expect((await state.handoff()).state).not.toBe('READY');
    expect(
      (await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: state.log.id } }))
        .deliveryStatus,
    ).toBe('PENDING');
    const claimed = await claimDueEmailDeliveryJobs({
      leaseOwner: 'dispatcher-2',
      batchSize: 1,
      leaseSeconds: 60,
      retryDeadlineSeconds: 600,
      now,
    });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.attemptCount).toBe(2);
    expect(
      (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } }))
        .simulationHandoffClaim,
    ).toBe(true);
    expect((await state.stop()).state).toBe('STOPPED');
    expect(
      (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } })).status,
    ).toBe('CANCELLED');
  });

  it('serializes expired pre-handoff recovery with Stop', async () => {
    const state = await fixture();
    await Promise.all([
      recoverExpiredEmailDeliveryLeases({ now: new Date(Date.now() + 120_000) }),
      state.stop(),
    ]);
    expect((await state.stop()).state).toBe('STOPPED');
    expect(
      (await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } })).status,
    ).toBe('CANCELLED');
    expect((await state.handoff()).state).not.toBe('READY');
  });

  it('keeps an older unmarked processing claim ambiguous instead of retrying it', async () => {
    const state = await fixture();
    await prisma.emailDeliveryJob.update({
      where: { id: state.job.id },
      data: { simulationHandoffClaim: false },
    });
    await recoverExpiredEmailDeliveryLeases({ now: new Date(Date.now() + 120_000) });
    const recovered = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: state.job.id },
    });
    expect(recovered.status).toBe('FAILED');
    expect(recovered.lastProviderOutcome).toBe('PROVIDER_AMBIGUOUS');
    expect((await state.handoff()).state).not.toBe('READY');
  });

  it('reconciles accepted SMTP facts after ambiguous recovery without overwriting a newer attempt', async () => {
    const state = await fixture();
    expect((await state.handoff()).state).toBe('READY');
    await recoverExpiredEmailDeliveryLeases({ now: new Date(Date.now() + 120_000) });
    expect(
      await reconcileAcceptedEmailDelivery({
        jobId: state.job.id,
        deliveryLogId: state.log.id,
        providerMessageId: 'smtp-accepted-2',
        leaseOwner: 'dispatcher-1',
        attemptCount: 1,
      }),
    ).toBe(true);
    const log = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: state.log.id } });
    expect(log.deliveryStatus).toBe('SENT');
    expect(log.providerMessageId).toBe('smtp-accepted-2');
    expect(log.sentAt).not.toBeNull();
    const job = await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } });
    expect(
      isRealEmailPortalSourceEligible(
        {
          deliveryStatus: log.deliveryStatus,
          deliveryJobStatus: job.status,
          lastProviderOutcome: job.lastProviderOutcome,
          providerTerminalAt: job.terminalAt,
          sourceAvailable: true,
          expiresAt: new Date(Date.now() + 86_400_000),
          revokedAt: null,
        },
        new Date(),
      ),
    ).toBe(true);
    expect(
      (
        await prisma.phishingSimulationMessage.findUniqueOrThrow({
          where: { id: state.message.id },
        })
      ).dispatchStatus,
    ).toBe('SUBMITTED');
    expect(
      await reconcileAcceptedEmailDelivery({
        jobId: state.job.id,
        deliveryLogId: state.log.id,
        providerMessageId: 'stale-result',
        leaseOwner: 'dispatcher-1',
        attemptCount: 1,
      }),
    ).toBe(false);

    const newer = await fixture();
    await prisma.emailDeliveryJob.update({
      where: { id: newer.job.id },
      data: { attemptCount: 2, leaseOwner: 'dispatcher-2' },
    });
    expect(
      await reconcileAcceptedEmailDelivery({
        jobId: newer.job.id,
        deliveryLogId: newer.log.id,
        providerMessageId: 'stale-result',
        leaseOwner: 'dispatcher-1',
        attemptCount: 1,
      }),
    ).toBe(false);
    expect(
      (await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: newer.log.id } }))
        .deliveryStatus,
    ).toBe('PENDING');
  });

  it('repairs a planned failure after ambiguous recovery when the same SMTP attempt is accepted', async () => {
    const state = await fixture();
    expect((await state.handoff()).state).toBe('READY');
    await recoverExpiredEmailDeliveryLeases({ now: new Date(Date.now() + 120_000) });
    expect((await state.stop()).state).toBe('STOPPED');
    expect(
      (
        await prisma.phishingSimulationMessage.findUniqueOrThrow({
          where: { id: state.message.id },
        })
      ).dispatchStatus,
    ).toBe('FAILED');
    await expect(getPhishingSimulationFeedback(state.token)).rejects.toMatchObject({
      statusCode: 404,
      error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
    });
    expect(
      await reconcileAcceptedEmailDelivery({
        jobId: state.job.id,
        deliveryLogId: state.log.id,
        providerMessageId: 'smtp-late-acceptance',
        leaseOwner: 'dispatcher-1',
        attemptCount: 1,
      }),
    ).toBe(true);
    const message = await prisma.phishingSimulationMessage.findUniqueOrThrow({
      where: { id: state.message.id },
    });
    const log = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: state.log.id } });
    const job = await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: state.job.id } });
    expect(message.dispatchStatus).toBe('SUBMITTED');
    expect(log.deliveryStatus).toBe('SENT');
    expect(log.providerMessageId).toBe('smtp-late-acceptance');
    expect(log.sentAt).not.toBeNull();
    expect(job.status).toBe('SUCCEEDED');
    expect(job.lastProviderOutcome).toBe('PROVIDER_ACCEPTED');
    const reportingFacts = await findCampaignPhishingSimulationFacts({
      organisationId: state.organisation.id,
      campaignId: state.campaign.id,
    });
    expect(reportingFacts[0]?.messages[0]?.dispatchStatus).toBe('SUBMITTED');
    await expect(getPhishingSimulationFeedback(state.token)).resolves.toMatchObject({
      expectedClassification: 'PHISHING',
    });
    expect((await state.stop()).state).toBe('STOPPED');
  });

  it('allows ordinary feedback only from accepted delivery facts and records a managed click once', async () => {
    const state = await fixture();
    const unavailable = () => getPhishingSimulationFeedback(state.token);
    await expect(unavailable()).rejects.toMatchObject({
      statusCode: 404,
      error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
    });
    for (const status of ['PENDING', 'RETRY_SCHEDULED', 'CANCELLED', 'FAILED'] as const) {
      await prisma.emailDeliveryJob.update({ where: { id: state.job.id }, data: { status } });
      await expect(unavailable()).rejects.toMatchObject({
        statusCode: 404,
        error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
      });
    }
    expect(
      await prisma.phishingSimulationTrackingEvent.count({
        where: { messageId: state.message.id },
      }),
    ).toBe(0);
    await prisma.emailDeliveryJob.update({
      where: { id: state.job.id },
      data: { status: 'PROCESSING' },
    });
    await prisma.phishingSimulationMessage.update({
      where: { id: state.message.id },
      data: { dispatchStatus: 'SUBMITTED' },
    });
    await expect(unavailable()).rejects.toMatchObject({
      statusCode: 404,
      error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
    });
    await prisma.phishingSimulationMessage.update({
      where: { id: state.message.id },
      data: { dispatchStatus: 'QUEUED' },
    });
    expect((await state.handoff()).state).toBe('READY');
    expect(
      await recordEmailDeliveryAccepted({
        jobId: state.job.id,
        deliveryLogId: state.log.id,
        providerMessageId: 'smtp-accepted-3',
        leaseOwner: 'dispatcher-1',
        attemptCount: 1,
      }),
    ).toBe(true);
    await prisma.phishingSimulation.update({
      where: { id: state.simulation.id },
      data: { status: 'COMPLETED' },
    });
    await expect(unavailable()).resolves.toMatchObject({ expectedClassification: 'PHISHING' });
    expect(await resolveManagedPhishingSimulationTrackingLink(state.token, 'localhost')).toContain(
      '/phishing-simulations/feedback/',
    );
    expect(
      await prisma.phishingSimulationTrackingEvent.count({
        where: { messageId: state.message.id },
      }),
    ).toBe(1);
    await unavailable();
    expect(
      await prisma.phishingSimulationTrackingEvent.count({
        where: { messageId: state.message.id },
      }),
    ).toBe(1);
    await prisma.phishingSimulation.update({
      where: { id: state.simulation.id },
      data: { status: 'STOPPED' },
    });
    await expect(unavailable()).resolves.toMatchObject({ expectedClassification: 'PHISHING' });
    await prisma.emailDeliveryJob.update({
      where: { id: state.job.id },
      data: { lastProviderOutcome: 'PROVIDER_REJECTED' },
    });
    await expect(unavailable()).rejects.toMatchObject({
      statusCode: 404,
      error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
    });
    await prisma.emailDeliveryJob.update({
      where: { id: state.job.id },
      data: { lastProviderOutcome: 'PROVIDER_ACCEPTED' },
    });
    await prisma.phishingSimulationMessage.update({
      where: { id: state.message.id },
      data: { trackingTokenExpiresAt: new Date(Date.now() - 1) },
    });
    await expect(unavailable()).rejects.toMatchObject({
      statusCode: 404,
      error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
    });
    await expect(getPhishingSimulationFeedback('invalid-token')).rejects.toMatchObject({
      statusCode: 404,
      error: 'PHISHING_SIMULATION_LINK_UNAVAILABLE',
    });
  });
});
