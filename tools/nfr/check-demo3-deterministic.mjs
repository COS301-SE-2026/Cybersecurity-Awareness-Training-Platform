import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');

const expectedQualityRequirementIds = [
  'QR-AUTH-01',
  'QR-DATA-01',
  'QR-ACCESS-01',
  'QR-RELIABILITY-01',
  'QR-PERF-01',
  'QR-TRACE-01',
  'QR-AUDIT-01',
  'QR-DEPLOY-01',
];

const routeCheckGroups = [
  {
    file: 'apps/backend/src/routes/account.routes.ts',
    router: 'accountRouter',
    middleware: ['authRateLimit', 'requireAuth'],
    routes: [
      { method: 'get', path: '/account' },
      { method: 'patch', path: '/account/profile' },
      { method: 'post', path: '/account/change-email' },
      { method: 'post', path: '/account/change-password' },
      { method: 'get', path: '/account/sessions' },
      { method: 'delete', path: '/account/sessions/:sessionId' },
      { method: 'post', path: '/account/sessions/logout-others' },
      { method: 'patch', path: '/account/security-preferences' },
    ],
  },
  {
    file: 'apps/backend/src/routes/organisation-trainee.routes.ts',
    router: 'organisationTraineeRouter',
    routes: [
      {
        method: 'get',
        path: '/organisations/:organisationId/trainees',
        middleware: ['organisationTraineeReadRateLimit', 'requireAuth'],
      },
      {
        method: 'post',
        path: '/organisations/:organisationId/trainee-invitations',
        middleware: ['organisationTraineeMutationRateLimit', 'requireAuth'],
      },
    ],
  },
  {
    file: 'apps/backend/src/routes/organisation-admin.routes.ts',
    router: 'organisationAdminRouter',
    routes: [
      {
        method: 'get',
        path: '/organisations/:organisationId/admins',
        middleware: ['organisationAdminReadRateLimit', 'requireAuth'],
      },
      {
        method: 'post',
        path: '/organisations/:organisationId/admin-promotions',
        middleware: ['organisationAdminMutationRateLimit', 'requireAuth'],
      },
    ],
  },
];

const fileLevelRouteChecks = [
  {
    file: 'apps/backend/src/routes/platform.routes.ts',
    description: 'platform routes',
    requiredText: [
      "platformRouter.use('/platform', apiRateLimit, requireAuth, requirePlatformAdmin)",
    ],
  },
];

const auditTestExpectations = [
  'redacts sensitive fields from oldValues, newValues and metadata',
  'rejects SYSTEM audit entries that have an actorUserId',
  'rejects audit entries that do not have a targetId unless the targetType is OTHER',
  'uses the transaction client if provided',
];

const sensitiveEvidencePatterns = [
  { label: 'raw token field', pattern: /["']?\brawToken\b["']?\s*[:=]/i },
  { label: 'token hash field', pattern: /["']?\btokenHash\b["']?\s*[:=]/i },
  {
    label: 'SMTP password assignment',
    pattern: /["']?\bSMTP_PASSWORD\b["']?\s*[:=]\s*["']?[^<\s"'][^\s"']*/i,
  },
  {
    label: 'database URL assignment',
    pattern: /["']?\bDATABASE_URL\b["']?\s*[:=]\s*["']?[^<\s"'][^\s"']*/i,
  },
  { label: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i },
];

const evidenceDirectories = [
  'docs/demo3/nfr/evidence',
  'docs/demo3/nfr/evidence/generated',
  'apps/backend/test-results',
  'apps/frontend/test-results',
];

const args = new Set(process.argv.slice(2));
const strictTraceability = args.has('--strict');
const selectedChecks = new Set(
  [...args].filter((arg) => arg !== '--strict').map((arg) => arg.replace(/^--/, '')),
);

const checkNames = ['traceability', 'security', 'routes', 'audit'];
const checksToRun = selectedChecks.size
  ? checkNames.filter((name) => selectedChecks.has(name))
  : checkNames;

const results = [];

function result(check, status, detail) {
  results.push({ check, status, detail });
}

function fail(message) {
  throw new Error(message);
}

function projectPath(relativePath) {
  return path.join(projectRoot, relativePath);
}

async function pathExists(relativePath) {
  try {
    await access(projectPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readProjectFile(relativePath) {
  return readFile(projectPath(relativePath), 'utf8');
}

function unique(values) {
  return [...new Set(values)].sort();
}

function extractQualityRequirementIds(content) {
  return unique([...content.matchAll(/`(QR-[A-Z]+-\d{2})`/g)].map((match) => match[1]));
}

function extractOldQualityRequirementIds(content) {
  return unique(
    [...content.matchAll(/`(QR-\d{2})`/g), ...content.matchAll(/`(QR-[A-Z]+-\d{3})`/g)].map(
      (match) => match[1],
    ),
  );
}

function extractMarkdownLinks(content) {
  return [...content.matchAll(/\[[^\]]+\]\(([^)#][^)]+\.md(?:#[^)]+)?)\)/g)].map(
    (match) => match[1],
  );
}

async function assertLocalMarkdownLinksExist(sourceFile, content) {
  const sourceDirectory = path.dirname(sourceFile);
  const links = extractMarkdownLinks(content);
  const missing = [];

  for (const link of links) {
    if (/^[a-z]+:/i.test(link)) {
      continue;
    }

    const [targetFile] = link.split('#');
    const targetPath = path.normalize(path.join(sourceDirectory, targetFile));
    if (!(await pathExists(targetPath))) {
      missing.push(link);
    }
  }

  if (missing.length > 0) {
    fail(`Missing local markdown targets from ${sourceFile}: ${missing.join(', ')}`);
  }
}

async function runTraceabilityCheck() {
  const qualityRequirementsPath = 'docs/demo3/srs/quality-requirements.md';
  const qualityRequirements = await readProjectFile(qualityRequirementsPath);
  const ids = extractQualityRequirementIds(qualityRequirements);
  const missingIds = expectedQualityRequirementIds.filter((id) => !ids.includes(id));
  const unexpectedOldIds = extractOldQualityRequirementIds(qualityRequirements);

  if (missingIds.length > 0) {
    fail(`Missing retained Demo 3 QR IDs: ${missingIds.join(', ')}`);
  }

  if (unexpectedOldIds.length > 0) {
    fail(
      `Old numeric QR IDs remain in the SRS quality requirements: ${unexpectedOldIds.join(', ')}`,
    );
  }

  await assertLocalMarkdownLinksExist(qualityRequirementsPath, qualityRequirements);

  const parityFiles = [
    'docs/demo3/nfr/traceability-matrix.md',
    'docs/demo3/sas/quality-architecture-mapping.md',
  ];

  for (const file of parityFiles) {
    if (!(await pathExists(file))) {
      if (strictTraceability) {
        fail(`Strict traceability requires ${file}`);
      }

      continue;
    }

    const content = await readProjectFile(file);
    const fileIds = extractQualityRequirementIds(content);
    const missingFromFile = expectedQualityRequirementIds.filter((id) => !fileIds.includes(id));
    const oldIds = extractOldQualityRequirementIds(content);

    if (oldIds.length > 0) {
      fail(`Old Demo 3 QR identifiers remain in ${file}: ${oldIds.join(', ')}`);
    }

    if (missingFromFile.length > 0) {
      fail(`${file} is missing QR IDs: ${missingFromFile.join(', ')}`);
    }

    await assertLocalMarkdownLinksExist(file, content);
  }

  const additionalQualityDocs = ['docs/demo3/sas/design-patterns.md'];

  for (const file of additionalQualityDocs) {
    if (!(await pathExists(file))) {
      continue;
    }

    const content = await readProjectFile(file);
    const oldIds = extractOldQualityRequirementIds(content);

    if (oldIds.length > 0) {
      fail(`Old Demo 3 QR identifiers remain in ${file}: ${oldIds.join(', ')}`);
    }

    await assertLocalMarkdownLinksExist(file, content);
  }

  result(
    'traceability',
    'PASS',
    `Validated ${expectedQualityRequirementIds.length} retained QR IDs, SRS/NFR/SAS parity, and local quality links.`,
  );
}

function findCallEnd(content, openParenthesisIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openParenthesisIndex; index < content.length; index += 1) {
    const character = content[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '(') {
      depth += 1;
      continue;
    }

    if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return -1;
}

function routeCallFor(content, { router, method, path: routePath }) {
  const callPattern = new RegExp(`${router}\\.${method}\\s*\\(`, 'g');
  let match = callPattern.exec(content);

  while (match) {
    const openParenthesisIndex = content.indexOf('(', match.index);
    const endIndex = findCallEnd(content, openParenthesisIndex);

    if (endIndex === -1) {
      fail(`Could not parse ${router}.${method} call for ${routePath}`);
    }

    const block = content.slice(match.index, endIndex);
    const firstStringArgument = block.match(/\(\s*(['"`])([^'"`]+)\1/);
    if (firstStringArgument?.[2] === routePath) {
      return block;
    }

    match = callPattern.exec(content);
  }

  return null;
}

async function runProtectedRouteCheck() {
  let checkedRouteCount = 0;

  for (const group of routeCheckGroups) {
    const content = await readProjectFile(group.file);

    for (const route of group.routes) {
      const block = routeCallFor(content, {
        router: group.router,
        method: route.method,
        path: route.path,
      });

      if (!block) {
        fail(`Could not find ${group.router}.${route.method}('${route.path}') in ${group.file}`);
      }

      const requiredMiddleware = route.middleware ?? group.middleware ?? [];
      const missingMiddleware = requiredMiddleware.filter(
        (middleware) => !block.includes(middleware),
      );
      if (missingMiddleware.length > 0) {
        fail(
          `${group.router}.${route.method}('${route.path}') in ${group.file} is missing ${missingMiddleware.join(
            ', ',
          )}`,
        );
      }

      checkedRouteCount += 1;
    }
  }

  for (const check of fileLevelRouteChecks) {
    const content = await readProjectFile(check.file);
    const missingText = check.requiredText.filter((text) => !content.includes(text));
    if (missingText.length > 0) {
      fail(`${check.description} in ${check.file} is missing required route guard wiring.`);
    }
  }

  result(
    'routes',
    'PASS',
    `Validated exact guard and rate-limit middleware wiring for ${checkedRouteCount} selected protected route declarations plus platform route group wiring.`,
  );
}

async function runAuditIntegrityCheck() {
  const repository = await readProjectFile('apps/backend/src/repositories/audit-log.repository.ts');
  const tests = await readProjectFile('apps/backend/tests/unit/audit-log.service.test.ts');

  for (const sensitiveKey of ['password', 'token', 'secret']) {
    if (!repository.includes(`'${sensitiveKey}'`)) {
      fail(`Audit sanitiser is missing sensitive key fragment: ${sensitiveKey}`);
    }
  }

  for (const expectation of auditTestExpectations) {
    if (!tests.includes(expectation)) {
      fail(`Audit unit tests are missing expectation: ${expectation}`);
    }
  }

  result(
    'audit',
    'PASS',
    'Validated audit sanitiser key coverage and focused audit integrity unit-test expectations.',
  );
}

async function listEvidenceFiles(relativeDirectory) {
  if (!(await pathExists(relativeDirectory))) {
    return {
      files: [],
      oversizedFiles: [],
    };
  }

  const absoluteDirectory = projectPath(relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  const oversizedFiles = [];

  for (const entry of entries) {
    const relativeEntryPath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      const nested = await listEvidenceFiles(relativeEntryPath);
      files.push(...nested.files);
      oversizedFiles.push(...nested.oversizedFiles);
      continue;
    }

    if (!/\.(json|log|md|txt)$/i.test(entry.name)) {
      continue;
    }

    const info = await stat(projectPath(relativeEntryPath));
    if (info.size <= 512 * 1024) {
      files.push(relativeEntryPath);
    } else {
      oversizedFiles.push(`${relativeEntryPath} (${info.size} bytes)`);
    }
  }

  return {
    files,
    oversizedFiles,
  };
}

async function runSecurityLeakageCheck() {
  const evidenceFileResults = await Promise.all(
    evidenceDirectories.map((directory) => listEvidenceFiles(directory)),
  );
  const files = evidenceFileResults.flatMap((entry) => entry.files);
  const oversizedFiles = evidenceFileResults.flatMap((entry) => entry.oversizedFiles);
  const findings = [];

  if (oversizedFiles.length > 0) {
    fail(`Eligible evidence files exceed the 512 KiB scan limit: ${oversizedFiles.join('; ')}`);
  }

  for (const file of files) {
    const content = await readProjectFile(file);
    for (const { label, pattern } of sensitiveEvidencePatterns) {
      if (pattern.test(content)) {
        findings.push(`${file}: ${label}`);
      }
    }
  }

  if (findings.length > 0) {
    fail(`Potential sensitive value in bounded NFR/test evidence: ${findings.join('; ')}`);
  }

  result(
    'security',
    'PASS',
    files.length === 0
      ? 'No bounded generated NFR/test evidence files are present yet.'
      : `Scanned ${files.length} bounded generated NFR/test evidence files for sensitive-value leakage.`,
  );
}

const checkRunners = {
  traceability: runTraceabilityCheck,
  security: runSecurityLeakageCheck,
  routes: runProtectedRouteCheck,
  audit: runAuditIntegrityCheck,
};

for (const check of checksToRun) {
  const runner = checkRunners[check];
  if (!runner) {
    fail(`Unknown deterministic NFR check: ${check}`);
  }

  await runner();
}

for (const entry of results) {
  console.log(`[${entry.status}] ${entry.check}: ${entry.detail}`);
}
