import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
}

describe('simulated inbox management architecture', () => {
  it('preserves controller to service to repository to database boundaries', () => {
    const controller = source('controllers/simulated-inbox-management.controller.ts');
    const service = source('services/simulated-inbox-management.service.ts');
    const repository = source('repositories/simulated-inbox-management.repository.ts');

    expect(controller).not.toMatch(/repositories\/|lib\/prisma|generated\/prisma/);
    expect(service).not.toMatch(/lib\/prisma|generated\/prisma|\bprisma\./);
    expect(repository).toContain('lib/prisma');
    expect(repository).toContain('$transaction');
    expect(repository).toContain('pg_advisory_xact_lock');
  });

  it('uses the canonical shared email Draft and registration implementation', () => {
    const service = source('services/simulated-inbox-management.service.ts');
    const repository = source('repositories/simulated-inbox-management.repository.ts');

    expect(service).toContain('OrganisationEmailDraftInput');
    expect(service).toContain('prepareOrganisationEmailRegistration');
    expect(repository).toContain('registerOrganisationEmailDraftInTransaction');
  });

  it('keeps expected answers out of trainee response mapping', () => {
    const traineeService = source('services/simulation.service.ts');
    const getEmailBody = traineeService.slice(
      traineeService.indexOf('async getSimulatedEmail('),
      traineeService.indexOf('async recordInteraction('),
    );

    expect(getEmailBody).not.toMatch(/expectedClassification:\s*email/);
    expect(getEmailBody).not.toMatch(/redFlags:\s*email/);
  });
});
