import type {
  EmailDeliveryType,
  EmailRelatedEntityType,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { renderEmail } from './email-template-renderer.js';
import { sendViaSMTP } from './smtp-mailer.js';

const MAX_EMAIL_FAILURE_REASON_LENGTH = 500;

const toSafeEmailFailureReason = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, MAX_EMAIL_FAILURE_REASON_LENGTH);
  }

  return fallback;
};

export type EmailPersistenceFailureStage =
  | 'DELIVERY_LOG_SENT'
  | 'INVITATION_SENT'
  | 'DELIVERY_LOG_FAILED'
  | 'INVITATION_FAILED_TO_SEND';

export type EmailPersistenceFailureCode =
  | 'DELIVERY_LOG_SENT_WRITE_FAILED'
  | 'INVITATION_SENT_WRITE_FAILED'
  | 'DELIVERY_LOG_FAILED_WRITE_FAILED'
  | 'INVITATION_FAILED_TO_SEND_WRITE_FAILED';

export type EmailPersistenceFailure = {
  stage: EmailPersistenceFailureStage;
  code: EmailPersistenceFailureCode;
};

const deliveryLogSentFailure: EmailPersistenceFailure = {
  stage: 'DELIVERY_LOG_SENT',
  code: 'DELIVERY_LOG_SENT_WRITE_FAILED',
};

const invitationSentFailure: EmailPersistenceFailure = {
  stage: 'INVITATION_SENT',
  code: 'INVITATION_SENT_WRITE_FAILED',
};

const deliveryLogFailedFailure: EmailPersistenceFailure = {
  stage: 'DELIVERY_LOG_FAILED',
  code: 'DELIVERY_LOG_FAILED_WRITE_FAILED',
};

const invitationFailedToSendFailure: EmailPersistenceFailure = {
  stage: 'INVITATION_FAILED_TO_SEND',
  code: 'INVITATION_FAILED_TO_SEND_WRITE_FAILED',
};

const formatPersistenceFailureReason = (failures: EmailPersistenceFailure[]): string =>
  failures
    .map((failure) => failure.code)
    .join('; ')
    .slice(0, MAX_EMAIL_FAILURE_REASON_LENGTH);

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

type EmailPrismaClient = {
  emailDeliveryLog: Pick<PrismaClient['emailDeliveryLog'], 'create' | 'update'>;
  invitation: Pick<PrismaClient['invitation'], 'update'>;
};
export type SendEmailRelatedEntity = {
  fallbackType?: EmailRelatedEntityType;
  fallbackId?: string | null;
  userId?: string | null;
  actionTokenId?: string | null;
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
      providerMessageId?: string;
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
      providerMessageId?: string;
      persistenceFailures: EmailPersistenceFailure[];
      persistenceFailureReason: string;
    };

export const shouldRevokeTokenForEmailOutcome = (outcome: EmailSendOutcome): boolean =>
  outcome.status === 'NOT_ACCEPTED';

function isInvitationEmail(emailType: EmailDeliveryType) {
  return (
    emailType === 'INITIAL_ORGANISATION_ADMIN_SETUP' ||
    emailType === 'ORGANISATION_TRAINEE_INVITE' ||
    emailType === 'ORGANISATION_ADMIN_PROMOTION_INVITE'
  );
}

async function markInvitationSentIfRelevant(input: SendEmailInput, client: EmailPrismaClient) {
  if (!input.relatedEntity.invitationId || !isInvitationEmail(input.emailType)) {
    return;
  }
  await client.invitation.update({
    data: { status: 'SENT' },
    where: { id: input.relatedEntity.invitationId },
  });
}
async function markInvitationFailedIfRelevant(input: SendEmailInput, client: EmailPrismaClient) {
  if (!input.relatedEntity.invitationId || !isInvitationEmail(input.emailType)) {
    return;
  }
  await client.invitation.update({
    data: { status: 'FAILED_TO_SEND' },
    where: { id: input.relatedEntity.invitationId },
  });
}

async function markDeliveryLogSent(input: {
  client: EmailPrismaClient;
  deliveryLogId: string;
  providerMessageId?: string;
}) {
  await input.client.emailDeliveryLog.update({
    data: {
      deliveryStatus: 'SENT',
      providerMessageId: input.providerMessageId,
      sentAt: new Date(),
    },
    where: { id: input.deliveryLogId },
  });
}

async function markDeliveryLogFailed(input: {
  client: EmailPrismaClient;
  deliveryLogId: string;
  failureReason: string;
}) {
  await input.client.emailDeliveryLog.update({
    data: {
      deliveryStatus: 'FAILED',
      failedAt: new Date(),
      failureReason: input.failureReason,
    },
    where: { id: input.deliveryLogId },
  });
}

export async function sendEmail(
  input: SendEmailInput,
  client: EmailPrismaClient = prisma,
): Promise<EmailSendOutcome> {
  let deliveryLogId: string | undefined;
  let renderedEmail: ReturnType<typeof renderEmail> | undefined;

  try {
    renderedEmail = renderEmail(input.emailType, input.templateData);
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

    const deliveryLog = await client.emailDeliveryLog.create({
      data: {
        recipientEmail: input.recipientEmail,
        emailType: input.emailType,
        fallbackRelatedEntityType: hasTypedRelation ? null : input.relatedEntity.fallbackType,
        fallbackRelatedEntityId: hasTypedRelation ? null : (input.relatedEntity.fallbackId ?? null),
        userId: input.relatedEntity.userId ?? null,
        actionTokenId: input.relatedEntity.actionTokenId ?? null,
        organisationId: input.relatedEntity.organisationId ?? null,
        organisationRegistrationRequestId:
          input.relatedEntity.organisationRegistrationRequestId ?? null,
        invitationId: input.relatedEntity.invitationId ?? null,
        deliveryStatus: 'PENDING',
      },
    });
    deliveryLogId = deliveryLog.id;
  } catch (error) {
    return {
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId,
      failureReason: toSafeEmailFailureReason(
        error,
        'Email could not be prepared before provider acceptance.',
      ),
    };
  }

  if (!deliveryLogId || !renderedEmail) {
    return {
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId,
      failureReason: 'Email could not be prepared before provider acceptance.',
    };
  }

  const pendingDeliveryLogId = deliveryLogId;
  const preparedEmail = renderedEmail;
  let providerMessageId: string | undefined;

  try {
    const providerResult = await sendViaSMTP({ to: input.recipientEmail, ...preparedEmail });
    providerMessageId = providerResult.providerMessageId;
  } catch (error) {
    const failureReason = toSafeEmailFailureReason(
      error,
      'SMTP provider did not accept the email.',
    );

    const persistenceFailures = [
      ...(await attemptEmailPersistence(
        () =>
          markDeliveryLogFailed({
            client,
            deliveryLogId: pendingDeliveryLogId,
            failureReason,
          }),
        deliveryLogFailedFailure,
      )),
      ...(await attemptEmailPersistence(
        () => markInvitationFailedIfRelevant(input, client),
        invitationFailedToSendFailure,
      )),
    ];

    return {
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId: pendingDeliveryLogId,
      failureReason,
      persistenceFailures: persistenceFailures.length > 0 ? persistenceFailures : undefined,
    };
  }

  const persistenceFailures = [
    ...(await attemptEmailPersistence(
      () =>
        markDeliveryLogSent({
          client,
          deliveryLogId: pendingDeliveryLogId,
          providerMessageId,
        }),
      deliveryLogSentFailure,
    )),
    ...(await attemptEmailPersistence(
      () => markInvitationSentIfRelevant(input, client),
      invitationSentFailure,
    )),
  ];

  if (persistenceFailures.length === 0) {
    return {
      status: 'ACCEPTED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: pendingDeliveryLogId,
      providerMessageId,
    };
  }

  return {
    status: 'ACCEPTED_PERSISTENCE_FAILED',
    acceptedByProvider: true,
    queued: true,
    deliveryLogId: pendingDeliveryLogId,
    providerMessageId,
    persistenceFailures,
    persistenceFailureReason: formatPersistenceFailureReason(persistenceFailures),
  };
}
