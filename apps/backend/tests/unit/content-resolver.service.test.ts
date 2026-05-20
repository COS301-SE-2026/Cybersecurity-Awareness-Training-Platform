import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import('node:fs/promises');
const { resolveContent, TrainingContentResolveError } = await import(
  '../../src/services/content-resolver.service.js'
);

describe('content resolver service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when contentType is not MARKDOWN', async () => {
    const result = await resolveContent('HTML', 'demo://training/phishing-warning-signs');

    expect(result).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
  });

  it('returns null for unknown refs', async () => {
    const result = await resolveContent('MARKDOWN', 'demo://training/unknown');

    expect(result).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
  });

  it('returns markdown for allowlisted refs', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('demo content');

    const result = await resolveContent('MARKDOWN', 'demo://training/phishing-warning-signs');

    expect(result).toBe('demo content');
    expect(readFile).toHaveBeenCalledWith(expect.any(URL), 'utf8');
  });

  it('throws a controlled error when markdown cannot be read', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('read failed'));

    await expect(
      resolveContent('MARKDOWN', 'demo://training/phishing-warning-signs'),
    ).rejects.toBeInstanceOf(TrainingContentResolveError);
  });
});
