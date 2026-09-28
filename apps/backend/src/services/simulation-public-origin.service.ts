import { randomInt } from 'node:crypto';
import type { Request } from 'express';
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

export function resolveSimulationRequestHostname(request: Request): string | null {
  let hostCount = 0;
  let forwardedHostCount = 0;

  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index]?.toLowerCase();
    if (name !== 'host' && name !== 'x-forwarded-host') continue;

    const value = request.rawHeaders[index + 1];
    if (typeof value !== 'string' || value.includes(',')) return null;

    if (name === 'host') hostCount += 1;
    else forwardedHostCount += 1;
  }

  if (hostCount !== 1 || forwardedHostCount > 1) return null;
  return normalizeSimulationRequestHostname(request.hostname);
}
