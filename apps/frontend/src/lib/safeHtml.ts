import DOMPurify from 'dompurify';

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
