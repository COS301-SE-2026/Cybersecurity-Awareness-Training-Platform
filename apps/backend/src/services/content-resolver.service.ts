import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

export class TrainingContentResolveError extends Error {
  constructor(message = 'Training content could not be loaded', options?: ErrorOptions) {
    super(message, options);
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
const DEMO3_CONTENT_PREFIX = 'demo3://training/';
const DEMO3_FILENAME_PATTERN = /^[a-z0-9][a-z0-9-]*\.md$/;

async function resolveDemo3Content(contentRef: string): Promise<string | null> {
  if (!contentRef.startsWith(DEMO3_CONTENT_PREFIX)) {
    return null;
  }

  const configuredRoot = process.env.DEMO3_TRAINING_CONTENT_DIR?.trim();
  const filename = contentRef.slice(DEMO3_CONTENT_PREFIX.length);
  if (!configuredRoot || !DEMO3_FILENAME_PATTERN.test(filename)) {
    return null;
  }

  try {
    const root = await realpath(configuredRoot);
    const requestedPath = resolve(root, filename);
    if (!requestedPath.startsWith(`${root}${sep}`)) {
      return null;
    }
    const file = await realpath(requestedPath);
    if (!file.startsWith(`${root}${sep}`)) {
      return null;
    }
    return await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw new TrainingContentResolveError(undefined, { cause: error });
  }
}

export async function resolveContent(
  contentType: string,
  contentRef: string,
): Promise<string | null> {
  if (contentType !== MARKDOWN_CONTENT_TYPE) {
    return null;
  }

  if (contentRef.startsWith(DEMO3_CONTENT_PREFIX)) {
    return resolveDemo3Content(contentRef);
  }

  const contentUrl = demoContentMap[contentRef];

  if (!contentUrl) {
    return null;
  }

  try {
    return await readFile(contentUrl, 'utf8');
  } catch (error) {
    throw new TrainingContentResolveError(undefined, { cause: error });
  }
}
