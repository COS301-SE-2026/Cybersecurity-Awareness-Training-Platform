import {
  createAiTrainingDocumentGenerationService,
  TrainingDocumentGenerationError,
} from '../src/services/ai-training-document-generation.service.js';
import { ReusableContentGenerationInputError } from '../src/services/ai-content-generation-contracts.js';
import { AiStructuredOutputValidationError } from '../src/services/ai-generation.service.js';
import { AiGenerationProviderError } from '../src/services/ai-generation-provider.js';
import { AiProviderConfigurationError } from '../src/config/ai-provider.js';

async function main(): Promise<void> {
  try {
    const draft = await createAiTrainingDocumentGenerationService().generateDraft({
      requestedDifficulty: 'EASY',
      requestedCategories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
      topic: 'Recognising suspicious messages',
      learningObjective:
        'Help a new learner identify common warning signs and choose a safe response.',
      administratorGuidance: 'Use concise examples and practical defensive steps.',
    });

    console.log('AI Training Document smoke probe succeeded.', {
      title: draft.title,
      contentSummary: draft.contentSummary,
      estimatedReadTimeMinutes: draft.estimatedReadTimeMinutes,
      categories: draft.categories,
      difficultyLevel: draft.difficultyLevel,
      markdownLength: draft.rawMarkdown.length,
    });
  } catch (error) {
    if (error instanceof AiProviderConfigurationError) {
      console.error('AI Training Document smoke probe failed: provider is not configured.');
    } else if (error instanceof AiGenerationProviderError) {
      console.error('AI Training Document smoke probe failed at the provider boundary.', {
        failureKind: error.failureKind,
        retryable: error.retryable,
      });
    } else if (error instanceof AiStructuredOutputValidationError) {
      console.error('AI Training Document smoke probe returned an invalid Draft.', {
        issues: error.issues,
      });
    } else if (error instanceof ReusableContentGenerationInputError) {
      console.error('AI Training Document smoke probe used invalid generation input.', {
        issues: error.issues,
      });
    } else if (error instanceof TrainingDocumentGenerationError) {
      console.error('AI Training Document smoke probe returned mismatched constraints.', {
        failure: error.failure,
      });
    } else {
      console.error('AI Training Document smoke probe failed unexpectedly.');
    }

    process.exitCode = 1;
  }
}

void main();
