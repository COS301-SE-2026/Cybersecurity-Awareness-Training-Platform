import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function resolveBackendFilePath(relativePathFromBackendSrc: string): string {
  const cwd = process.cwd();
  const candidate1 = path.resolve(cwd, 'src', relativePathFromBackendSrc);
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.resolve(cwd, 'apps/backend/src', relativePathFromBackendSrc);
  if (fs.existsSync(candidate2)) return candidate2;

  throw new Error(`Could not resolve backend file: ${relativePathFromBackendSrc}`);
}

describe('Campaign Assignment Architecture Isolation', () => {
  const servicePath = resolveBackendFilePath('services/campaign-assignment.service.ts');
  const controllerPath = resolveBackendFilePath('controllers/campaign-assignment.controller.ts');
  const routesPath = resolveBackendFilePath('routes/campaign-assignment.routes.ts');

  it('ensures service performs persistence ONLY through campaign-assignment.repository', () => {
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');

    const importStatements = serviceContent
      .split(/import\s+/g)
      .slice(1)
      .map((s) => s.split(';')[0].replace(/\s+/g, ' '));

    for (const statement of importStatements) {
      expect(statement).not.toMatch(/prisma/i);
      expect(statement).not.toMatch(/@prisma\/client/i);
      expect(statement).not.toMatch(/lib\/prisma/i);
    }

    const repositoryImports = importStatements.filter((statement) =>
      statement.includes('repository'),
    );
    expect(repositoryImports.length).toBeGreaterThan(0);
    for (const repoImport of repositoryImports) {
      expect(repoImport).toMatch(/campaign-assignment\.repository/);
    }

    expect(serviceContent).not.toMatch(/\bprisma\./i);
    expect(serviceContent).not.toMatch(/\bclient\.(user|organisation|campaign)\./i);
    expect(serviceContent).not.toMatch(/\$(queryRaw|executeRaw|transaction)\b/i);
  });

  it('ensures controller does not import Prisma or repositories', () => {
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
    expect(controllerContent).not.toMatch(/from\s+['"].*prisma.*['"]/i);
    expect(controllerContent).not.toMatch(/from\s+['"].*repository.*['"]/i);
  });

  it('ensures routes do not import persistence layer or repositories directly', () => {
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    expect(routesContent).not.toMatch(/from\s+['"].*prisma.*['"]/i);
    expect(routesContent).not.toMatch(/from\s+['"].*repository.*['"]/i);
  });

  it('ensures trainee campaign controller and routes do not import Prisma or repositories directly', () => {
    const traineeControllerPath = resolveBackendFilePath('controllers/trainee-campaign.controller.ts');
    const traineeRoutesPath = resolveBackendFilePath('routes/trainee-campaign.routes.ts');

    const controllerContent = fs.readFileSync(traineeControllerPath, 'utf-8');
    const routesContent = fs.readFileSync(traineeRoutesPath, 'utf-8');

    expect(controllerContent).not.toMatch(/from\s+['"].*prisma.*['"]/i);
    expect(controllerContent).not.toMatch(/from\s+['"].*repository.*['"]/i);
    expect(routesContent).not.toMatch(/from\s+['"].*prisma.*['"]/i);
    expect(routesContent).not.toMatch(/from\s+['"].*repository.*['"]/i);
  });

  it('ensures trainee campaign service does not import Prisma directly', () => {
    const traineeServicePath = resolveBackendFilePath('services/trainee-campaign.service.ts');
    const serviceContent = fs.readFileSync(traineeServicePath, 'utf-8');

    const importStatements = serviceContent
      .split(/import\s+/g)
      .slice(1)
      .map((s) => s.split(';')[0].replace(/\s+/g, ' '));

    for (const statement of importStatements) {
      expect(statement).not.toMatch(/@prisma\/client/i);
      expect(statement).not.toMatch(/lib\/prisma/i);
    }

    expect(serviceContent).not.toMatch(/\bprisma\./i);
    expect(serviceContent).not.toMatch(/\$(queryRaw|executeRaw|transaction)\b/i);
  });
});
