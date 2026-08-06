import type { EmailDeliveryType, EmailRelatedEntityType } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import type { EmailDeliveryRepositoryClient } from '../repositories/email-delivery.repository.js';
import {
  enqueueEmailDelivery,
  markEmailDeliveryLogAccepted,
  markEmailDeliveryLogFailed,
  markEmailInvitationFailedIfRelevant,
  markEmailInvitationSentIfRelevant,
} from '../repositories/email-delivery.repository.js';
import { renderEmail } from './email-template-renderer.js';
import { sendViaSMTP } from './smtp-mailer.js';

const MAX_EMAIL_FAILURE_REASON_LENGTH = 500;

export type EmailPersistenceFailure =
  | {
      stage: 'DELIVERY_LOG_SENT';
      code: 'DELIVERY_LOG_SENT_WRITE_FAILED';
    }
  | {
      stage: 'INVITATION_SENT';
      code: 'INVITATION_SENT_WRITE_FAILED';
    }
  | {
      stage: 'DELIVERY_LOG_FAILED';
      code: 'DELIVERY_LOG_FAILED_WRITE_FAILED';
    }
  | {
      stage: 'INVITATION_FAILED_TO_SEND';
      code: 'INVITATION_FAILED_TO_SEND_WRITE_FAILED';
    };

export type NonEmptyArray<T> = [T, ...T[]];

const deliveryLogSentFailure = {
  stage: 'DELIVERY_LOG_SENT',
  code: 'DELIVERY_LOG_SENT_WRITE_FAILED',
} satisfies EmailPersistenceFailure;

const invitationSentFailure = {
  stage: 'INVITATION_SENT',
  code: 'INVITATION_SENT_WRITE_FAILED',
} satisfies EmailPersistenceFailure;

const deliveryLogFailedFailure = {
  stage: 'DELIVERY_LOG_FAILED',
  code: 'DELIVERY_LOG_FAILED_WRITE_FAILED',
} satisfies EmailPersistenceFailure;

const invitationFailedToSendFailure = {
  stage: 'INVITATION_FAILED_TO_SEND',
  code: 'INVITATION_FAILED_TO_SEND_WRITE_FAILED',
} satisfies EmailPersistenceFailure;

const formatPersistenceFailureReason = (failures: NonEmptyArray<EmailPersistenceFailure>): string =>
  failures
    .map((failure) => failure.code)
    .join('; ')
    .slice(0, MAX_EMAIL_FAILURE_REASON_LENGTH);

const toNonEmptyPersistenceFailures = (
  failures: EmailPersistenceFailure[],
): NonEmptyArray<EmailPersistenceFailure> | null =>
  failures.length === 0 ? null : [failures[0], ...failures.slice(1)];

async function attemptEmailPersistence(
  action: () => Promise<void>,
  failure: EmailPersistenceFailure,
): Promise<EmailPersistenceFailure[]> {
  try {
    await action();
    return [];
  } catch {
    return [failure];
  }
}

export type SendEmailRelatedEntity = {
  fallbackType?: EmailRelatedEntityType;
  fallbackId?: string | null;
  userId?: string | null;
  actionTokenId?: string | null;
  invitationStateVersion?: string | null;
  organisationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  invitationId?: string | null;
};

export interface SendEmailInput {
  emailType: EmailDeliveryType;
  recipientEmail: string;
  relatedEntity: SendEmailRelatedEntity;
  templateData?: unknown;
}

export type EmailSendOutcome =
  | {
      status: 'ACCEPTED';
      acceptedByProvider: true;
      queued: true;
      deliveryLogId: string;
      providerMessageId: string;
    }
  | {
      status: 'NOT_ACCEPTED';
      acceptedByProvider: false;
      queued: false;
      deliveryLogId?: string;
      failureReason: string;
      persistenceFailures?: EmailPersistenceFailure[];
    }
  | {
      status: 'ACCEPTED_PERSISTENCE_FAILED';
      acceptedByProvider: true;
      queued: true;
      deliveryLogId: string;
      providerMessageId: string;
      persistenceFailures: NonEmptyArray<EmailPersistenceFailure>;
      persistenceFailureReason: string;
    };

export const shouldRevokeTokenForEmailOutcome = (outcome: EmailSendOutcome): boolean =>
  outcome.status === 'NOT_ACCEPTED';

function validateRelatedEntity(input: SendEmailInput) {
  const hasTypedRelation = Boolean(
    input.relatedEntity.userId ||
    input.relatedEntity.actionTokenId ||
    input.relatedEntity.organisationId ||
    input.relatedEntity.organisationRegistrationRequestId ||
    input.relatedEntity.invitationId,
  );

  if (!hasTypedRelation && !input.relatedEntity.fallbackType) {
    throw new Error('Emails without a typed relation must provide a fallbackType');
  }
}

export async function sendEmail(
  input: SendEmailInput,
  client?: EmailDeliveryRepositoryClient,
): Promise<EmailSendOutcome> {
  let renderedEmail: ReturnType<typeof renderEmail>;

  try {
    renderedEmail = renderEmail(input.emailType, input.templateData);
    validateRelatedEntity(input);
  } catch {
    return {
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      failureReason: 'TEMPLATE_RENDER_FAILED',
    };
  }

  let pendingDelivery: { deliveryLogId: string; jobId: string };
  try {
    pendingDelivery = await enqueueEmailDelivery(
      {
        emailType: input.emailType,
        recipientEmail: input.recipientEmail,
        relatedEntity: input.relatedEntity,
        subject: renderedEmail.subject,
        text: renderedEmail.text,
        html: renderedEmail.html,
        maxAttempts: env.EMAIL_DISPATCHER_MAX_ATTEMPTS,
      },
      client,
    );
  } catch {
    return {
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      failureReason: 'DELIVERY_LOG_CREATE_FAILED',
    };
  }

  let providerMessageId: string;

  try {
    const providerResult = await sendViaSMTP({
      to: input.recipientEmail,
      subject: renderedEmail.subject,
      text: renderedEmail.text,
      html: renderedEmail.html,
    });
    providerMessageId = providerResult.providerMessageId;
  } catch {
    const persistenceFailures = await attemptEmailPersistence(
      () =>
        markEmailDeliveryLogFailed(
          {
            deliveryLogId: pendingDelivery.deliveryLogId,
            jobId: pendingDelivery.jobId,
            failureReason: 'SMTP_NOT_ACCEPTED',
          },
          client,
        ),
      deliveryLogFailedFailure,
    );
    const invitationPersistenceFailures = await attemptEmailPersistence(async () => {
      await markEmailInvitationFailedIfRelevant(
        {
          emailType: input.emailType,
          relatedEntity: input.relatedEntity,
        },
        client,
      );
    }, invitationFailedToSendFailure);

    return {
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId: pendingDelivery.deliveryLogId,
      failureReason: 'SMTP_NOT_ACCEPTED',
      persistenceFailures:
        persistenceFailures.length + invitationPersistenceFailures.length > 0
          ? [...persistenceFailures, ...invitationPersistenceFailures]
          : undefined,
    };
  }

  const persistenceFailures = [
    ...(await attemptEmailPersistence(
      () =>
        markEmailDeliveryLogAccepted(
          {
            deliveryLogId: pendingDelivery.deliveryLogId,
            jobId: pendingDelivery.jobId,
            providerMessageId,
          },
          client,
        ),
      deliveryLogSentFailure,
    )),
    ...(await attemptEmailPersistence(async () => {
      await markEmailInvitationSentIfRelevant(
        {
          emailType: input.emailType,
          relatedEntity: input.relatedEntity,
        },
        client,
      );
    }, invitationSentFailure)),
  ];

  const nonEmptyPersistenceFailures = toNonEmptyPersistenceFailures(persistenceFailures);

  if (!nonEmptyPersistenceFailures) {
    return {
      status: 'ACCEPTED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: pendingDelivery.deliveryLogId,
      providerMessageId,
    };
  }

  return {
    status: 'ACCEPTED_PERSISTENCE_FAILED',
    acceptedByProvider: true,
    queued: true,
    deliveryLogId: pendingDelivery.deliveryLogId,
    providerMessageId,
    persistenceFailures: nonEmptyPersistenceFailures,
    persistenceFailureReason: formatPersistenceFailureReason(nonEmptyPersistenceFailures),
  };
}
