import { randomInt } from 'node:crypto';
import { env } from '../config/env.js';

export function selectSimulationPublicOrigin(): string | null {
  if (env.SIMULATION_PUBLIC_ORIGINS.length === 0) return null;

  return env.SIMULATION_PUBLIC_ORIGINS[randomInt(env.SIMULATION_PUBLIC_ORIGINS.length)];
}
