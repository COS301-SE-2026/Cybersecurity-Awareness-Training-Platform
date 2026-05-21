import { readFile } from 'node:fs/promises';

export class TrainingContentResolveError extends Error {
  constructor(message = 'Training content could not be loaded') {
    super(message);
    this.name = 'TrainingContentResolveError';
  }
}

const demoContentMap: Record<string, URL> = {
  'demo://training/phishing-warning-signs': new URL(
    '../content/training/phishing-warning-signs.md',
    import.meta.url,
  ),
  'demo://training/safe-link-handling': new URL(
    '../content/training/safe-link-handling.md',
    import.meta.url,
  ),
  'demo://training/password-security-basics': new URL(
    '../content/training/password-security-basics.md',
    import.meta.url,
  ),
};

const MARKDOWN_CONTENT_TYPE = 'MARKDOWN';

export async function resolveContent(
  contentType: string,
  contentRef: string,
): Promise<string | null> {
  if (contentType !== MARKDOWN_CONTENT_TYPE) {
    return null;
  }

  const contentUrl = demoContentMap[contentRef];

  if (!contentUrl) {
    return null;
  }

  try {
    return await readFile(contentUrl, 'utf8');
  } catch (error) {
    throw new TrainingContentResolveError();
  }
}
