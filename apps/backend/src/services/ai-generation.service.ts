import type { z } from 'zod';
import { createCloudflareWorkersAiProvider } from './cloudflare-workers-ai.provider.js';
import type {
  AiGenerationProvider,
  StructuredGenerationRequest,
} from './ai-generation-provider.js';

export type StructuredOutputValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export class AiStructuredOutputValidationError extends Error {
  constructor(readonly issues: StructuredOutputValidationIssue[]) {
    super('AI provider output did not match the requested application schema');
    this.name = 'AiStructuredOutputValidationError';
  }
}

export class AiGenerationService {
  constructor(private readonly provider: AiGenerationProvider) {}

  async generateStructured<T>(
    request: StructuredGenerationRequest,
    expectedSchema: z.ZodType<T>,
  ): Promise<T> {
    const generated = await this.provider.generateStructured(request);
    const validation = expectedSchema.safeParse(generated.output);

    if (!validation.success) {
      throw new AiStructuredOutputValidationError(
        validation.error.issues.map((issue) => ({
          path: [...issue.path],
          message: issue.message,
        })),
      );
    }

    return validation.data;
  }
}

export function createAiGenerationService(): AiGenerationService {
  return new AiGenerationService(createCloudflareWorkersAiProvider());
}
