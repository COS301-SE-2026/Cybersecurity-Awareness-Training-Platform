import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export type SmtpMailInput = { to: string; subject: string; text: string; html?: string };

export type SmtpAcceptedResult = {
  acceptedByProvider: true;
  providerMessageId?: string;
  messageId?: string;
};

export async function sendViaSMTP(input: SmtpMailInput): Promise<SmtpAcceptedResult> {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  });

  const result = await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_ADDRESS}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return {
    acceptedByProvider: true,
    providerMessageId: result.messageId,
    messageId: result.messageId,
  };
}
