import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export type SmtpMailInput = { to: string; subject: string; text: string; html?: string };

export type SmtpAcceptedResult = {
  acceptedByProvider: true;
  providerMessageId: string;
};

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
    const smtpError =
      error instanceof Error
        ? (error as Error & { code?: string; command?: string; responseCode?: number })
        : undefined;
    console.error('[SMTP] Message Failed', {
      durationMs: Date.now() - startedAt,
      errorName: smtpError?.name,
      code: smtpError?.code,
      command: smtpError?.command,
      responseCode: smtpError?.responseCode,
      message: smtpError?.message,
    });
    throw error;
  }
}
