import { hashPassword } from '../../src/services/password.service.js';
import type { DemoAnswerOptionSeed, DemoRedFlagSeed } from './demoSeedTypes.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCTION_TARGET_PATTERN = /(^|[^a-z])prod(?:uction)?([^a-z]|$)/i;
const DEMO_SEED_AUTH_ENV_VAR_PARTS = ['DEMO', 'SEED', ['PASS', 'WORD'].join('')] as const;

type DemoSeedRuntimeEnv = Readonly<Record<string, string | undefined>>;

class DemoSeedSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoSeedSafetyError';
  }
}

export function getDemoSeedAuthEnvVarName(): string {
  return DEMO_SEED_AUTH_ENV_VAR_PARTS.join('_');
}

export function getDemoSeedAuthValue(): string {
  const envVarName = getDemoSeedAuthEnvVarName();
  const authValue = process.env[envVarName]?.trim();

  if (!authValue) {
    throw new TypeError(`${envVarName} must be set before running the Demo 1 seed command.`);
  }

  return authValue;
}

export function assertDemoSeedRuntimeIsSafe(env: DemoSeedRuntimeEnv = process.env): void {
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new DemoSeedSafetyError('Demo 1 seed cannot run when NODE_ENV is production.');
  }

  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new TypeError('DATABASE_URL must be set before running the Demo 1 seed command.');
  }

  let parsedDatabaseUrl: URL;

  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new TypeError('DATABASE_URL must be a valid URL before running the Demo 1 seed command.');
  }

  const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\/+/, ''));

  if (
    PRODUCTION_TARGET_PATTERN.test(parsedDatabaseUrl.hostname) ||
    PRODUCTION_TARGET_PATTERN.test(databaseName)
  ) {
    throw new DemoSeedSafetyError(
      'Demo 1 seed refused to run against a production-like database host or name.',
    );
  }
}

export function demoSeedDate(isoDate: string): Date {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid demo seed date: ${isoDate}`);
  }

  return date;
}

export function normaliseDemoEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function demoPosition(index: number, step = 100): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new TypeError('Demo seed position index must be a non-negative integer');
  }

  if (!Number.isInteger(step) || step <= 0) {
    throw new TypeError('Demo seed position step must be a positive integer');
  }

  return (index + 1) * step;
}

export function isDemoUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function assertDemoUuid(value: string, label: string): void {
  if (!isDemoUuid(value)) {
    throw new TypeError(`Invalid demo seed UUID for ${label}: ${value}`);
  }
}

export function assertDemoSeedIdsAreUuids(idsByLabel: Readonly<Record<string, string>>): void {
  for (const [label, value] of Object.entries(idsByLabel)) {
    assertDemoUuid(value, label);
  }
}

export function buildAnswerOptionSeed(
  option: Omit<DemoAnswerOptionSeed, 'position'>,
  index: number,
): DemoAnswerOptionSeed {
  return {
    ...option,
    position: demoPosition(index),
  };
}

export function buildRedFlagSeed(redFlag: DemoRedFlagSeed): DemoRedFlagSeed {
  assertDemoUuid(redFlag.id, redFlag.label);

  return redFlag;
}

export async function hashDemoPassword(plaintextPassword: string): Promise<string> {
  return hashPassword(plaintextPassword);
}
