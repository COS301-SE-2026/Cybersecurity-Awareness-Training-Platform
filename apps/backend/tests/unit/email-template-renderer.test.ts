import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/config/env.js', () => ({ env: { FRONTEND_ORIGIN: 'http://frontend.com' } }));
const rawToken = 'rawtokenqwertyuiopasdfghjklzxcvbnm';
const tokenHash = 'hashedtokenvaluethatshouldntberenderedatall';
const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
const { renderEmail } = await import('../../src/services/email-template-renderer.js');

describe('renderEmail', () => {
  it('renders a token action URL and expiry and doesnt render token hashes', async () => {
    const rendered = renderEmail('EMAIL_VERIFICATION', {
      firstName: 'Johan',
      actionToken: rawToken,
      actionTokenExpiresAt: expiresAt,
    });

    expect(rendered.subject).toBe('Verify your email address');
    expect(rendered.text).toContain('Verify your email'); //heading
    expect(rendered.text).toContain(
      `Verify email: http://frontend.com/verify-email?token=${rawToken}`,
    );
    expect(rendered.text).toContain('This link expires in');
    expect(rendered.text).not.toContain(tokenHash);

    expect(rendered.subject).toBe('Verify your email address');
    expect(rendered.html).toContain(`<h1>Verify your email</h1>`);
    expect(rendered.html).toContain(`href="http://frontend.com/verify-email?token=${rawToken}"`);
    expect(rendered.html).toContain('This link expires in');
    expect(rendered.html).not.toContain(tokenHash);
  });

  it('rejects if required template variables are missing', async () => {
    expect(() => {
      renderEmail('EMAIL_VERIFICATION', { firstName: 'Johan', actionToken: rawToken });
    }).toThrow();
  });

  it('uses a normal greeting when first name in invite which is optional is missing', async () => {
    const email = renderEmail('ORGANISATION_TRAINEE_INVITE', {
      organisationName: 'Test Org',
      actionToken: rawToken,
      actionTokenExpiresAt: expiresAt,
    });
    expect(email.text).toContain('Hi,');
    expect(email.text).not.toContain('Hi undefined');
  });

  it('requires a first name for existing user role upgrades', async () => {
    expect(() =>
      renderEmail('PLATFORM_ADMIN_UPGRADE_CONFIRMATION', {
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      }),
    ).toThrow();
  });

  it.each([
    [
      'EMAIL_VERIFICATION' as const,
      '/verify-email',
      {
        firstName: 'Johan',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'PASSWORD_RESET' as const,
      '/reset-password',
      {
        firstName: 'Johan',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'EMAIL_CHANGE_CONFIRMATION' as const,
      '/confirm-email-change',
      {
        firstName: 'Johan',
        oldEmail: 'old.johan@example.com',
        newEmail: 'johan@example.com',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'INITIAL_ORGANISATION_ADMIN_SETUP' as const,
      '/register',
      {
        firstName: 'Johan',
        organisationName: 'Test Org',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'ORGANISATION_TRAINEE_INVITE' as const,
      '/register',
      {
        firstName: 'Johan',
        organisationName: 'Test Org',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'ORGANISATION_ADMIN_PROMOTION_INVITE' as const,
      '/accept-invite',
      {
        firstName: 'Johan',
        organisationName: 'Test Org',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'PLATFORM_ADMIN_INVITE' as const,
      '/register',
      {
        firstName: 'Johan',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'PLATFORM_ADMIN_UPGRADE_CONFIRMATION' as const,
      '/accept-invite',
      {
        firstName: 'Johan',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
  ])('renders %s witht eh correct action path', async (emailType, path, templateData) => {
    const email = renderEmail(emailType, templateData);
    expect(email.text).toContain(`http://frontend.com${path}?token=${rawToken}`);
    expect(email.html).toContain(`http://frontend.com${path}?token=${rawToken}`);
  });

  it('escapes display vaues in HTML', async () => {
    const email = renderEmail('ORGANISATION_REQUEST_RECEIVED', {
      organisationName: '<Johan & Sons>',
    });
    expect(email.html).toContain('&lt;Johan &amp; Sons&gt;');
  });
}); //desribe
