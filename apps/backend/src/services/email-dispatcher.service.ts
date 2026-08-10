import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type { EmailDeliveryDispatchJob } from '../repositories/email-delivery.repository.js';
import {
  claimDueEmailDeliveryJobs,
  markEmailDeliveryProviderPersistenceFailed,
  recoverExpiredEmailDeliveryLeases,
  recordEmailDeliveryAccepted,
  recordEmailDeliveryTerminalFailure,
  scheduleEmailDeliveryRetry,
  verifyEmailDeliveryClaimOwnership,
} from '../repositories/email-delivery.repository.js';
import { sendViaSMTP, SmtpDeliveryError } from './smtp-mailer.js';

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

  let result: Awaited<ReturnType<typeof sendViaSMTP>> | undefined;

  try {
    result = await sendViaSMTP({
      to: job.recipientEmail,
      subject: job.subject,
      text: job.textBody,
      html: job.htmlBody ?? undefined,
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
    });

    if (!recorded) {
      console.warn(
        '[EmailDispatcher] Provider accepted email but claim was stale at finalisation',
        {
          jobId: job.id,
          deliveryLogId: job.deliveryLogId,
          emailType: job.emailType,
          providerKind: job.providerKind,
          attemptNumber: job.attemptCount,
          reasonCode: 'EMAIL_DISPATCHER_STALE_ACCEPTED_FINALISATION',
          durationMs: Date.now() - startedAt,
        },
      );
      return;
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
      await markEmailDeliveryProviderPersistenceFailed({
        jobId: job.id,
        deliveryLogId: job.deliveryLogId,
        reasonCode: 'EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED',
        leaseOwner,
      });
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
      await recoverExpiredEmailDeliveryLeases();

      const jobs = await claimDueEmailDeliveryJobs({
        leaseOwner,
        batchSize: env.EMAIL_DISPATCHER_BATCH_SIZE,
        leaseSeconds: env.EMAIL_DISPATCHER_LEASE_SECONDS,
        retryDeadlineSeconds: env.EMAIL_DISPATCHER_RETRY_DEADLINE_SECONDS,
      });

      await Promise.all(jobs.map((job) => dispatchJob(job)));
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
