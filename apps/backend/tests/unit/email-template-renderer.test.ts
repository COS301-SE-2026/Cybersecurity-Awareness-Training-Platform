import type { EmailDeliveryType } from '../../src/generated/prisma/enums.js';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/config/env.js', () => ({
  env: {
    FRONTEND_ORIGIN: 'http://frontend.com',
    SUPPORT_EMAIL_ADDRESS: 'support@insightfulphish.co.za',
  },
}));
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

type MigratedEmailCase = {
  emailType: EmailDeliveryType;
  subject: string;
  title: string;
  textFragment: string;
  templateData: unknown;
  actionLabel?: string;
  actionUrl?: string;
  hasExpiry: boolean;
  hasSupport: boolean;
};

type TokenizedActionUrlExpectation = readonly [EmailDeliveryType, string, string];

function namedTokenTemplateData(firstName = 'Johan') {
  return {
    firstName,
    actionToken: rawToken,
    actionTokenExpiresAt: expiresAt,
  };
}

function organisationTokenTemplateData(firstName = 'Johan') {
  return {
    ...namedTokenTemplateData(firstName),
    organisationName: 'Test Org',
  };
}

function emailChangeTemplateData() {
  return {
    firstName: 'Johan',
    oldEmail: 'old.johan@example.com',
    newEmail: 'johan@example.com',
  };
}

function tokenizedEmailCase(
  emailType: EmailDeliveryType,
  subject: string,
  title: string,
  textFragment: string,
  actionLabel: string,
  actionUrl: string,
  templateData: unknown = namedTokenTemplateData(),
  hasSupport = false,
): MigratedEmailCase {
  return {
    emailType,
    subject,
    title,
    textFragment,
    templateData,
    actionLabel,
    actionUrl,
    hasExpiry: true,
    hasSupport,
  };
}

function informationalEmailCase(
  emailType: EmailDeliveryType,
  subject: string,
  title: string,
  textFragment: string,
  templateData: unknown,
  hasSupport: boolean,
): MigratedEmailCase {
  return {
    emailType,
    subject,
    title,
    textFragment,
    templateData,
    hasExpiry: false,
    hasSupport,
  };
}

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

const tokenizedActionUrlExpectations: readonly TokenizedActionUrlExpectation[] = [
  ['EMAIL_VERIFICATION' as const, 'http://frontend.com/verify-email?token=', 'Verify email'],
  ['PASSWORD_RESET' as const, 'http://frontend.com/reset-password?token=', 'Reset password'],
  [
    'EMAIL_CHANGE_CONFIRMATION' as const,
    'http://frontend.com/confirm-email-change?token=',
    'Confirm email change',
  ],
  [
    'INITIAL_ORGANISATION_ADMIN_SETUP' as const,
    'http://frontend.com/setup/token/',
    'Set up administrator account',
  ],
  ['ORGANISATION_TRAINEE_INVITE' as const, 'http://frontend.com/setup/token/', 'Accept invitation'],
  [
    'ORGANISATION_ADMIN_PROMOTION_INVITE' as const,
    'http://frontend.com/accept-invite?token=',
    'Accept administrator invite',
  ],
  [
    'PLATFORM_ADMIN_INVITE' as const,
    'http://frontend.com/setup/token/',
    'Create administrator account',
  ],
  [
    'PLATFORM_ADMIN_UPGRADE_CONFIRMATION' as const,
    'http://frontend.com/accept-invite?token=',
    'Confirm upgrade',
  ],
] as const;

const migratedEmailCases: readonly MigratedEmailCase[] = [
  tokenizedEmailCase(
    'EMAIL_VERIFICATION',
    'Verify your email address',
    'Verify your email',
    'Before you can start using your account',
    'Verify email',
    `http://frontend.com/verify-email?token=${rawToken}`,
  ),
  tokenizedEmailCase(
    'PASSWORD_RESET',
    'Reset your password',
    'Reset your password',
    'We received a request to reset your Insightful Phish password.',
    'Reset password',
    `http://frontend.com/reset-password?token=${rawToken}`,
  ),
  informationalEmailCase(
    'PASSWORD_CHANGED',
    'Your password was changed',
    'Password changed',
    'Your Insightful Phish password was changed successfully',
    { firstName: 'Johan' },
    true,
  ),
  tokenizedEmailCase(
    'EMAIL_CHANGE_CONFIRMATION',
    'Confirm your new email address',
    'Confirm your email change',
    'Your account email will change from old.johan@example.com to johan@example.com.',
    'Confirm email change',
    `http://frontend.com/confirm-email-change?token=${rawToken}`,
    { ...emailChangeTemplateData(), actionToken: rawToken, actionTokenExpiresAt: expiresAt },
  ),
  informationalEmailCase(
    'EMAIL_CHANGE_WARNING',
    'Email change requested',
    'Email change requested',
    'A request was made to change your Insightful Phish email address from old.johan@example.com to johan@example.com.',
    emailChangeTemplateData(),
    true,
  ),
  informationalEmailCase(
    'ORGANISATION_REQUEST_RECEIVED',
    "We've received your organisation registration request",
    'Request received',
    'Your organisation registration request has been received.',
    { organisationName: 'Test Org' },
    false,
  ),
  informationalEmailCase(
    'ORGANISATION_REQUEST_REJECTED',
    'Your organisation registration request was not approved',
    'Request not approved',
    'Unfortunately, your request to register Test Org for Insightful Phish was not approved.',
    { organisationName: 'Test Org', rejectionReason: 'Incomplete registration detail.' },
    true,
  ),
  tokenizedEmailCase(
    'INITIAL_ORGANISATION_ADMIN_SETUP',
    'Your organisation has been approved',
    'Organisation approved',
    'The next step is to create the first organisation administrator account.',
    'Set up administrator account',
    `http://frontend.com/setup/token/${rawToken}`,
    organisationTokenTemplateData(),
    true,
  ),
  tokenizedEmailCase(
    'ORGANISATION_TRAINEE_INVITE',
    "You're invited to join Test Org",
    'Organisation invitation',
    'You have been invited to join Test Org on Insightful Phish.',
    'Accept invitation',
    `http://frontend.com/setup/token/${rawToken}`,
    organisationTokenTemplateData(),
  ),
  tokenizedEmailCase(
    'ORGANISATION_ADMIN_PROMOTION_INVITE',
    "You're invited to become an organisation administrator",
    'Administrator invitation',
    'Accepting this invitation will replace your trainee access with administrator access.',
    'Accept administrator invite',
    `http://frontend.com/accept-invite?token=${rawToken}`,
    organisationTokenTemplateData(),
    true,
  ),
  tokenizedEmailCase(
    'PLATFORM_ADMIN_INVITE',
    "You're invited to join the Insightful Phish team",
    'Platform administrator invitation',
    'You have been invited to join Insightful Phish as a platform administrator.',
    'Create administrator account',
    `http://frontend.com/setup/token/${rawToken}`,
  ),
  tokenizedEmailCase(
    'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
    'Confirm your platform administrator upgrade',
    'Confirm administrator upgrade',
    'Accepting this upgrade will replace your current trainee account with platform administrator access.',
    'Confirm upgrade',
    `http://frontend.com/accept-invite?token=${rawToken}`,
  ),
  informationalEmailCase(
    'ROLE_CHANGED_NOTIFICATION',
    'Your role has changed',
    'Role updated',
    'Your role in Test Org has been updated to organisation admin.',
    { firstName: 'Johan', organisationName: 'Test Org', roleName: 'organisation admin' },
    true,
  ),
] as const;

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
    expect(rendered.html).toContain('Verify your email</h1>');
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

  it.each(tokenizedActionUrlExpectations)(
    'renders %s token only in intended action URL locations',
    (emailType, urlPrefix, actionLabel) => {
      const testCase = migratedEmailCases.find((item) => item.emailType === emailType);

      expect(testCase).toBeDefined();

      if (!testCase) {
        throw new Error(`Missing migrated email fixture for ${emailType}`);
      }

      const email = renderEmail(emailType, testCase.templateData);
      const expectedUrl = `${urlPrefix}${rawToken}`;

      expect(email.text).toContain(`${actionLabel}: ${expectedUrl}`);
      expect(email.html).toContain(`href="${expectedUrl}"`);
      expect(countOccurrences(email.html, rawToken)).toBe(1);
      expect(countOccurrences(email.text, rawToken)).toBe(1);
      expect(email.html).not.toContain(tokenHash);
      expect(email.text).not.toContain(tokenHash);

      const mailtoHref = email.html.match(/href="(mailto:[^"]+)"/)?.[1] ?? '';
      expect(mailtoHref).not.toContain(rawToken);
    },
  );

  it.each(migratedEmailCases)(
    'renders branded HTML and meaningful text for $emailType',
    (testCase) => {
      const email = renderEmail(testCase.emailType, testCase.templateData);

      expect(email.subject).toBe(testCase.subject);
      expect(email.html).toContain('<!doctype html>');
      expect(email.html).toContain('#0E0020');
      expect(email.html).toContain('#2F0360');
      expect(email.html).toContain('Insightful Phish');
      expect(email.html).toContain(`${testCase.title}</h1>`);
      expect(email.html).toContain(testCase.textFragment);
      expect(email.text).toContain(testCase.title);
      expect(email.text).toContain(testCase.textFragment);
      expect(email.text).toContain('Insightful Phish');
      expectNoBrowserRuntimeEmailMarkup(email.html);

      if (testCase.actionLabel && testCase.actionUrl) {
        expect(email.html).toContain('#3100E4');
        expect(email.html).toContain(testCase.actionLabel);
        expect(email.html).toContain(`href="${testCase.actionUrl}"`);
        expect(email.text).toContain(`${testCase.actionLabel}: ${testCase.actionUrl}`);
      }

      if (testCase.hasExpiry) {
        expect(email.html).toContain('This link expires in');
        expect(email.text).toContain('This link expires in');
      } else {
        expect(email.text).not.toContain('This link expires in');
      }

      if (testCase.hasSupport) {
        expect(email.html).toContain('You can reach support by emailing');
        expect(email.html).toContain('mailto:support@insightfulphish.co.za');
        expect(email.text).toContain(
          'You can reach support by emailing support@insightfulphish.co.za.',
        );
      } else {
        expect(email.html).not.toContain('mailto:support@insightfulphish.co.za');
        expect(email.text).not.toContain('You can reach support by emailing');
      }
    },
  );

  it('escapes display values in HTML', async () => {
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
    templateId: 'PREVIEW_TEMPLATE',
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
    expect(email.html).toContain('mailto:support@insightfulphish.co.za');
    expect(email.html).toContain('subject=Help+%26+setup');
    expect(email.text).toContain('Open "setup": https://example.com/setup');
    expect(email.text).toContain(
      'You can reach support by emailing support@insightfulphish.co.za.',
    );
  });

  it('rejects mailbox delimiters in support mailto addresses', () => {
    expect(() =>
      buildSupportMailtoHref('help?bcc=x@example.org', {
        subject: 'Support request',
      }),
    ).toThrow(BrandedEmailInputError);
  });

  it('rejects subject header control characters before fallback can apply', () => {
    expect(() =>
      renderBrandedEmailOrFallback(
        {
          ...brandedInput,
          subject: 'Preview subject\r\nBcc: injected@example.org',
        },
        fallback,
      ),
    ).toThrow(BrandedEmailInputError);
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

  it('falls back only for the explicit recoverable branded assembly failure', () => {
    const warningSpy = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

    const email = renderBrandedEmailOrFallback(
      {
        ...brandedInput,
        subject: '   ',
      },
      fallback,
    );

    expect(email).toBe(fallback);
    expect(warningSpy).toHaveBeenCalledWith(
      'Branded email assembly failed for PREVIEW_TEMPLATE; rendered fallback body.',
      {
        code: 'BRANDED_EMAIL_FALLBACK_RENDERED',
      },
    );

    warningSpy.mockRestore();
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

  it('does not fallback for ordinary programming errors', () => {
    const sections = ['Broken branded section'];
    vi.spyOn(sections, 'map').mockImplementation(() => {
      throw new TypeError('Unexpected programming defect');
    });

    expect(() =>
      renderBrandedEmailOrFallback(
        {
          ...brandedInput,
          sections,
        },
        fallback,
      ),
    ).toThrow(TypeError);
  });
});
