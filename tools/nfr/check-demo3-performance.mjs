import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  DEMO4_AUTHENTICATED_PERFORMANCE_ROUTES,
  PERFORMANCE_WORKLOAD,
  environmentValueForDemo,
} from './nfr-config.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
const args = new Set(process.argv.slice(2));
const demoVersion = args.has('--demo3') ? 'demo3' : 'demo4';
const demoLabel = demoVersion === 'demo3' ? 'Demo 3' : 'Demo 4';
const environmentPrefix = demoVersion === 'demo3' ? 'DEMO3_NFR' : 'DEMO4_NFR';

function environmentValue(name) {
  return environmentValueForDemo(process.env, demoVersion, name);
}

const defaultBackendUrl = 'http://localhost:4000';
const defaultFrontendUrl = 'http://localhost:5173';
const requestCount = Number.parseInt(
  environmentValue('PERF_REQUESTS') ?? String(PERFORMANCE_WORKLOAD.requestCount),
  10,
);
const concurrency = Number.parseInt(
  environmentValue('PERF_CONCURRENCY') ?? String(PERFORMANCE_WORKLOAD.concurrency),
  10,
);
const timeoutMs = Number.parseInt(
  environmentValue('PERF_TIMEOUT_MS') ?? String(PERFORMANCE_WORKLOAD.timeoutMs),
  10,
);
const p95TargetMs = Number.parseInt(
  environmentValue('PERF_P95_TARGET_MS') ?? String(PERFORMANCE_WORKLOAD.p95TargetMs),
  10,
);
const errorRateTarget = Number.parseFloat(
  environmentValue('PERF_ERROR_RATE_TARGET') ?? String(PERFORMANCE_WORKLOAD.errorRateTarget),
);
const backendBaseUrl = withoutTrailingSlash(environmentValue('BACKEND_URL') ?? defaultBackendUrl);
const frontendBaseUrl = withoutTrailingSlash(
  environmentValue('FRONTEND_URL') ?? defaultFrontendUrl,
);
const authToken = environmentValue('AUTH_TOKEN');
const organisationId = environmentValue('ORGANISATION_ID');

const dryRun = args.has('--dry-run');
const publicSmoke = args.has('--public-smoke');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputArg ? outputArg.slice('--output='.length) : null;

const authenticatedRouteSet = DEMO4_AUTHENTICATED_PERFORMANCE_ROUTES.map((route) => ({
  ...route,
  path: route.path.replace(
    '{organisationId}',
    organisationId ?? `<${environmentPrefix}_ORGANISATION_ID>`,
  ),
  authentication: 'bearer-token',
  expectedStatus: 200,
  requiresOrganisationId: route.path.includes('{organisationId}'),
}));

const publicRouteSet = [
  {
    id: 'backend-health',
    method: 'GET',
    path: '/health',
    authentication: 'none',
    expectedStatus: 200,
    baseUrl: backendBaseUrl,
  },
  {
    id: 'frontend-login',
    method: 'GET',
    path: '/login',
    authentication: 'none',
    expectedStatus: 200,
    baseUrl: frontendBaseUrl,
  },
  {
    id: 'frontend-register',
    method: 'GET',
    path: '/register',
    authentication: 'none',
    expectedStatus: 200,
    baseUrl: frontendBaseUrl,
  },
  {
    id: 'frontend-forgot-password',
    method: 'GET',
    path: '/forgot-password',
    authentication: 'none',
    expectedStatus: 200,
    baseUrl: frontendBaseUrl,
  },
];

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function validatePositiveInteger(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

function validateThresholds() {
  validatePositiveInteger(`${environmentPrefix}_PERF_REQUESTS`, requestCount);
  validatePositiveInteger(`${environmentPrefix}_PERF_CONCURRENCY`, concurrency);
  validatePositiveInteger(`${environmentPrefix}_PERF_TIMEOUT_MS`, timeoutMs);
  validatePositiveInteger(`${environmentPrefix}_PERF_P95_TARGET_MS`, p95TargetMs);

  if (!Number.isFinite(errorRateTarget) || errorRateTarget < 0 || errorRateTarget > 1) {
    throw new Error(`${environmentPrefix}_PERF_ERROR_RATE_TARGET must be between 0 and 1.`);
  }
}

function selectedRouteSet() {
  return publicSmoke ? publicRouteSet : authenticatedRouteSet;
}

function printEffectiveConfiguration() {
  console.log(
    JSON.stringify(
      {
        mode: demoVersion,
        backendBaseUrl,
        frontendBaseUrl,
        routeCount: selectedRouteSet().length,
        routes: selectedRouteSet().map(({ id, method, path: routePath }) => ({
          id,
          method,
          path: routePath,
        })),
        requestCount,
        concurrency,
        timeoutMs,
        p95TargetMs,
        errorRateTarget,
        organisationId: organisationId ?? null,
      },
      null,
      2,
    ),
  );
}

function routeUrl(route) {
  return `${route.baseUrl ?? backendBaseUrl}${route.path}`;
}

function assertAuthenticatedEnvironment() {
  if (publicSmoke || dryRun) {
    return;
  }

  const missing = [];
  if (!authToken) {
    missing.push(`${environmentPrefix}_AUTH_TOKEN`);
  }

  if (!organisationId) {
    missing.push(`${environmentPrefix}_ORGANISATION_ID`);
  }

  if (missing.length > 0) {
    throw new Error(
      `Authenticated ${demoLabel} performance smoke requires ${missing.join(
        ', ',
      )}. Seed the local ${demoLabel} data, log in as an organisation admin with campaign-assignment access, and provide a short-lived local bearer token.`,
    );
  }
}

function percentile(values, percentileRank) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileRank / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

async function timedFetch(route) {
  const startedAt = performance.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const headers =
      route.authentication === 'bearer-token'
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : undefined;
    const response = await fetch(routeUrl(route), {
      method: route.method,
      headers,
      signal: abortController.signal,
    });
    await response.arrayBuffer();
    const durationMs = performance.now() - startedAt;

    return {
      durationMs,
      ok: response.status === route.expectedStatus,
      status: response.status,
    };
  } catch (error) {
    return {
      durationMs: performance.now() - startedAt,
      ok: false,
      status: null,
      error: error instanceof Error ? error.name : 'UnknownError',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runRoute(route) {
  const attempts = [];
  let nextAttempt = 0;

  async function worker() {
    while (nextAttempt < requestCount) {
      nextAttempt += 1;
      attempts.push(await timedFetch(route));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, requestCount) }, async () => {
      await worker();
    }),
  );

  const durations = attempts.map((attempt) => attempt.durationMs);
  const failures = attempts.filter((attempt) => !attempt.ok);
  const p95Ms = percentile(durations, 95);
  const errorRate = failures.length / attempts.length;

  return {
    ...route,
    url: routeUrl(route),
    requestCount,
    concurrency,
    timeoutMs,
    p95Ms: Math.round(p95Ms),
    errorRate: Number(errorRate.toFixed(4)),
    passed: p95Ms <= p95TargetMs && errorRate <= errorRateTarget,
    failures: failures.map((failure) => ({
      status: failure.status,
      error: failure.error,
    })),
  };
}

async function writeJsonOutput(report) {
  if (!outputPath) {
    return;
  }

  const absoluteOutputPath = path.resolve(projectRoot, outputPath);
  await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await writeFile(`${absoluteOutputPath}`, `${JSON.stringify(report, null, 2)}\n`);
}

function buildDryRunReport() {
  const routes = selectedRouteSet();

  return {
    check: `${demoVersion}-performance`,
    mode: 'dry-run',
    environment: {
      backendBaseUrl,
      frontendBaseUrl,
      requestCount,
      concurrency,
      timeoutMs,
      p95TargetMs,
      errorRateTarget,
      authenticationContext: publicSmoke
        ? 'none'
        : `requires short-lived local bearer token for a seeded ${demoLabel} organisation admin`,
      seededData: publicSmoke
        ? 'not required'
        : `requires ${environmentPrefix}_ORGANISATION_ID for the seeded organisation under test`,
    },
    routeSet: routes.map((route) => ({ ...route, url: routeUrl(route) })),
    passed: true,
  };
}

async function main() {
  validateThresholds();
  assertAuthenticatedEnvironment();
  printEffectiveConfiguration();

  if (dryRun) {
    const report = buildDryRunReport();
    await writeJsonOutput(report);
    console.log(
      `[PASS] ${demoLabel} performance dry-run: ${selectedRouteSet().length} ${
        publicSmoke ? 'public/static' : 'authenticated seeded API'
      } routes configured with ${requestCount} requests, concurrency ${concurrency}, timeout ${timeoutMs}ms, p95 <= ${p95TargetMs}ms, and error rate <= ${errorRateTarget}.`,
    );
    return;
  }

  const routeResults = [];
  const routes = selectedRouteSet();

  for (const route of routes) {
    routeResults.push(await runRoute(route));
  }

  const failedRoutes = routeResults.filter((route) => !route.passed);
  const report = {
    check: `${demoVersion}-performance`,
    mode: 'local-smoke',
    environment: {
      backendBaseUrl,
      frontendBaseUrl,
      requestCount,
      concurrency,
      timeoutMs,
      p95TargetMs,
      errorRateTarget,
      authenticationContext: publicSmoke
        ? 'none'
        : `short-lived local bearer token for a seeded ${demoLabel} organisation admin`,
      seededData: publicSmoke ? 'not required' : `seeded organisation ${organisationId}`,
    },
    routeResults,
    passed: failedRoutes.length === 0,
  };

  await writeJsonOutput(report);

  for (const route of routeResults) {
    const status = route.passed ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] ${route.id}: p95=${route.p95Ms}ms errorRate=${route.errorRate} auth=${route.authentication}`,
    );
  }

  if (failedRoutes.length > 0) {
    throw new Error(
      `${demoLabel} performance smoke check failed for: ${failedRoutes
        .map((route) => route.id)
        .join(', ')}`,
    );
  }
}

await main();
