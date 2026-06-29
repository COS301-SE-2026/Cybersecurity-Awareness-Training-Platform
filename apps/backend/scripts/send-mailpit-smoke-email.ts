import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../src/lib/prisma.js';
import { sendEmail } from '../src/services/email.service.js';

const recipientEmail = process.env.MAILPIT_SMOKE_TO ?? 'developer@example.com';
const rawToken = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(rawToken).digest('hex');

const actionToken = await prisma.actionToken.create({
  data: {
    tokenHash,
    purpose: 'EMAIL_VERIFICATION',
    targetEmail: recipientEmail,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30),
  },
});

const result = await sendEmail({
  emailType: 'EMAIL_VERIFICATION',
  recipientEmail,
  relatedEntity: {
    actionTokenId: actionToken.id,
    fallbackType: 'ACTIONTOKEN',
    fallbackId: actionToken.id,
  },
  templateData: {
    firstName: 'Smoketest',
    actionToken: rawToken,
    actionTokenExpiresAt: actionToken.expiresAt,
  },
});

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      recipientEmail,
      actionTokenId: actionToken.id,
      deliveryLogId: result.deliveryLogId,
      mailpitUi: 'http://localhost:8025',
      ...(result.ok ? { messageId: result.messageId } : { error: result.error }),
    },
    null,
    2,
  ),
);

console.log('Open Mailpit to inspect the email: http://localhost:8025 (should work locally).');

await prisma.$disconnect();

if (!result.ok) {
  process.exitCode = 1;
}
