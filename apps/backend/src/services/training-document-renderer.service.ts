import { createHash } from 'node:crypto';
import type { PreviewTrainingDocumentResponseDto } from '@insightful-phish/shared';
import sanitizeHtml from 'sanitize-html';

const markdownHtmlCache = new Map<string, string>();
export async function renderTrainingDocumentMarkdown(
  rawMarkdown: string,
): Promise<PreviewTrainingDocumentResponseDto> {
  if (rawMarkdown.length > 50_000) {
    throw new Error('Markdown exceeds rendering limit');
  }
  const markdownHash = createHash('sha256').update(rawMarkdown, 'utf8').digest('hex');
  const cachedHtml = markdownHtmlCache.get(markdownHash);
  if (cachedHtml !== undefined) {
    return { html: cachedHtml, markdownHash };
  }
  if (rawMarkdown.length === 0) {
    return { html: '', markdownHash };
  }

  //https://docs.github.com/en/rest/markdown/markdown?apiVersion=2026-03-10#render-a-markdown-document
  const response = await fetch('https://api.github.com/markdown', {
    method: 'POST',
    headers: {
      Accept: 'text/html',
      'Content-Type': 'application/json',
      'User-Agent': 'InsightfulPhish',
      'X-Github-Api-Version': '2026-03-10',
    },
    body: JSON.stringify({ text: rawMarkdown, mode: 'gfm' }),
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error('GitHub Markdown rendering failed');
  }

  const html = sanitizeHtml(await response.text(), {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'del',
      'blockquote',
      'ul',
      'ol',
      'li',
      'pre',
      'code',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  });
  if (markdownHtmlCache.size >= 50) {
    const oldestHash = markdownHtmlCache.keys().next().value;
    if (oldestHash !== undefined) {
      markdownHtmlCache.delete(oldestHash);
    }
  }
  markdownHtmlCache.set(markdownHash, html);
  return { html, markdownHash };
}
