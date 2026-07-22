import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/config/env.js', () => ({ env: { FRONTEND_ORIGIN: 'http://frontend.com' } }));
const rawToken = 'rawtokenqwertyuiopasdfghjklzxcvbnm';
const tokenHash = 'hashedtokenvaluethatshouldntberenderedatall';
const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
const { renderEmail } = await import('../../src/services/email-template-renderer.js');
const {
  BrandedEmailInputError,
  buildSupportMailtoHref,
  renderBrandedEmail,
  renderBrandedEmailOrFallback,
} = await import('../../src/services/email-rendering-helper.js');

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function expectNoBrowserRuntimeEmailMarkup(html: string): void {
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<form');
  expect(html).not.toContain('flowbite');
  expect(html).not.toContain('data-modal');
  expect(html).not.toMatch(/class="[^"]*(bg-|text-|flex|rounded|shadow|hover:)/);
}

function renderInitialAdminSetupEmail() {
  return renderEmail('INITIAL_ORGANISATION_ADMIN_SETUP', {
    firstName: 'Johan',
    organisationName: 'Test Org',
    actionToken: rawToken,
    actionTokenExpiresAt: expiresAt,
  });
}

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
      `/setup/token/${rawToken}`,
      {
        firstName: 'Johan',
        organisationName: 'Test Org',
        actionToken: rawToken,
        actionTokenExpiresAt: expiresAt,
      },
    ],
    [
      'ORGANISATION_TRAINEE_INVITE' as const,
      `/setup/token/${rawToken}`,
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
      `/setup/token/${rawToken}`,
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
    if (path.startsWith('/setup/token')) {
      expect(email.text).toContain(`http://frontend.com${path}`);
      expect(email.html).toContain(`http://frontend.com${path}`);
    } else {
      expect(email.text).toContain(`http://frontend.com${path}?token=${rawToken}`);
      expect(email.html).toContain(`http://frontend.com${path}?token=${rawToken}`);
    }
  });

  it('escapes display vaues in HTML', async () => {
    const email = renderEmail('ORGANISATION_REQUEST_RECEIVED', {
      organisationName: '<Johan & Sons>',
    });
    expect(email.html).toContain('&lt;Johan &amp; Sons&gt;');
  });

  it('renders a representative branded initial admin setup email', () => {
    const email = renderInitialAdminSetupEmail();

    expect(email.subject).toBe('Your organisation has been approved');
    expect(email.html).toContain('#0E0020');
    expect(email.html).toContain('#3100E4');
    expect(email.html).toContain('Insightful Phish');
    expect(email.html).toContain('Organisation approved');
    expect(email.html).toContain('Set up administrator account');
    expect(email.html).toContain('href=');
    expect(email.html).toContain('You can reach support by emailing');
    expect(email.html).toContain('support@insightfulphish.co.za');
    expect(email.text).toContain('Set up administrator account');
    expect(email.text).toContain('support@insightfulphish.co.za');
    expectNoBrowserRuntimeEmailMarkup(email.html);
  });

  it('keeps the rendered email contract compatible with SMTP input', () => {
    const email = renderInitialAdminSetupEmail();

    expect(email).toEqual({
      subject: expect.any(String),
      text: expect.any(String),
      html: expect.any(String),
    });
  });
}); //desribe

describe('branded email rendering helpers', () => {
  const brandedInput = {
    subject: 'Preview subject',
    previewText: 'Preview <text>',
    title: 'Welcome <Owner>',
    greeting: 'Hi <Johan>,',
    sections: ['Clicking this <img src=x onerror=alert(1)> should be harmless.'],
    cta: {
      label: 'Open "setup"',
      url: 'https://example.com/setup?next=" onclick="alert(1)&token=abc123',
    },
    expiryText: 'This link expires in <2 hours>.',
    support: {
      subject: 'Help & setup',
      body: 'Line one\nLine two & three',
    },
    supportEmailAddress: 'helpdesk@example.org',
  } as const;
  const fallback = {
    subject: 'Fallback subject',
    text: 'Fallback text',
    html: '<h1>Fallback</h1>',
  };

  it('escapes text nodes and attribute values in branded HTML', () => {
    const email = renderBrandedEmail(brandedInput);

    expect(email.html).toContain('Preview &lt;text&gt;');
    expect(email.html).toContain('Welcome &lt;Owner&gt;');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).toContain('Open &quot;setup&quot;');
    expect(email.html).toContain(
      'href="https://example.com/setup?next=&quot; onclick=&quot;alert(1)&amp;token=abc123"',
    );
    expect(email.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(email.html).not.toContain('onclick="alert(1)"');
    expect(email.html).not.toContain('" onclick="alert(1)"');
  });

  it('encodes support mailto context and keeps plain text readable', () => {
    const email = renderBrandedEmail(brandedInput);
    const mailtoHref = buildSupportMailtoHref('helpdesk@example.org', brandedInput.support);

    expect(mailtoHref).toContain('mailto:helpdesk@example.org');
    expect(mailtoHref).toContain('subject=Help+%26+setup');
    expect(mailtoHref).toContain('body=Line+one%0ALine+two+%26+three');
    expect(email.html).toContain('mailto:helpdesk@example.org');
    expect(email.html).toContain('subject=Help+%26+setup');
    expect(email.text).toContain('Open "setup": https://example.com/setup');
    expect(email.text).toContain('You can reach support by emailing helpdesk@example.org.');
  });

  it('does not emit browser runtime dependencies or Tailwind utility classes', () => {
    const email = renderBrandedEmail(brandedInput);

    expectNoBrowserRuntimeEmailMarkup(email.html);
  });

  it('does not duplicate raw tokens outside intended action URLs', () => {
    const token = 'actiontokenqwertyuiopasdfghjkl123456';
    const email = renderBrandedEmail({
      ...brandedInput,
      cta: {
        label: 'Complete setup',
        url: `https://example.com/setup/token/${token}`,
      },
      support: {
        subject: 'Setup help',
        body: 'I need help with setup.',
      },
    });

    expect(countOccurrences(email.html, token)).toBe(1);
    expect(countOccurrences(email.text, token)).toBe(1);
  });

  it('falls back to minimal output when branded assembly fails unexpectedly', () => {
    const email = renderBrandedEmailOrFallback(brandedInput, fallback, {
      render: () => {
        throw new Error('Unexpected renderer failure');
      },
    });

    expect(email).toBe(fallback);
  });

  it('does not swallow branded input validation errors', () => {
    expect(() =>
      renderBrandedEmailOrFallback(
        {
          ...brandedInput,
          cta: {
            label: 'Unsafe action',
            url: 'javascript:alert(1)',
          },
        },
        fallback,
      ),
    ).toThrow(BrandedEmailInputError);
  });
});
