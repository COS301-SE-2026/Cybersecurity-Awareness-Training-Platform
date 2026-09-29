import { env } from './env.js';

export type CloudflareWorkersAiConfig = {
  accountId: string;
  apiToken: string;
  model: string;
  timeoutMs: number;
};

export class AiProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderConfigurationError';
  }
}

/**
 * Resolves provider credentials only when an AI workflow is invoked. This keeps
 * the integration optional for deployments that do not enable AI features.
 */
export function getCloudflareWorkersAiConfig(): CloudflareWorkersAiConfig {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_WORKERS_AI_API_TOKEN) {
    throw new AiProviderConfigurationError('Cloudflare Workers AI is not configured');
  }

  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_WORKERS_AI_API_TOKEN,
    model: env.CLOUDFLARE_AI_MODEL,
    timeoutMs: env.CLOUDFLARE_AI_TIMEOUT_MS,
  };
}
