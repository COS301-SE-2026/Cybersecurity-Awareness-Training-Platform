import { env } from '../config/env.js';
import { DEFAULT_SUPPORT_EMAIL_ADDRESS, isSupportEmailAddress } from '../config/support-email.js';

export type EmailRenderResult = {
  subject: string;
  text: string;
  html: string;
};

export type BrandedEmailCta = {
  label: string;
  url: string;
};

export type BrandedEmailSupportContext = {
  subject?: string;
  body?: string;
};

export type BrandedEmailLayoutInput = {
  templateId: string;
  subject: string;
  previewText?: string;
  title: string;
  greeting?: string;
  sections: readonly string[];
  cta?: BrandedEmailCta;
  expiryText?: string;
  support?: BrandedEmailSupportContext;
};

export class BrandedEmailInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrandedEmailInputError';
  }
}

export class BrandedEmailAssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrandedEmailAssemblyError';
  }
}

export const EMAIL_DESIGN_TOKENS = {
  ink: '#0E0020',
  panel: '#2F0360',
  brand: '#3100E4',
  accent: '#8400FF',
  surface: '#F4ECFF',
  border: '#E4D6FF',
  white: '#FFFFFF',
  muted: '#5B4B6F',
} as const;

const FONT_STACK = 'Jost, Arial, Helvetica, sans-serif';
const TEMPLATE_ID_PATTERN = /^[A-Z0-9_]+$/;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function hasHeaderControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function assertEmailAddress(value: string): void {
  if (!isSupportEmailAddress(value)) {
    throw new BrandedEmailInputError('Support email address must be valid');
  }
}

function assertTemplateId(value: string): void {
  if (!TEMPLATE_ID_PATTERN.test(value)) {
    throw new BrandedEmailInputError('Email template identifier must be fixed and safe');
  }
}

function assertSafeHeaderValue(value: string): void {
  if (hasHeaderControlCharacter(value)) {
    throw new BrandedEmailInputError('Email subject contains disallowed header characters');
  }
}

function assertSafeActionUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BrandedEmailInputError('CTA URL must be absolute');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BrandedEmailInputError('CTA URL must use http or https');
  }
}

export function buildSupportMailtoHref(
  supportEmailAddress: string,
  context: BrandedEmailSupportContext = {},
): string {
  assertEmailAddress(supportEmailAddress);

  const url = new URL(`mailto:${supportEmailAddress}`);
  if (context.subject) {
    url.searchParams.set('subject', context.subject);
  }
  if (context.body) {
    url.searchParams.set('body', context.body);
  }

  return url.toString();
}

export function plainTextSupportLine(supportEmailAddress: string): string {
  assertEmailAddress(supportEmailAddress);
  return `You can reach support by emailing ${supportEmailAddress}.`;
}

function resolveSupportEmailAddress(configured: string | undefined): string {
  return configured ?? DEFAULT_SUPPORT_EMAIL_ADDRESS;
}

function validateBrandedEmailInput(input: BrandedEmailLayoutInput): void {
  assertTemplateId(input.templateId);
  assertSafeHeaderValue(input.subject);
  if (input.cta) {
    assertSafeActionUrl(input.cta.url);
  }
}

function assertNonEmptyRenderedField(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new BrandedEmailAssemblyError(`Branded email rendered empty ${fieldName}`);
  }
}

function validateBrandedEmailOutput(result: EmailRenderResult): void {
  assertNonEmptyRenderedField(result.subject, 'subject');
  assertNonEmptyRenderedField(result.text, 'text');
  assertNonEmptyRenderedField(result.html, 'html');

  if (!result.html.includes('<!doctype html>') || !result.html.includes('</html>')) {
    throw new BrandedEmailAssemblyError('Branded email rendered invalid HTML structure');
  }
}

function emitFallbackWarning(templateId: string): void {
  process.emitWarning(`Branded email assembly failed for ${templateId}; rendered fallback body.`, {
    code: 'BRANDED_EMAIL_FALLBACK_RENDERED',
  });
}

function renderPreviewText(previewText?: string): string {
  if (!previewText) return '';

  return [
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">',
    escapeHtml(previewText),
    '</div>',
  ].join('');
}

function renderHeader(title: string): string {
  return [
    `<tr><td style="background:${EMAIL_DESIGN_TOKENS.ink};padding:28px 32px;border-radius:12px 12px 0 0;">`,
    `<div style="font-family:${FONT_STACK};font-size:13px;line-height:18px;font-weight:700;letter-spacing:0;color:${EMAIL_DESIGN_TOKENS.accent};">Insightful Phish</div>`,
    `<h1 style="margin:12px 0 0;font-family:${FONT_STACK};font-size:28px;line-height:34px;font-weight:700;color:${EMAIL_DESIGN_TOKENS.white};">${escapeHtml(title)}</h1>`,
    '</td></tr>',
  ].join('');
}

function renderGreeting(greeting?: string): string {
  if (!greeting) return '';

  return `<p style="margin:0 0 18px;font-family:${FONT_STACK};font-size:16px;line-height:24px;color:${EMAIL_DESIGN_TOKENS.ink};">${escapeHtml(greeting)}</p>`;
}

function renderBodySections(sections: readonly string[]): string {
  return sections
    .map(
      (section) =>
        `<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:16px;line-height:24px;color:${EMAIL_DESIGN_TOKENS.ink};">${escapeHtml(section)}</p>`,
    )
    .join('');
}

function renderCta(cta?: BrandedEmailCta): string {
  if (!cta) return '';

  assertSafeActionUrl(cta.url);

  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 20px;">',
    '<tr>',
    `<td style="background:${EMAIL_DESIGN_TOKENS.brand};border-radius:6px;">`,
    `<a href="${escapeAttribute(cta.url)}" style="display:inline-block;padding:14px 22px;font-family:${FONT_STACK};font-size:16px;line-height:20px;font-weight:700;color:${EMAIL_DESIGN_TOKENS.white};text-decoration:none;">${escapeHtml(cta.label)}</a>`,
    '</td>',
    '</tr>',
    '</table>',
  ].join('');
}

function renderExpiryCopy(expiryText?: string): string {
  if (!expiryText) return '';

  return `<p style="margin:0 0 18px;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${EMAIL_DESIGN_TOKENS.muted};">${escapeHtml(expiryText)}</p>`;
}

function renderSupportBlock(
  supportEmailAddress: string,
  support?: BrandedEmailSupportContext,
): string {
  if (!support) return '';

  const mailtoHref = buildSupportMailtoHref(supportEmailAddress, support);
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0;background:${EMAIL_DESIGN_TOKENS.surface};border:1px solid ${EMAIL_DESIGN_TOKENS.border};border-radius:8px;">`,
    '<tr>',
    '<td style="padding:18px 20px;">',
    `<p style="margin:0;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${EMAIL_DESIGN_TOKENS.ink};">You can reach support by emailing <a href="${escapeAttribute(mailtoHref)}" style="color:${EMAIL_DESIGN_TOKENS.brand};text-decoration:underline;">${escapeHtml(supportEmailAddress)}</a>.</p>`,
    '</td>',
    '</tr>',
    '</table>',
  ].join('');
}

function renderFooter(): string {
  return [
    `<tr><td style="padding:22px 32px;background:${EMAIL_DESIGN_TOKENS.panel};border-radius:0 0 12px 12px;">`,
    `<p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${EMAIL_DESIGN_TOKENS.white};">Insightful Phish</p>`,
    '</td></tr>',
  ].join('');
}

function renderPlainText(input: BrandedEmailLayoutInput, supportEmailAddress: string): string {
  return [
    input.title,
    input.greeting,
    ...input.sections,
    input.cta ? `${input.cta.label}: ${input.cta.url}` : undefined,
    input.expiryText,
    input.support ? plainTextSupportLine(supportEmailAddress) : undefined,
    'Insightful Phish',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n\n');
}

export function renderBrandedEmail(input: BrandedEmailLayoutInput): EmailRenderResult {
  validateBrandedEmailInput(input);

  const supportEmailAddress = resolveSupportEmailAddress(env.SUPPORT_EMAIL_ADDRESS);
  if (input.support) {
    assertEmailAddress(supportEmailAddress);
  }

  const content = [
    renderGreeting(input.greeting),
    renderBodySections(input.sections),
    renderCta(input.cta),
    renderExpiryCopy(input.expiryText),
    renderSupportBlock(supportEmailAddress, input.support),
  ].join('');

  const html = [
    '<!doctype html>',
    '<html>',
    '<body style="margin:0;padding:0;background:#F7F2FF;">',
    renderPreviewText(input.previewText),
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F7F2FF;margin:0;padding:24px 12px;">',
    '<tr><td align="center">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;border-collapse:separate;">',
    renderHeader(input.title),
    `<tr><td style="padding:32px;background:${EMAIL_DESIGN_TOKENS.white};">`,
    content,
    '</td></tr>',
    renderFooter(),
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');

  const result = {
    subject: input.subject,
    text: renderPlainText(input, supportEmailAddress),
    html,
  };

  validateBrandedEmailOutput(result);
  return result;
}

export function renderBrandedEmailOrFallback(
  input: BrandedEmailLayoutInput,
  fallback: EmailRenderResult,
): EmailRenderResult {
  validateBrandedEmailInput(input);

  try {
    return renderBrandedEmail(input);
  } catch (error) {
    if (error instanceof BrandedEmailAssemblyError) {
      emitFallbackWarning(input.templateId);
      return fallback;
    }

    throw error;
  }
}
