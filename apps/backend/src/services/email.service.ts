import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import type {
  EmailDeliveryType,
  EmailRelatedEntityType,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type EmailPrismaClient = {
  emailDeliveryLog: Pick<PrismaClient['emailDeliveryLog'], 'create' | 'update'>;
};

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  emailType: EmailDeliveryType;

  //fallback
  relatedEntityType?: EmailRelatedEntityType;
  relatedEntityId?: string | null;

  //typed
  userId?: string | null;
  actionTokenId?: string | null;
  organisationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  invitationId?: string | null;
}

export type SendEmailOutput =
  | { ok: true; messageId?: string; deliveryLogId: string }
  | {
      ok: false;
      error: string;
      deliveryLogId: string;
    };

export async function sendEmail(
  input: SendEmailInput,
  client: EmailPrismaClient = prisma,
): Promise<SendEmailOutput> {
  const hasTypedRelationship = Boolean(
    input.userId ||
    input.actionTokenId ||
    input.organisationId ||
    input.organisationRegistrationRequestId ||
    input.invitationId,
  );

  if (!hasTypedRelationship && !input.relatedEntityType) {
    throw new Error('Email logs without a typed relation must provide relatedEntityType');
  }

  const deliveryLog = await client.emailDeliveryLog.create({
    data: {
      recipientEmail: input.to,
      emailType: input.emailType,
      fallbackRelatedEntityType: hasTypedRelationship ? null : input.relatedEntityType,
      fallbackRelatedEntityId: hasTypedRelationship ? null : (input.relatedEntityId ?? null),
      userId: input.userId ?? null,
      actionTokenId: input.actionTokenId ?? null,
      deliveryStatus: 'PENDING',
      organisationId: input.organisationId ?? null,
      organisationRegistrationRequestId: input.organisationRegistrationRequestId ?? null,
      invitationId: input.invitationId ?? null,
    },
  });

  const transportOptions = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          },
        }
      : {}),
  };

  const transporter = nodemailer.createTransport(transportOptions);

  try {
    const result = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_ADDRESS}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    await client.emailDeliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: result.messageId,
        sentAt: new Date(),
      },
    });

    return {
      ok: true,
      messageId: result.messageId,
      deliveryLogId: deliveryLog.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';

    await client.emailDeliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: new Date(),
        failureReason: message,
      },
    });

    return {
      ok: false,
      error: message,
      deliveryLogId: deliveryLog.id,
    };
  }
}
