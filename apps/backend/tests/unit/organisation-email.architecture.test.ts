import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), 'src', relativePath), 'utf8');
}

describe('organisation email architecture', () => {
  it('keeps Prisma access in the repository', () => {
    const controller = source('controllers/organisation-email.controller.ts');
    const service = source('services/organisation-email.service.ts');
    const authoring = source('services/email-authoring.service.ts');
    const repository = source('repositories/organisation-email.repository.ts');

    for (const content of [controller, service, authoring]) {
      expect(content).not.toMatch(/lib\/prisma|generated\/prisma|\bprisma\./);
    }
    expect(controller).not.toMatch(/repositories\//);
    expect(repository).toMatch(/lib\/prisma/);
    expect(repository).toMatch(/\$transaction/);
    expect(repository).toMatch(/pg_advisory_xact_lock/);
  });

  it('reuses the shared canonical draft contract', () => {
    const controller = source('controllers/organisation-email.controller.ts');
    const service = source('services/organisation-email.service.ts');
    const authoring = source('services/email-authoring.service.ts');
    const repository = source('repositories/organisation-email.repository.ts');

    for (const content of [controller, service, authoring, repository]) {
      expect(content).toContain('OrganisationEmailDraftInput');
      expect(content).toContain('@insightful-phish/shared');
    }
  });

  it('keeps internal hashes out of the transport controller', () => {
    expect(source('controllers/organisation-email.controller.ts')).not.toContain('contentHash');
  });
});
