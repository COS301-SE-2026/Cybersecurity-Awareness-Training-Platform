import { describe, expect, it } from 'vitest';
import { requestAuthEmailSend } from '../../src/services/auth-email-hook.service.js';

describe('auth-email hook service', () => {
  it('returns the not implemented result', async () => {
    await expect(
      requestAuthEmailSend({
        emailType: 'PASSWORD_RESET',
        recipientEmail: 'johannel@example.com',
      }),
    ).resolves.toEqual({ queued: false, reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED' });
  });
}); //describe
