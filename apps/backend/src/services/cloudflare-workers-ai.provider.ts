import {
  getCloudflareWorkersAiConfig,
  type CloudflareWorkersAiConfig,
} from '../config/ai-provider.js';
import {
  AiGenerationProviderError,
  type AiGenerationProvider,
  type StructuredGenerationRequest,
  type StructuredGenerationResult,
} from './ai-generation-provider.js';

type FetchImplementation = typeof fetch;

type CloudflareMessage = {
  role: 'system' | 'user';
  content: string;
};

type CloudflareStructuredRequest = {
  messages: CloudflareMessage[];
  response_format: {
    type: 'json_schema';
    json_schema: {
      name: string;
      description?: string;
      schema: Readonly<Record<string, unknown>>;
    };
  };
  temperature?: number;
  max_tokens?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRequest(request: StructuredGenerationRequest): void {
  if (
    request.systemInstruction.trim().length === 0 ||
    request.userInstruction.trim().length === 0 ||
    request.output.name.trim().length === 0 ||
    !isRecord(request.output.schema)
  ) {
    throw new AiGenerationProviderError(
      'Structured generation request is invalid',
      'INVALID_REQUEST',
      false,
    );
  }

  const { temperature, maxOutputTokens } = request.options ?? {};
  if (temperature !== undefined && !Number.isFinite(temperature)) {
    throw new AiGenerationProviderError(
      'Structured generation temperature must be finite',
      'INVALID_REQUEST',
      false,
    );
  }
  if (
    maxOutputTokens !== undefined &&
    (!Number.isInteger(maxOutputTokens) || maxOutputTokens <= 0)
  ) {
    throw new AiGenerationProviderError(
      'Structured generation output token limit must be a positive integer',
      'INVALID_REQUEST',
      false,
    );
  }
}

function buildEndpoint(config: CloudflareWorkersAiConfig): string {
  const accountId = encodeURIComponent(config.accountId);
  const modelPath = config.model
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  if (modelPath.length === 0) {
    throw new AiGenerationProviderError(
      'Cloudflare Workers AI model is invalid',
      'INVALID_REQUEST',
      false,
    );
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelPath}`;
}

function buildRequestBody(request: StructuredGenerationRequest): CloudflareStructuredRequest {
  return {
    messages: [
      { role: 'system', content: request.systemInstruction },
      { role: 'user', content: request.userInstruction },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: request.output.name,
        ...(request.output.description ? { description: request.output.description } : {}),
        schema: request.output.schema,
      },
    },
    ...(request.options?.temperature !== undefined
      ? { temperature: request.options.temperature }
      : {}),
    ...(request.options?.maxOutputTokens !== undefined
      ? { max_tokens: request.options.maxOutputTokens }
      : {}),
  };
}

function translateHttpFailure(status: number): AiGenerationProviderError {
  if (status === 429) {
    return new AiGenerationProviderError(
      'AI provider rate limit was reached',
      'RATE_LIMITED',
      true,
    );
  }

  if (status === 408 || status >= 500) {
    return new AiGenerationProviderError(
      `AI provider is temporarily unavailable (HTTP ${status})`,
      'PROVIDER_UNAVAILABLE',
      true,
    );
  }

  return new AiGenerationProviderError(
    `AI provider rejected the request (HTTP ${status})`,
    'INVALID_REQUEST',
    false,
  );
}

function extractStructuredContent(envelope: unknown): string {
  if (!isRecord(envelope)) {
    throw invalidResponseError();
  }

  const result = envelope.result;
  if (!isRecord(result) || !Array.isArray(result.choices) || result.choices.length === 0) {
    throw invalidResponseError();
  }

  const firstChoice: unknown = result.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw invalidResponseError();
  }

  const content = firstChoice.message.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw invalidResponseError();
  }

  return content;
}

function invalidResponseError(cause?: unknown): AiGenerationProviderError {
  return new AiGenerationProviderError(
    'AI provider returned an invalid structured response',
    'INVALID_RESPONSE',
    true,
    cause === undefined ? undefined : { cause },
  );
}

function parseStructuredContent(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    throw invalidResponseError(error);
  }
}

export class CloudflareWorkersAiProvider implements AiGenerationProvider {
  constructor(
    private readonly config: CloudflareWorkersAiConfig,
    private readonly fetchImplementation: FetchImplementation = globalThis.fetch,
  ) {}

  async generateStructured(
    request: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult> {
    validateRequest(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImplementation(buildEndpoint(this.config), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildRequestBody(request)),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw translateHttpFailure(response.status);
      }

      let envelope: unknown;
      try {
        envelope = await response.json();
      } catch (error) {
        throw invalidResponseError(error);
      }

      const content = extractStructuredContent(envelope);
      return { output: parseStructuredContent(content) };
    } catch (error) {
      if (error instanceof AiGenerationProviderError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new AiGenerationProviderError('AI provider request timed out', 'TIMEOUT', true, {
          cause: error,
        });
      }

      throw new AiGenerationProviderError(
        'AI provider request failed',
        'PROVIDER_UNAVAILABLE',
        true,
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createCloudflareWorkersAiProvider(): AiGenerationProvider {
  return new CloudflareWorkersAiProvider(getCloudflareWorkersAiConfig());
}
