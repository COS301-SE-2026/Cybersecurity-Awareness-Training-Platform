import {
  contentCategories,
  reusableContentGenerationRequestSchema,
  type ContentCategoryDto,
  type DifficultyLevelDto,
  type ReusableContentGenerationRequestDto,
} from '@insightful-phish/shared';
import { useRef, useState, type FormEvent } from 'react';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import { FormField, SelectField } from '../../components/ui/FormField';
import {
  trainingDocumentCategoryLabels,
  trainingDocumentDifficultyOptions,
} from '../training-document-authoring/trainingDocumentAuthoring';

type DisplayScope = 'platform' | 'organisation';

export type GenerateWithAiDialogProps<TResult> = Readonly<{
  scope: DisplayScope;
  onGenerate: (request: ReusableContentGenerationRequestDto) => Promise<TResult>;
  onGenerated: (result: TResult) => void;
  disabled?: boolean;
}>;

type GuidanceForm = {
  topic: string;
  learningObjective: string;
  requestedCategories: ContentCategoryDto[];
  requestedDifficulty: DifficultyLevelDto;
  administratorGuidance: string;
};

type GuidanceField = keyof GuidanceForm;
type GuidanceErrors = Partial<Record<GuidanceField, string>>;

const CONTROL_CLASSES =
  'font-overpass text-[1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full min-w-0 p-2.5 focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:opacity-60 disabled:cursor-not-allowed';

const initialGuidance: GuidanceForm = {
  topic: '',
  learningObjective: '',
  requestedCategories: [],
  requestedDifficulty: 'MEDIUM',
  administratorGuidance: '',
};

const categoryOptions = contentCategories.map((value) => ({
  value,
  label: trainingDocumentCategoryLabels[value],
}));

function validationErrors(value: GuidanceForm): {
  request?: ReusableContentGenerationRequestDto;
  errors: GuidanceErrors;
} {
  const result = reusableContentGenerationRequestSchema.safeParse({
    topic: value.topic,
    learningObjective: value.learningObjective,
    requestedCategories: value.requestedCategories,
    requestedDifficulty: value.requestedDifficulty,
    ...(value.administratorGuidance.trim()
      ? { administratorGuidance: value.administratorGuidance }
      : {}),
  });

  if (result.success) {
    return { request: result.data, errors: {} };
  }

  const errors: GuidanceErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && field in value && !errors[field as GuidanceField]) {
      errors[field as GuidanceField] = issue.message;
    }
  }
  return { errors };
}

function generationErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Content could not be generated. Please try again.';
}

export function GenerateWithAiDialog<TResult>({
  scope,
  onGenerate,
  onGenerated,
  disabled = false,
}: GenerateWithAiDialogProps<TResult>) {
  const [isOpen, setIsOpen] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceForm>(initialGuidance);
  const [errors, setErrors] = useState<GuidanceErrors>({});
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const submissionPending = useRef(false);

  function updateField<Key extends GuidanceField>(field: Key, value: GuidanceForm[Key]) {
    setGuidance((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setGenerationError(null);
  }

  function closeDialog() {
    if (!submissionPending.current) {
      setIsOpen(false);
      setGenerationError(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current) return;

    const validation = validationErrors(guidance);
    setErrors(validation.errors);
    if (!validation.request) return;

    submissionPending.current = true;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await onGenerate(validation.request);
      onGenerated(result);
      setIsOpen(false);
      setGuidance(initialGuidance);
      setErrors({});
    } catch (error) {
      setGenerationError(generationErrorMessage(error));
    } finally {
      submissionPending.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 border border-default bg-faint-purple px-4 py-2 font-jost text-purple disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-icons-sharp" aria-hidden="true">
          auto_awesome
        </span>
        Generate with AI
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-generation-dialog-title"
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xl"
        >
          <form
            noValidate
            onSubmit={submit}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden border border-default bg-white-purple shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-default p-5">
              <h2
                id="ai-generation-dialog-title"
                className="font-jost text-2xl font-medium text-purple"
              >
                Generate with AI
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isGenerating}
                className="inline-flex h-9 w-9 items-center justify-center text-purple disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-icons-sharp" aria-hidden="true">
                  close
                </span>
                <span className="sr-only">Close generation dialog</span>
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              {scope === 'organisation' && (
                <p className="border border-default bg-faint-purple p-3 font-overpass text-purple">
                  Approved organisation context may be used to tailor generated content.
                </p>
              )}

              {generationError && (
                <p role="alert" className="border border-red-200 bg-red-50 p-3 text-red-800">
                  {generationError}
                </p>
              )}

              <FormField id="ai-generation-topic" label="Topic" errorText={errors.topic}>
                {(controlProps) => (
                  <input
                    {...controlProps}
                    type="text"
                    maxLength={200}
                    disabled={isGenerating}
                    value={guidance.topic}
                    onChange={(event) => updateField('topic', event.target.value)}
                    className={CONTROL_CLASSES}
                  />
                )}
              </FormField>

              <FormField
                id="ai-generation-objective"
                label="Learning objective"
                errorText={errors.learningObjective}
              >
                {(controlProps) => (
                  <textarea
                    {...controlProps}
                    rows={4}
                    maxLength={1000}
                    disabled={isGenerating}
                    value={guidance.learningObjective}
                    onChange={(event) => updateField('learningObjective', event.target.value)}
                    className={CONTROL_CLASSES}
                  />
                )}
              </FormField>

              <fieldset disabled={isGenerating}>
                <legend className="mb-2 font-jost text-[1.2rem] text-dark-pink">Categories</legend>
                <div className="space-y-2">
                  {categoryOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 font-overpass text-purple"
                    >
                      <input
                        type="checkbox"
                        checked={guidance.requestedCategories.includes(option.value)}
                        onChange={(event) =>
                          updateField(
                            'requestedCategories',
                            event.target.checked
                              ? [...guidance.requestedCategories, option.value]
                              : guidance.requestedCategories.filter(
                                  (category) => category !== option.value,
                                ),
                          )
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {errors.requestedCategories && (
                  <p role="alert" className="mt-1 font-jost font-medium text-red-600">
                    {errors.requestedCategories}
                  </p>
                )}
              </fieldset>

              <SelectField
                id="ai-generation-difficulty"
                label="Difficulty"
                value={guidance.requestedDifficulty}
                options={trainingDocumentDifficultyOptions}
                disabled={isGenerating}
                errorText={errors.requestedDifficulty}
                onChange={(value) => {
                  if (value === 'EASY' || value === 'MEDIUM' || value === 'HARD') {
                    updateField('requestedDifficulty', value);
                  }
                }}
              />

              <FormField
                id="ai-generation-guidance"
                label="Administrator guidance (optional)"
                errorText={errors.administratorGuidance}
              >
                {(controlProps) => (
                  <textarea
                    {...controlProps}
                    rows={4}
                    maxLength={2000}
                    disabled={isGenerating}
                    value={guidance.administratorGuidance}
                    onChange={(event) => updateField('administratorGuidance', event.target.value)}
                    className={CONTROL_CLASSES}
                  />
                )}
              </FormField>
            </div>

            <footer className="flex justify-end gap-3 border-t border-default p-5">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isGenerating}
                className="border border-default-medium bg-neutral-secondary-medium px-4 py-2 font-jost text-purple disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex min-w-40 items-center justify-center bg-main-purple px-4 py-2 font-jost text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating && <LoadingSpinnerSVG />}
                {isGenerating
                  ? 'Generating...'
                  : generationError
                    ? 'Retry generation'
                    : 'Generate draft'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
