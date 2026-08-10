import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export type SmtpMailInput = { to: string; subject: string; text: string; html?: string };

export type SmtpAcceptedResult = {
  acceptedByProvider: true;
  providerMessageId: string;
};

export type SmtpFailureKind = 'RETRYABLE' | 'NON_RETRYABLE' | 'AMBIGUOUS';

type SmtpFailureInput = {
  code?: string;
  command?: string;
  responseCode?: number;
};

export class SmtpDeliveryError extends Error {
  constructor(
    message: string,
    readonly failureKind: SmtpFailureKind,
    readonly reasonCode: string,
  ) {
    super(message);
    this.name = 'SmtpDeliveryError';
  }
}

export async function sendViaSMTP(input: SmtpMailInput): Promise<SmtpAcceptedResult> {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,

    dnsTimeout: 5_000,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,

    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  });

  const startedAt = Date.now();

  try {
    const result = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_ADDRESS}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    console.info('[SMTP] Message Accepted', {
      durationMs: Date.now() - startedAt,
      messageId: result.messageId,
      acceptedCount: Array.isArray(result.accepted) ? result.accepted.length : 0,
      rejectedCount: Array.isArray(result.rejected) ? result.rejected.length : 0,
    });

    return {
      acceptedByProvider: true,
      providerMessageId: result.messageId,
    };
  } catch (error: unknown) {
    const smtpError = error instanceof Error ? (error as Error & SmtpFailureInput) : undefined;
    const classified = classifySmtpFailure(smtpError);

    console.error('[SMTP] Message Failed', {
      durationMs: Date.now() - startedAt,
      errorName: smtpError?.name,
      code: smtpError?.code,
      command: smtpError?.command,
      responseCode: smtpError?.responseCode,
      reasonCode: classified.reasonCode,
    });

    throw new SmtpDeliveryError(
      'SMTP delivery failed',
      classified.failureKind,
      classified.reasonCode,
    );
  }
}

export function classifySmtpFailure(error?: SmtpFailureInput): {
  failureKind: SmtpFailureKind;
  reasonCode: string;
} {
  const command = error?.command?.toUpperCase();

  if (typeof error?.responseCode === 'number') {
    if (error.responseCode >= 500) {
      return { failureKind: 'NON_RETRYABLE', reasonCode: 'SMTP_PERMANENT_FAILURE' };
    }

    if (error.responseCode >= 400) {
      return { failureKind: 'RETRYABLE', reasonCode: 'SMTP_TEMPORARY_FAILURE' };
    }
  }

  if (error?.code === 'EAUTH') {
    return { failureKind: 'NON_RETRYABLE', reasonCode: 'SMTP_AUTH_FAILED' };
  }

  const transportFailureCodes = new Set([
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNECTION',
    'ECONNREFUSED',
    'ESOCKET',
    'EAI_AGAIN',
    'ENOTFOUND',
  ]);

  if (error?.code && transportFailureCodes.has(error.code)) {
    if (command === 'DATA' || command === 'SMTP-DATA') {
      return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_AMBIGUOUS_AFTER_DATA' };
    }

    return { failureKind: 'RETRYABLE', reasonCode: 'SMTP_PRE_SUBMISSION_TRANSPORT_FAILURE' };
  }

  if (command === 'DATA' || command === 'SMTP-DATA') {
    return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_AMBIGUOUS_TRANSPORT_FAILURE' };
  }

  return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_UNKNOWN_FAILURE' };
}
