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
  'audio',
  'button',
  'embed',
  'form',
  'frame',
  'frameset',
  'iframe',
  'img',
  'input',
  'link',
  'object',
  'option',
  'script',
  'select',
  'source',
  'style',
  'textarea',
  'video',
] as const;

const SAFE_HTML_FORBIDDEN_ATTRS = [
  'class',
  'id',
  'onclick',
  'onerror',
  'onload',
  'onsubmit',
  'style',
] as const;

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

export function renderTraineeEmailHtml(
  email: Readonly<{
    bodyHtml: string;
    linkAnchorText?: string | null;
    simulatedLinkTarget?: string | null;
  }>,
  trainee: Readonly<{ firstName: string; lastName: string; email: string }>,
): string {
  const rendered = sanitizeSafeHtml(email.bodyHtml)
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.FIRST_NAME, escapeHtml(trainee.firstName))
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.SURNAME, escapeHtml(trainee.lastName))
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.EMAIL_ADDRESS, escapeHtml(trainee.email));
  const anchorText = escapeHtml(email.linkAnchorText?.trim() || 'Open link');

  if (!rendered.includes(SYSTEM_LINK_MARKER)) {
    return rendered;
  }

  let managedLink = `<span class="email-body__managed-link">${anchorText}</span>`;
  if (email.simulatedLinkTarget) {
    try {
      const target = new URL(email.simulatedLinkTarget);
      if (target.protocol === 'http:' || target.protocol === 'https:') {
        managedLink = `<a class="email-body__managed-link" href="${escapeHtml(target.toString())}">${anchorText}</a>`;
      }
    } catch {
      managedLink = `<span class="email-body__managed-link">${anchorText}</span>`;
    }
  }

  return rendered.replaceAll(SYSTEM_LINK_MARKER, managedLink);
}
