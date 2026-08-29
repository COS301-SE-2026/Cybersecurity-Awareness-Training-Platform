import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Campaign Management Architecture Boundaries', () => {
  const backendSrcDir = join(process.cwd(), 'src');

  it('prohibits direct Prisma imports in campaign controllers', () => {
    const controllersDir = join(backendSrcDir, 'controllers');
    const campaignControllers = [join(controllersDir, 'campaign-management.controller.ts')];

    for (const file of campaignControllers) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('../lib/prisma.js');
      expect(content).not.toContain('/generated/prisma');
      expect(content).not.toContain('@prisma/client');
    }
  });

  it('prohibits direct Prisma imports in campaign services', () => {
    const servicesDir = join(backendSrcDir, 'services');
    const campaignServices = [
      join(servicesDir, 'campaign-management.service.ts'),
      join(servicesDir, 'campaign-eligibility.service.ts'),
      join(servicesDir, 'campaign-statistics.service.ts'),
      join(servicesDir, 'organisation-scope.service.ts'),
      join(servicesDir, 'quiz.service.ts'),
      join(servicesDir, 'simulation.service.ts'),
      join(servicesDir, 'trainee-training.service.ts'),
    ];

    for (const file of campaignServices) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('../lib/prisma.js');
      expect(content).not.toContain('/generated/prisma');
      expect(content).not.toContain('@prisma/client');
    }
  });
});
