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

describe('Organisation Trainee Architecture Boundaries', () => {
  const servicePath = resolveBackendFilePath('services/organisation-trainee.service.ts');
  const controllerPath = resolveBackendFilePath('controllers/organisation-trainee.controller.ts');
  const routesPath = resolveBackendFilePath('routes/organisation-trainee.routes.ts');

  it('prohibits direct Prisma imports and database infrastructure in organisation-trainee.service.ts', () => {
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');

    const importStatements = serviceContent
      .split(/import\s+/g)
      .slice(1)
      .map((s) => s.split(';')[0].replace(/\s+/g, ' '));

    for (const statement of importStatements) {
      expect(statement).not.toMatch(/@prisma\/client/i);
      expect(statement).not.toMatch(/lib\/prisma/i);
      expect(statement).not.toMatch(/\/generated\/prisma\/client/i);
    }

    expect(serviceContent).not.toMatch(/\bprisma\./i);
    expect(serviceContent).not.toMatch(/\$(queryRaw|executeRaw|transaction)\b/i);

    const repositoryImports = importStatements.filter((statement) =>
      statement.includes('repository'),
    );
    expect(repositoryImports.length).toBeGreaterThan(0);
    for (const repoImport of repositoryImports) {
      expect(repoImport).toMatch(/(organisation-trainee|invitation)\.repository/);
    }
  });

  it('ensures organisation trainee controller does not import Prisma or repositories directly', () => {
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
    expect(controllerContent).not.toMatch(/from\s+['"].*prisma.*['"]/i);
    expect(controllerContent).not.toMatch(/from\s+['"].*repository.*['"]/i);
  });

  it('ensures organisation trainee routes do not import Prisma or repositories directly', () => {
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    expect(routesContent).not.toMatch(/from\s+['"].*prisma.*['"]/i);
    expect(routesContent).not.toMatch(/from\s+['"].*repository.*['"]/i);
  });

  it('ensures organisation trainee repository does not import application services', () => {
    const repoPath = resolveBackendFilePath('repositories/organisation-trainee.repository.ts');
    const repoContent = fs.readFileSync(repoPath, 'utf-8');
    expect(repoContent).not.toMatch(/from\s+['"]\.\.\/services\/.*['"]/i);
  });
});
