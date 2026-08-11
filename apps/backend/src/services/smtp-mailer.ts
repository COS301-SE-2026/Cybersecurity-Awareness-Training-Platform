import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
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

type SmtpSubmissionPhase = 'BEFORE_SUBMISSION' | 'SUBMISSION_STARTED';

type SmtpPhaseTracker = {
  phase: SmtpSubmissionPhase;
};

type SmtpLoggerRecord = {
  tnx?: string;
  command?: string;
  action?: string;
};

type SmtpPhaseLogger = Record<
  'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  (record: SmtpLoggerRecord, message?: string) => void
>;

const DATA_COMMANDS = new Set(['DATA', 'SMTP-DATA']);
const DEFINITE_PRE_SUBMISSION_COMMANDS = new Set([
  'EDNS',
  'EHLO',
  'HELO',
  'STARTTLS',
  'AUTH',
  'MAIL FROM',
  'MAIL',
  'RCPT TO',
  'RCPT',
]);
const SUBMISSION_STARTED_COMMANDS = new Set([...DATA_COMMANDS]);
const DNS_FAILURE_CODES = new Set(['EDNS', 'EAI_AGAIN', 'ENOTFOUND']);
const DEFINITE_PRE_SUBMISSION_FAILURE_CODES = new Set(['ECONNREFUSED', 'ETLS']);
const AMBIGUOUS_TRANSPORT_FAILURE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNECTION',
  'ESOCKET',
]);

function normaliseSmtpToken(value?: string) {
  return value?.trim().toUpperCase();
}

function smtpLogIndicatesSubmissionStarted(record: SmtpLoggerRecord, message?: string) {
  const command = normaliseSmtpToken(record.command ?? record.action);
  if (command && SUBMISSION_STARTED_COMMANDS.has(command)) {
    return true;
  }

  const text = normaliseSmtpToken(message);
  return Boolean(
    text &&
    [...SUBMISSION_STARTED_COMMANDS].some(
      (submissionCommand) =>
        text === submissionCommand ||
        text.startsWith(`${submissionCommand} `) ||
        text.includes(` C: ${submissionCommand}`) ||
        text.includes(`CLIENT ${submissionCommand}`),
    ),
  );
}

function createSmtpPhaseLogger(tracker: SmtpPhaseTracker): SmtpPhaseLogger {
  const observe = (record: SmtpLoggerRecord, message?: string) => {
    if (smtpLogIndicatesSubmissionStarted(record, message)) {
      tracker.phase = 'SUBMISSION_STARTED';
    }
  };

  return {
    trace: observe,
    debug: observe,
    info: observe,
    warn: observe,
    error: observe,
    fatal: observe,
  };
}

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
  const phaseTracker: SmtpPhaseTracker = { phase: 'BEFORE_SUBMISSION' };
  const transportOptions: SMTPTransport.Options = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    logger: createSmtpPhaseLogger(phaseTracker) as SMTPTransport.Options['logger'],

    dnsTimeout: 5_000,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,

    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  };
  const transporter = nodemailer.createTransport(transportOptions);

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
    const classified = classifySmtpFailure(smtpError, phaseTracker.phase);

    console.error('[SMTP] Message Failed', {
      durationMs: Date.now() - startedAt,
      errorName: smtpError?.name,
      code: smtpError?.code,
      command: smtpError?.command,
      responseCode: smtpError?.responseCode,
      submissionPhase: phaseTracker.phase,
      reasonCode: classified.reasonCode,
    });

    throw new SmtpDeliveryError(
      'SMTP delivery failed',
      classified.failureKind,
      classified.reasonCode,
    );
  }
}

export function classifySmtpFailure(
  error?: SmtpFailureInput,
  submissionPhase: SmtpSubmissionPhase = 'SUBMISSION_STARTED',
): {
  failureKind: SmtpFailureKind;
  reasonCode: string;
} {
  const command = normaliseSmtpToken(error?.command);
  const code = normaliseSmtpToken(error?.code);

  if (typeof error?.responseCode === 'number') {
    if (error.responseCode >= 500) {
      return { failureKind: 'NON_RETRYABLE', reasonCode: 'SMTP_PERMANENT_FAILURE' };
    }

    if (error.responseCode >= 400) {
      return { failureKind: 'RETRYABLE', reasonCode: 'SMTP_TEMPORARY_FAILURE' };
    }
  }

  if (code === 'EAUTH') {
    return { failureKind: 'NON_RETRYABLE', reasonCode: 'SMTP_AUTH_FAILED' };
  }

  if (code && DNS_FAILURE_CODES.has(code)) {
    return { failureKind: 'RETRYABLE', reasonCode: 'SMTP_DNS_TEMPORARY_FAILURE' };
  }

  if (code && DEFINITE_PRE_SUBMISSION_FAILURE_CODES.has(code)) {
    return { failureKind: 'RETRYABLE', reasonCode: 'SMTP_PRE_SUBMISSION_TRANSPORT_FAILURE' };
  }

  if (code && AMBIGUOUS_TRANSPORT_FAILURE_CODES.has(code)) {
    if (command && DATA_COMMANDS.has(command)) {
      return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_AMBIGUOUS_AFTER_DATA' };
    }

    if (
      submissionPhase === 'BEFORE_SUBMISSION' ||
      (command && DEFINITE_PRE_SUBMISSION_COMMANDS.has(command))
    ) {
      return { failureKind: 'RETRYABLE', reasonCode: 'SMTP_PRE_SUBMISSION_TRANSPORT_FAILURE' };
    }

    return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_AMBIGUOUS_TRANSPORT_FAILURE' };
  }

  if (command && DATA_COMMANDS.has(command)) {
    return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_AMBIGUOUS_TRANSPORT_FAILURE' };
  }

  return { failureKind: 'AMBIGUOUS', reasonCode: 'SMTP_UNKNOWN_FAILURE' };
}
