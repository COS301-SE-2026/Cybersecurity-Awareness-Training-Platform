import DOMPurify from 'dompurify';
import {
  EMAIL_PERSONALISATION_MARKERS,
  SYSTEM_LINK_MARKER,
  type OrganisationEmailDraftInput,
} from '@insightful-phish/shared';

const SAFE_EMAIL_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
] as const;

const SAFE_HTML_FORBIDDEN_TAGS = [
  'button',
  'embed',
  'form',
  'frame',
  'frameset',
  'iframe',
  'input',
  'object',
  'option',
  'script',
  'select',
  'textarea',
] as const;

const SAFE_HTML_FORBIDDEN_ATTRS = ['onclick', 'onerror', 'onload', 'onsubmit'] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function sanitizeSafeHtml(html: string): string {
  if (!html.trim()) {
    return '';
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [...SAFE_HTML_FORBIDDEN_TAGS],
    FORBID_ATTR: [...SAFE_HTML_FORBIDDEN_ATTRS],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    KEEP_CONTENT: false,
  });
}

export function sanitizeSafeEmailHtml(html: string): string {
  if (!html.trim()) {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...SAFE_EMAIL_TAGS],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

export function renderEmailPreviewHtml(
  email: Pick<OrganisationEmailDraftInput, 'bodyHtml' | 'link'>,
): string {
  const sanitized = sanitizeSafeEmailHtml(email.bodyHtml)
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.FIRST_NAME, 'Alex')
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.SURNAME, 'Smith')
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.EMAIL_ADDRESS, 'alex.smith@example.test');
  const anchorText = email.link?.anchorText.trim() || 'Managed link';

  return sanitized.replaceAll(
    SYSTEM_LINK_MARKER,
    `<span class="email-preview-managed-link">${escapeHtml(anchorText)}</span>`,
  );
}
