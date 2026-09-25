import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type { EmailDeliveryDispatchJob } from '../repositories/email-delivery.repository.js';
import {
  cancelClaimedEmailDelivery,
  claimDueEmailDeliveryJobs,
  reconcileAcceptedEmailDelivery,
  recoverExpiredEmailDeliveryLeases,
  recordEmailDeliveryAccepted,
  recordEmailDeliveryTerminalFailure,
  scheduleEmailDeliveryRetry,
  verifyEmailDeliveryClaimOwnership,
  releaseClaimedSimulationEmailDelivery,
} from '../repositories/email-delivery.repository.js';
import { revalidateCampaignDeadlineReminder } from './campaign-email-reminder.service.js';
import { reconcileMissingCampaignEmails } from './campaign-email-recovery.service.js';
import { sendViaSMTP, SmtpDeliveryError } from './smtp-mailer.js';
import { resolvePhishingSimulationEmailProvider } from './email-provider-profile.service.js';
import {
  getPhishingSimulationMessageAttemptDecision,
  preparePhishingSimulationMessageAttempt,
} from './phishing-simulation.service.js';

type EmailDispatcherHandle = {
  stop: () => void;
};

type ProviderFailure = {
  providerOutcome: 'PROVIDER_REJECTED' | 'PROVIDER_TEMPORARY_FAILURE' | 'PROVIDER_AMBIGUOUS';
  reasonCode: string;
  retryable: boolean;
};

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function classifyDispatcherFailure(error: unknown): ProviderFailure {
  if (error instanceof SmtpDeliveryError) {
    if (error.failureKind === 'RETRYABLE') {
      return {
        providerOutcome: 'PROVIDER_TEMPORARY_FAILURE',
        reasonCode: error.reasonCode,
        retryable: true,
      };
    }

    if (error.failureKind === 'NON_RETRYABLE') {
      return {
        providerOutcome: 'PROVIDER_REJECTED',
        reasonCode: error.reasonCode,
        retryable: false,
      };
    }

    return {
      providerOutcome: 'PROVIDER_AMBIGUOUS',
      reasonCode: error.reasonCode,
      retryable: false,
    };
  }

  return {
    providerOutcome: 'PROVIDER_AMBIGUOUS',
    reasonCode: 'EMAIL_DISPATCHER_UNEXPECTED_FAILURE',
    retryable: false,
  };
}

function nextRetryAt(job: EmailDeliveryDispatchJob, now: Date): Date | null {
  const retryIndex = job.attemptCount - 1;
  const backoffSeconds = env.EMAIL_DISPATCHER_BACKOFF_SECONDS[retryIndex];

  if (!backoffSeconds) {
    return null;
  }

  const deadline = job.retryDeadlineAt;
  const nextAttemptAt = addSeconds(now, backoffSeconds);

  if (job.attemptCount >= job.maxAttempts) {
    return null;
  }

  if (deadline && nextAttemptAt > deadline) {
    return null;
  }
  const simulationMessage = job.deliveryLog.phishingSimulationMessage;
  if (simulationMessage !== null && simulationMessage !== undefined) {
    const decision = getPhishingSimulationMessageAttemptDecision({
      simulation: simulationMessage.phishingSimulation,
      campaign: simulationMessage.phishingSimulation.campaign,
      checkedAt: nextAttemptAt,
    });
    if (decision.state === 'READY') {
      return nextAttemptAt;
    }
    if (decision.state === 'RETRY_SCHEDULED') {
      return decision.nextAttemptAt;
    }
    return null;
  }
  return nextAttemptAt;
}

async function dispatchJob(job: EmailDeliveryDispatchJob) {
  const startedAt = Date.now();
  const leaseOwner = job.leaseOwner;

  if (!leaseOwner) {
    console.warn('[EmailDispatcher] Claimed job missing lease owner', {
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      emailType: job.emailType,
      providerKind: job.providerKind,
      reasonCode: 'EMAIL_DISPATCHER_MISSING_LEASE_OWNER',
    });
    return;
  }

  const ownsClaim = await verifyEmailDeliveryClaimOwnership({
    jobId: job.id,
    leaseOwner,
  });

  if (!ownsClaim) {
    console.warn('[EmailDispatcher] Skipping stale email delivery claim before provider call', {
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      emailType: job.emailType,
      providerKind: job.providerKind,
      reasonCode: 'EMAIL_DISPATCHER_STALE_CLAIM',
    });
    return;
  }

  if (job.emailType === 'CAMPAIGN_DEADLINE_REMINDER') {
    const assignmentId = job.deliveryLog.campaignAssignmentId;
    let validity;
    try {
      validity = assignmentId
        ? await revalidateCampaignDeadlineReminder({
            assignmentId,
            recipientEmail: job.recipientEmail,
          })
        : { valid: false as const, reasonCode: 'ASSIGNMENT_NOT_FOUND' as const };
    } catch {
      const retryAt = nextRetryAt(job, new Date());
      if (retryAt) {
        await scheduleEmailDeliveryRetry({
          jobId: job.id,
          nextAttemptAt: retryAt,
          providerOutcome: 'PROVIDER_TEMPORARY_FAILURE',
          reasonCode: 'CAMPAIGN_REMINDER_REVALIDATION_FAILED',
          leaseOwner,
        });
      }
      console.warn('[EmailDispatcher] Campaign reminder revalidation failed', {
        jobId: job.id,
        emailType: job.emailType,
        campaignAssignmentId: assignmentId ?? null,
        reasonCode: 'CAMPAIGN_REMINDER_REVALIDATION_FAILED',
      });
      return;
    }

    if (!validity.valid) {
      const cancelled = await cancelClaimedEmailDelivery({
        jobId: job.id,
        deliveryLogId: job.deliveryLogId,
        leaseOwner,
        reasonCode: validity.reasonCode,
      });
      console.warn('[EmailDispatcher] Skipping stale campaign deadline reminder', {
        jobId: job.id,
        emailType: job.emailType,
        campaignAssignmentId: assignmentId ?? null,
        reasonCode: cancelled ? validity.reasonCode : 'EMAIL_DISPATCHER_STALE_CLAIM',
      });
      return;
    }
  }

  let simulationProvider:
    | Awaited<ReturnType<typeof resolvePhishingSimulationEmailProvider>>
    | undefined;
  if (job.emailType === 'PHISHING_SIMULATION_MESSAGE') {
    const simulationMessage = job.deliveryLog.phishingSimulationMessage;
    if (simulationMessage === null || simulationMessage === undefined) {
      await releaseSimulationJobWithoutAttempt(job, leaseOwner, {
        state: 'FAILED',
        reasonCode: 'PHISHING_SIMULATION_MESSAGE_CONTEXT_MISSING',
      });
      return;
    }

    const initialCheckedAt = new Date();
    const initialDecision = getPhishingSimulationMessageAttemptDecision({
      simulation: simulationMessage.phishingSimulation,
      campaign: simulationMessage.phishingSimulation.campaign,
      checkedAt: initialCheckedAt,
    });
    if (initialDecision.state !== 'READY') {
      await releaseSimulationJobWithoutAttempt(job, leaseOwner, initialDecision);
      return;
    }

    try {
      simulationProvider = await resolvePhishingSimulationEmailProvider(
        simulationMessage.phishingSimulation.organisationId,
        simulationMessage.providerProfileId,
      );
    } catch (error: unknown) {
      const failure = classifyDispatcherFailure(error);
      const retryAt = failure.retryable ? nextRetryAt(job, new Date()) : null;
      const decision =
        retryAt === null
          ? { state: 'FAILED' as const, reasonCode: failure.reasonCode }
          : {
              state: 'RETRY_SCHEDULED' as const,
              nextAttemptAt: retryAt,
              reasonCode: failure.reasonCode,
            };
      await releaseSimulationJobWithoutAttempt(job, leaseOwner, decision);
      return;
    }

    let preparation: Awaited<ReturnType<typeof preparePhishingSimulationMessageAttempt>>;
    try {
      preparation = await preparePhishingSimulationMessageAttempt({
        phishingSimulationId: simulationMessage.phishingSimulationId,
        messageId: simulationMessage.id,
        providerProfileId: simulationMessage.providerProfileId,
        deliveryLogId: job.deliveryLogId,
        jobId: job.id,
        leaseOwner,
        attemptCount: job.attemptCount,
        checkedAt: new Date(),
        actualFromAddress: simulationProvider.sender.fromAddress,
        actualFromName: simulationProvider.sender.fromName,
        actualReplyTo: simulationProvider.sender.replyTo,
      });
    } catch {
      const retryAt = nextRetryAt(job, new Date());
      const decision =
        retryAt === null
          ? { state: 'FAILED' as const, reasonCode: 'PHISHING_SIMULATION_PRE_SEND_CHECK_FAILED' }
          : {
              state: 'RETRY_SCHEDULED' as const,
              nextAttemptAt: retryAt,
              reasonCode: 'PHISHING_SIMULATION_PRE_SEND_CHECK_FAILED',
            };
      await releaseSimulationJobWithoutAttempt(job, leaseOwner, decision);
      return;
    }
    if (preparation.state === 'NO_OP') {
      await releaseSimulationJobWithoutAttempt(job, leaseOwner, {
        state: 'FAILED',
        reasonCode: 'PHISHING_SIMULATION_PRE_SEND_STATE_STALE',
      });
      return;
    }
    if (preparation.state !== 'READY') {
      await releaseSimulationJobWithoutAttempt(job, leaseOwner, preparation);
      return;
    }
  }

  let result: Awaited<ReturnType<typeof sendViaSMTP>> | undefined;

  try {
    result = await sendViaSMTP({
      to: job.recipientEmail,
      subject: job.subject,
      text: job.textBody,
      html: job.htmlBody ?? undefined,
      ...(simulationProvider === undefined
        ? {}
        : { transport: simulationProvider.transport, sender: simulationProvider.sender }),
    });
  } catch (error: unknown) {
    if (!(error instanceof SmtpDeliveryError)) {
      throw error;
    }

    const failure = classifyDispatcherFailure(error);
    const now = new Date();
    const retryAt = failure.retryable ? nextRetryAt(job, now) : null;

    if (retryAt) {
      const scheduled = await scheduleEmailDeliveryRetry({
        jobId: job.id,
        nextAttemptAt: retryAt,
        providerOutcome: failure.providerOutcome,
        reasonCode: failure.reasonCode,
        leaseOwner,
        attemptCount: job.attemptCount,
      });

      if (!scheduled) {
        console.warn('[EmailDispatcher] Skipping retry because email delivery claim is stale', {
          jobId: job.id,
          deliveryLogId: job.deliveryLogId,
          emailType: job.emailType,
          providerKind: job.providerKind,
          attemptNumber: job.attemptCount,
          reasonCode: 'EMAIL_DISPATCHER_STALE_RETRY',
          durationMs: Date.now() - startedAt,
        });
        return;
      }

      console.warn('[EmailDispatcher] Email delivery retry scheduled', {
        jobId: job.id,
        deliveryLogId: job.deliveryLogId,
        emailType: job.emailType,
        providerKind: job.providerKind,
        attemptNumber: job.attemptCount,
        reasonCode: failure.reasonCode,
        nextAttemptAt: retryAt.toISOString(),
        durationMs: Date.now() - startedAt,
      });
      return;
    }

    const recorded = await recordEmailDeliveryTerminalFailure({
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      providerOutcome: failure.providerOutcome,
      reasonCode: failure.reasonCode,
      leaseOwner,
      attemptCount: job.attemptCount,
    });

    if (!recorded) {
      console.warn(
        '[EmailDispatcher] Skipping terminal failure because email delivery claim is stale',
        {
          jobId: job.id,
          deliveryLogId: job.deliveryLogId,
          emailType: job.emailType,
          providerKind: job.providerKind,
          attemptNumber: job.attemptCount,
          reasonCode: 'EMAIL_DISPATCHER_STALE_TERMINAL_FAILURE',
          durationMs: Date.now() - startedAt,
        },
      );
      return;
    }

    console.error('[EmailDispatcher] Email delivery reached terminal failure', {
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      emailType: job.emailType,
      providerKind: job.providerKind,
      attemptNumber: job.attemptCount,
      reasonCode: failure.reasonCode,
      durationMs: Date.now() - startedAt,
    });
  }

  if (!result) {
    return;
  }

  try {
    const recorded = await recordEmailDeliveryAccepted({
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      providerMessageId: result.providerMessageId,
      leaseOwner,
      attemptCount: job.attemptCount,
    });

    if (!recorded) {
      throw new Error('Provider acceptance requires attempt reconciliation');
    }

    console.info('[EmailDispatcher] Email provider accepted queued job', {
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      emailType: job.emailType,
      providerKind: job.providerKind,
      attemptNumber: job.attemptCount,
      durationMs: Date.now() - startedAt,
    });
  } catch {
    try {
      const reconciled = await reconcileAcceptedEmailDelivery({
        jobId: job.id,
        deliveryLogId: job.deliveryLogId,
        providerMessageId: result.providerMessageId,
        leaseOwner,
        attemptCount: job.attemptCount,
      });
      if (!reconciled) {
        console.error(
          '[EmailDispatcher] Provider accepted email but attempt could not be reconciled',
          {
            jobId: job.id,
            attemptNumber: job.attemptCount,
            reasonCode: 'EMAIL_ACCEPTED_ATTEMPT_STALE',
          },
        );
      }
    } catch {
      console.error('[EmailDispatcher] Provider accepted email but safe-state persistence failed', {
        jobId: job.id,
        deliveryLogId: job.deliveryLogId,
        emailType: job.emailType,
        providerKind: job.providerKind,
        attemptNumber: job.attemptCount,
        reasonCode: 'EMAIL_ACCEPTED_SAFE_STATE_PERSISTENCE_FAILED',
        durationMs: Date.now() - startedAt,
      });
    }

    console.error('[EmailDispatcher] Provider accepted email but finalisation failed safely', {
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      emailType: job.emailType,
      providerKind: job.providerKind,
      attemptNumber: job.attemptCount,
      reasonCode: 'EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED',
      durationMs: Date.now() - startedAt,
    });
  }
}

export async function runEmailDispatcherCycle(input: { leaseOwner?: string } = {}) {
  const leaseOwner = input.leaseOwner ?? `email-dispatcher-test-${randomUUID()}`;

  await recoverExpiredEmailDeliveryLeases();
  try {
    await reconcileMissingCampaignEmails();
  } catch {
    console.warn('[EmailDispatcher] Campaign email reconciliation failed', {
      reasonCode: 'CAMPAIGN_EMAIL_RECONCILIATION_FAILED',
    });
  }

  const jobs = await claimDueEmailDeliveryJobs({
    leaseOwner,
    batchSize: env.EMAIL_DISPATCHER_BATCH_SIZE,
    leaseSeconds: env.EMAIL_DISPATCHER_LEASE_SECONDS,
    retryDeadlineSeconds: env.EMAIL_DISPATCHER_RETRY_DEADLINE_SECONDS,
  });

  await Promise.all(jobs.map((job) => dispatchJob(job)));

  return { claimedJobCount: jobs.length };
}

export function startEmailDispatcher(): EmailDispatcherHandle {
  if (!env.EMAIL_DISPATCHER_ENABLED) {
    console.info('[EmailDispatcher] Dispatcher disabled by configuration');
    return { stop: () => undefined };
  }

  const leaseOwner = `email-dispatcher-${process.pid}-${randomUUID()}`;
  let stopped = false;
  let running = false;
  let timer: NodeJS.Timeout | undefined;

  const scheduleNextRun = () => {
    if (stopped) {
      return;
    }

    timer = setTimeout(() => {
      void runOnce();
    }, env.EMAIL_DISPATCHER_POLL_INTERVAL_MS);
    timer.unref();
  };

  const runOnce = async () => {
    if (running || stopped) {
      scheduleNextRun();
      return;
    }

    running = true;

    try {
      await runEmailDispatcherCycle({ leaseOwner });
    } catch {
      console.error('[EmailDispatcher] Dispatcher cycle failed', {
        leaseOwner,
        reasonCode: 'EMAIL_DISPATCHER_CYCLE_FAILED',
      });
    } finally {
      running = false;
      scheduleNextRun();
    }
  };

  console.info('[EmailDispatcher] Dispatcher started', {
    leaseOwner,
    pollIntervalMs: env.EMAIL_DISPATCHER_POLL_INTERVAL_MS,
    batchSize: env.EMAIL_DISPATCHER_BATCH_SIZE,
  });

  void runOnce();

  return {
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      console.info('[EmailDispatcher] Dispatcher stopped', { leaseOwner });
    },
  };
}

async function releaseSimulationJobWithoutAttempt(
  job: EmailDeliveryDispatchJob,
  leaseOwner: string,
  decision: Exclude<
    ReturnType<typeof getPhishingSimulationMessageAttemptDecision>,
    { state: 'READY' }
  >,
) {
  if (decision.state === 'RETRY_SCHEDULED') {
    return releaseClaimedSimulationEmailDelivery({
      jobId: job.id,
      deliveryLogId: job.deliveryLogId,
      leaseOwner,
      attemptCount: job.attemptCount,
      status: decision.state,
      nextAttemptAt: decision.nextAttemptAt,
      reasonCode: decision.reasonCode,
    });
  }
  return releaseClaimedSimulationEmailDelivery({
    jobId: job.id,
    deliveryLogId: job.deliveryLogId,
    leaseOwner,
    attemptCount: job.attemptCount,
    status: decision.state,
    reasonCode: decision.reasonCode,
  });
}
