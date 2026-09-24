import { useState, type FormEvent } from 'react';
import {
  contentCategories,
  quizQuestionDraftInputSchema,
  type ContentCategoryDto,
  type QuestionTypeDto,
  type QuizAnswerOptionDraftInput,
  type QuizQuestionDraftInput,
} from '@insightful-phish/shared';

import { FormField, SelectField } from '../../components/ui/FormField';

type QuestionEditorDialogProps = Readonly<{
  question: QuizQuestionDraftInput | null;
  position: number;
  onCancel: () => void;
  onSave: (question: QuizQuestionDraftInput) => void;
}>;

type QuestionFormState = {
  id?: string;
  prompt: string;
  questionType: QuestionTypeDto;
  position: number;
  points: number;
  categories: ContentCategoryDto[];
  shuffleOptions: boolean;
  answerOptions: QuizAnswerOptionDraftInput[];
  minSelections: number;
  maxSelections: number;
};

const CONTROL_CLASSES =
  'font-overpass text-[1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full min-w-0 p-2.5 focus:outline-none focus:ring-4 focus:ring-brand-medium';

const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Single choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
];

function categoryLabel(category: ContentCategoryDto): string {
  const words = category.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function optionLabel(index: number): string {
  let value = index + 1;
  let label = '';

  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }

  return label;
}

function normalizeOptionLabels(
  options: QuizAnswerOptionDraftInput[],
): QuizAnswerOptionDraftInput[] {
  return options.map((option, index) => ({
    ...option,
    label: optionLabel(index),
    position: index,
  }));
}

function createForm(question: QuizQuestionDraftInput | null, position: number): QuestionFormState {
  if (!question) {
    return {
      prompt: '',
      questionType: 'SINGLE_CHOICE',
      position,
      points: 1,
      categories: [],
      shuffleOptions: false,
      answerOptions: [],
      minSelections: 1,
      maxSelections: 1,
    };
  }

  return {
    ...(question.id ? { id: question.id } : {}),
    prompt: question.prompt,
    questionType: question.questionType,
    position: question.position,
    points: question.points,
    categories: [...question.categories],
    shuffleOptions: question.shuffleOptions,
    answerOptions: normalizeOptionLabels(question.answerOptions),
    minSelections: question.questionType === 'MULTIPLE_CHOICE' ? question.minSelections : 1,
    maxSelections: question.questionType === 'MULTIPLE_CHOICE' ? question.maxSelections : 1,
  };
}

function QuestionEditorDialog({ question, position, onCancel, onSave }: QuestionEditorDialogProps) {
  const [form, setForm] = useState<QuestionFormState>(() => createForm(question, position));
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, patch: Partial<QuizAnswerOptionDraftInput>) {
    setForm((current) => ({
      ...current,
      answerOptions: current.answerOptions.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
    setError(null);
  }

  function changeQuestionType(value: string) {
    if (value !== 'SINGLE_CHOICE' && value !== 'MULTIPLE_CHOICE') {
      return;
    }

    setForm((current) => {
      if (value === 'MULTIPLE_CHOICE') {
        const correctCount = current.answerOptions.filter((option) => option.isCorrect).length;
        return {
          ...current,
          questionType: value,
          minSelections: 1,
          maxSelections: Math.max(1, Math.min(current.answerOptions.length, correctCount)),
        };
      }

      const firstCorrectIndex = current.answerOptions.findIndex((option) => option.isCorrect);
      return {
        ...current,
        questionType: value,
        answerOptions: current.answerOptions.map((option, index) => ({
          ...option,
          isCorrect: index === firstCorrectIndex && firstCorrectIndex !== -1,
        })),
      };
    });
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const answerOptions = form.answerOptions.map((option, index) => ({
      ...option,
      label: optionLabel(index),
      text: option.text.trim(),
      feedbackText: option.feedbackText?.trim() || null,
      position: index,
    }));

    const common = {
      ...(form.id ? { id: form.id } : {}),
      prompt: form.prompt.trim(),
      position: form.position,
      points: form.points,
      shuffleOptions: form.shuffleOptions,
      categories: [...form.categories],
      answerOptions,
    };

    const candidate: QuizQuestionDraftInput =
      form.questionType === 'SINGLE_CHOICE'
        ? { ...common, questionType: 'SINGLE_CHOICE' }
        : {
            ...common,
            questionType: 'MULTIPLE_CHOICE',
            minSelections: form.minSelections,
            maxSelections: form.maxSelections,
          };

    const result = quizQuestionDraftInputSchema.safeParse(candidate);
    if (!result.success) {
      setError('Check the question fields, answer options, and correct-answer selection.');
      return;
    }

    onSave(result.data);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-editor-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-xl"
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        className="max-h-full w-full max-w-3xl overflow-y-auto border border-default bg-white-purple p-6 shadow-xl"
      >
        <h2 id="question-editor-title" className="font-jost text-2xl font-medium text-purple">
          {question ? 'Edit Question' : 'Add Question'}
        </h2>

        {error && (
          <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-5">
          <FormField id="question-prompt" label="Prompt">
            {(controlProps) => (
              <textarea
                {...controlProps}
                rows={3}
                required
                value={form.prompt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, prompt: event.target.value }))
                }
                className={CONTROL_CLASSES}
              />
            )}
          </FormField>

          <SelectField
            id="question-type"
            label="Question type"
            value={form.questionType}
            options={QUESTION_TYPES}
            onChange={changeQuestionType}
          />

          <FormField id="question-points" label="Points">
            {(controlProps) => (
              <input
                {...controlProps}
                type="number"
                min={1}
                step={1}
                required
                value={Number.isFinite(form.points) ? form.points : ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    points: event.currentTarget.valueAsNumber,
                  }))
                }
                className={CONTROL_CLASSES}
              />
            )}
          </FormField>

          <fieldset>
            <legend className="mb-2 font-jost text-[1.2rem] text-dark-pink">Categories</legend>
            <div className="space-y-2">
              {contentCategories.map((category) => (
                <label key={category} className="flex items-center gap-2 font-overpass text-purple">
                  <input
                    type="checkbox"
                    checked={form.categories.includes(category)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        categories: event.target.checked
                          ? [...current.categories, category]
                          : current.categories.filter((value) => value !== category),
                      }))
                    }
                  />
                  {categoryLabel(category)}
                </label>
              ))}
            </div>
          </fieldset>

          {form.questionType === 'MULTIPLE_CHOICE' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField id="question-min-selections" label="Minimum selections">
                {(controlProps) => (
                  <input
                    {...controlProps}
                    type="number"
                    min={1}
                    step={1}
                    value={Number.isFinite(form.minSelections) ? form.minSelections : ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minSelections: event.currentTarget.valueAsNumber,
                      }))
                    }
                    className={CONTROL_CLASSES}
                  />
                )}
              </FormField>
              <FormField id="question-max-selections" label="Maximum selections">
                {(controlProps) => (
                  <input
                    {...controlProps}
                    type="number"
                    min={1}
                    step={1}
                    value={Number.isFinite(form.maxSelections) ? form.maxSelections : ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxSelections: event.currentTarget.valueAsNumber,
                      }))
                    }
                    className={CONTROL_CLASSES}
                  />
                )}
              </FormField>
            </div>
          )}

          <section aria-label="Answer options" className="space-y-4">
            <h3 className="font-jost text-xl text-purple">Answer options</h3>
            {form.answerOptions.map((option, index) => (
              <div key={index} className="border border-default bg-white p-4">
                <h4 className="mb-3 font-jost text-lg text-purple">Option {index + 1}</h4>

                <div className="grid grid-cols-[auto_1fr] items-end gap-4">
                  <div>
                    <span className="mb-1 block font-overpass text-purple">Label</span>
                    <span
                      aria-label={`Option ${index + 1} label`}
                      className="flex min-h-11 min-w-11 items-center justify-center border border-default bg-faint-purple px-3 font-jost font-semibold text-purple"
                    >
                      {optionLabel(index)}
                    </span>
                  </div>
                  <FormField id={`answer-text-${index}`} label={`Option ${index + 1} text`}>
                    {(controlProps) => (
                      <input
                        {...controlProps}
                        type="text"
                        value={option.text}
                        onChange={(event) => updateOption(index, { text: event.target.value })}
                        className={CONTROL_CLASSES}
                      />
                    )}
                  </FormField>
                </div>

                <FormField id={`answer-feedback-${index}`} label={`Option ${index + 1} feedback`}>
                  {(controlProps) => (
                    <textarea
                      {...controlProps}
                      rows={2}
                      value={option.feedbackText ?? ''}
                      onChange={(event) =>
                        updateOption(index, { feedbackText: event.target.value || null })
                      }
                      className={CONTROL_CLASSES}
                    />
                  )}
                </FormField>

                <label className="mt-3 flex items-center gap-2 font-overpass text-purple">
                  <input
                    type={form.questionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                    name={form.questionType === 'SINGLE_CHOICE' ? 'correct-answer' : undefined}
                    checked={option.isCorrect}
                    onChange={() => {
                      if (form.questionType === 'SINGLE_CHOICE') {
                        setForm((current) => ({
                          ...current,
                          answerOptions: current.answerOptions.map((item, optionIndex) => ({
                            ...item,
                            isCorrect: optionIndex === index,
                          })),
                        }));
                      } else {
                        updateOption(index, { isCorrect: !option.isCorrect });
                      }
                    }}
                  />
                  {form.questionType === 'SINGLE_CHOICE' ? 'Correct answer' : 'Correct option'}
                </label>

                <button
                  type="button"
                  className="mt-3 font-jost text-red-700 underline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      answerOptions: normalizeOptionLabels(
                        current.answerOptions.filter((_, optionIndex) => optionIndex !== index),
                      ),
                    }))
                  }
                >
                  Remove option {index + 1}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="border border-default bg-faint-purple px-4 py-2 font-jost text-purple"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  answerOptions: normalizeOptionLabels([
                    ...current.answerOptions,
                    {
                      label: optionLabel(current.answerOptions.length),
                      text: '',
                      position: current.answerOptions.length,
                      isCorrect: false,
                      feedbackText: null,
                    },
                  ]),
                }))
              }
            >
              Add Answer Option
            </button>
          </section>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-default-medium bg-neutral-secondary-medium px-4 py-2 font-jost text-purple"
          >
            Cancel
          </button>
          <button type="submit" className="bg-main-purple px-4 py-2 font-jost text-white">
            Save Question
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuestionEditorDialog;
