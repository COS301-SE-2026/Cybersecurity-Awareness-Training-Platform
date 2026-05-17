import { hashPassword } from '../../src/services/password.service.js';
import type { DemoAnswerOptionSeed, DemoRedFlagSeed } from './demoSeedTypes.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
