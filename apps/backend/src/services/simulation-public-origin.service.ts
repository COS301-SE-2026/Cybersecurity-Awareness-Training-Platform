import { randomInt } from 'node:crypto';
import { env } from '../config/env.js';

export function selectSimulationPublicOrigin(): string | null {
  if (env.SIMULATION_PUBLIC_ORIGINS.length === 0) return null;

  return env.SIMULATION_PUBLIC_ORIGINS[randomInt(env.SIMULATION_PUBLIC_ORIGINS.length)];
}

export function isRequestHostForPublicOrigin(
  requestHostname: unknown,
  publicOrigin: string,
): boolean {
  const hostname = normalizeSimulationRequestHostname(requestHostname);
  if (hostname === null || typeof publicOrigin !== 'string') return false;

  try {
    const origin = new URL(publicOrigin);
    return (
      (origin.protocol === 'https:' || origin.protocol === 'http:') &&
      origin.username === '' &&
      origin.password === '' &&
      origin.pathname === '/' &&
      origin.search === '' &&
      origin.hash === '' &&
      origin.origin === publicOrigin &&
      origin.hostname === hostname
    );
  } catch {
    return false;
  }
}

export function normalizeSimulationRequestHostname(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return null;

  try {
    const parsed = new URL(`http://${value}`);
    if (
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.port !== '' ||
      parsed.pathname !== '/' ||
      parsed.search !== '' ||
      parsed.hash !== '' ||
      parsed.hostname.toLowerCase() !== value.toLowerCase()
    ) {
      return null;
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}
