import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');

const defaultBackendUrl = 'http://localhost:4000';
const defaultFrontendUrl = 'http://localhost:5173';
const requestCount = Number.parseInt(process.env.DEMO3_NFR_PERF_REQUESTS ?? '10', 10);
const p95TargetMs = Number.parseInt(process.env.DEMO3_NFR_PERF_P95_TARGET_MS ?? '2000', 10);
const errorRateTarget = Number.parseFloat(process.env.DEMO3_NFR_PERF_ERROR_RATE_TARGET ?? '0.01');
const backendBaseUrl = withoutTrailingSlash(process.env.DEMO3_NFR_BACKEND_URL ?? defaultBackendUrl);
const frontendBaseUrl = withoutTrailingSlash(
  process.env.DEMO3_NFR_FRONTEND_URL ?? defaultFrontendUrl,
);

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputArg ? outputArg.slice('--output='.length) : null;

const routeSet = [
  {
    id: 'backend-health',
    method: 'GET',
    url: `${backendBaseUrl}/health`,
    authentication: 'none',
    expectedStatus: 200,
  },
  {
    id: 'frontend-login',
    method: 'GET',
    url: `${frontendBaseUrl}/login`,
    authentication: 'none',
    expectedStatus: 200,
  },
  {
    id: 'frontend-register',
    method: 'GET',
    url: `${frontendBaseUrl}/register`,
    authentication: 'none',
    expectedStatus: 200,
  },
  {
    id: 'frontend-forgot-password',
    method: 'GET',
    url: `${frontendBaseUrl}/forgot-password`,
    authentication: 'none',
    expectedStatus: 200,
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
  validatePositiveInteger('DEMO3_NFR_PERF_REQUESTS', requestCount);
  validatePositiveInteger('DEMO3_NFR_PERF_P95_TARGET_MS', p95TargetMs);

  if (!Number.isFinite(errorRateTarget) || errorRateTarget < 0 || errorRateTarget > 1) {
    throw new Error('DEMO3_NFR_PERF_ERROR_RATE_TARGET must be between 0 and 1.');
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

  try {
    const response = await fetch(route.url, { method: route.method });
    const durationMs = performance.now() - startedAt;
    await response.arrayBuffer();

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
  }
}

async function runRoute(route) {
  const attempts = [];

  for (let index = 0; index < requestCount; index += 1) {
    attempts.push(await timedFetch(route));
  }

  const durations = attempts.map((attempt) => attempt.durationMs);
  const failures = attempts.filter((attempt) => !attempt.ok);
  const p95Ms = percentile(durations, 95);
  const errorRate = failures.length / attempts.length;

  return {
    ...route,
    requestCount,
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
  return {
    check: 'demo3-performance',
    mode: 'dry-run',
    environment: {
      backendBaseUrl,
      frontendBaseUrl,
      requestCount,
      p95TargetMs,
      errorRateTarget,
    },
    routeSet,
    passed: true,
  };
}

async function main() {
  validateThresholds();

  if (dryRun) {
    const report = buildDryRunReport();
    await writeJsonOutput(report);
    console.log(
      `[PASS] performance dry-run: ${routeSet.length} routes configured with p95 <= ${p95TargetMs}ms and error rate <= ${errorRateTarget}.`,
    );
    return;
  }

  const routeResults = [];

  for (const route of routeSet) {
    routeResults.push(await runRoute(route));
  }

  const failedRoutes = routeResults.filter((route) => !route.passed);
  const report = {
    check: 'demo3-performance',
    mode: 'local-smoke',
    environment: {
      backendBaseUrl,
      frontendBaseUrl,
      requestCount,
      p95TargetMs,
      errorRateTarget,
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
      `Demo 3 performance smoke check failed for: ${failedRoutes
        .map((route) => route.id)
        .join(', ')}`,
    );
  }
}

await main();
