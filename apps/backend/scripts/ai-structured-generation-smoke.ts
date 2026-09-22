import { z } from 'zod';
import { AiProviderConfigurationError } from '../src/config/ai-provider.js';
import {
  AiStructuredOutputValidationError,
  createAiGenerationService,
} from '../src/services/ai-generation.service.js';
import type { AiGenerationService } from '../src/services/ai-generation.service.js';
import { AiGenerationProviderError } from '../src/services/ai-generation-provider.js';

const smokeResultSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(300),
    category: z.string().trim().min(1).max(80),
  })
  .strict();

const smokeJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 100 },
    summary: { type: 'string', minLength: 1, maxLength: 300 },
    category: { type: 'string', minLength: 1, maxLength: 80 },
  },
  required: ['title', 'summary', 'category'],
} as const;

async function runSmokeProbe(service: AiGenerationService): Promise<void> {
  const result = await service.generateStructured(
    {
      systemInstruction:
        'Return a concise structured description of a fictional educational topic. Follow the supplied JSON schema exactly.',
      userInstruction:
        'Describe a short fictional lesson about identifying suspicious messages. Do not include personal information.',
      output: {
        name: 'ai_provider_smoke_result',
        description: 'A small non-domain result used to verify structured generation.',
        schema: smokeJsonSchema,
      },
      options: {
        temperature: 0.2,
        maxOutputTokens: 250,
      },
    },
    smokeResultSchema,
  );

  console.log('Structured AI generation smoke probe succeeded.');
  console.log(JSON.stringify(result, null, 2));
}

function reportFailure(error: unknown): void {
  if (error instanceof AiProviderConfigurationError) {
    console.error('Structured AI generation smoke probe failed: provider is not configured.');
    return;
  }

  if (error instanceof AiGenerationProviderError) {
    console.error('Structured AI generation smoke probe failed at the provider boundary.', {
      failureKind: error.failureKind,
      retryable: error.retryable,
    });
    return;
  }

  if (error instanceof AiStructuredOutputValidationError) {
    console.error('Structured AI generation smoke probe failed application validation.', {
      issues: error.issues,
    });
    return;
  }

  console.error('Structured AI generation smoke probe failed unexpectedly.');
}

async function main(): Promise<void> {
  try {
    await runSmokeProbe(createAiGenerationService());
  } catch (error) {
    reportFailure(error);
    process.exitCode = 1;
  }
}

void main();
