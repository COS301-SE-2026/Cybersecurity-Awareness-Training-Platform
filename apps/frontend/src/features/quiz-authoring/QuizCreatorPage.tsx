import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type {
  AdminQuizResponseDto,
  DifficultyLevelDto,
  QuizDraftInput,
  QuizQuestionDraftInput,
  ReusableContentGenerationRequestDto,
} from '@insightful-phish/shared';
import { difficultyLevels } from '@insightful-phish/shared';

import BasicAlert from '../../components/alerts/BasicAlert';
import AppLayout from '../../components/layout/AppLayout';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import { FormField, SelectField } from '../../components/ui/FormField';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../lib/apiClient';
import { GenerateWithAiDialog } from '../ai-generation/GenerateWithAiDialog';
import {
  readAiBuilderNavigationIntent,
  readAiBuilderReturnTo,
  readQuizPrefill,
} from '../ai-generation/aiBuilderNavigation';
import {
  generateOrganisationContentVariant,
  generateQuizDraft,
} from '../ai-generation/aiBuilderGenerationClient';
import {
  VariantQualityReview,
  type VariantQualityReviewState,
} from '../ai-generation/VariantQualityReview';
import {
  activateQuiz,
  copyQuiz,
  createQuizDraft,
  getQuizForAuthoring,
  updateQuizDraft,
  type QuizAuthoringScope,
} from './quizAuthoringClient';
import QuestionEditorDialog from './QuestionEditorDialog';

type QuizCreatorPageProps = Readonly<{
  contextKind: QuizAuthoringScope['kind'];
}>;

const CONTROL_CLASSES =
  'font-overpass text-[1.1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full min-w-0 p-2.5 focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:cursor-not-allowed disabled:opacity-60';

const DIFFICULTY_OPTIONS = difficultyLevels.map((difficulty) => ({
  value: difficulty,
  label: difficulty.charAt(0) + difficulty.slice(1).toLowerCase(),
}));

function createBlankDraft(): QuizDraftInput {
  return {
    title: '',
    description: null,
    passThresholdPercentage: 70,
    difficultyLevel: 'EASY',
    questions: [],
  };
}

function toQuizDraftInput(quiz: AdminQuizResponseDto): QuizDraftInput {
  return {
    title: quiz.title,
    description: quiz.description,
    passThresholdPercentage: quiz.passThresholdPercentage,
    difficultyLevel: quiz.difficultyLevel,
    questions: quiz.questions.map((question) => ({
      ...question,
      categories: [...question.categories],
      answerOptions: question.answerOptions.map((option) => ({ ...option })),
    })) as QuizDraftInput['questions'],
  };
}

function normalizeDraft(draft: QuizDraftInput): QuizDraftInput {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    questions: draft.questions.map((question, index) => ({
      ...question,
      position: index,
      answerOptions: question.answerOptions.map((option, optionIndex) => ({
        ...option,
        position: optionIndex,
      })),
    })),
  };
}

function quizEditorPath(scope: QuizAuthoringScope, id: string): string {
  return scope.kind === 'organisation'
    ? `/organisations/${encodeURIComponent(scope.organisationId)}/quizzes/${encodeURIComponent(id)}`
    : `/platform/quizzes/${encodeURIComponent(id)}`;
}

function getApiErrorCode(error: ApiError): string | undefined {
  if (!error.body || typeof error.body !== 'object' || !('error' in error.body)) {
    return undefined;
  }

  return typeof error.body.error === 'string' ? error.body.error : undefined;
}

function getQuizErrorMessage(
  error: unknown,
  action: 'load' | 'save' | 'activate' | 'copy',
): string {
  if (!(error instanceof ApiError)) {
    if (action === 'load') {
      return 'The Quiz could not be loaded. Try again.';
    }

    if (action === 'activate') {
      return 'The Quiz could not be activated. Try again.';
    }

    if (action === 'copy') {
      return 'The Quiz could not be copied. Try again.';
    }

    return 'The Quiz could not be saved. Try again.';
  }

  const code = getApiErrorCode(error);

  if (error.status === 404 || code === 'CONTENT_NOT_FOUND') {
    return 'Quiz not found.';
  }

  if (error.status === 403) {
    return 'You do not have permission to access this Quiz.';
  }

  if (code === 'CONTENT_READ_ONLY') {
    return 'This Quiz is read-only because it is no longer a Draft. Reload to view its current state.';
  }

  if (action === 'activate' && code === 'QUIZ_ACTIVATION_INVALID') {
    return 'This Quiz needs at least one valid question before activation.';
  }
  if (code === 'CONTENT_CHANGED') {
    return 'This Quiz changed on the server. Reload it before trying again.';
  }
  if (action === 'activate' && code === 'INVALID_STATUS_TRANSITION') {
    return 'Only a Draft Quiz can be activated. Reload to see its current status.';
  }
  if (action === 'copy' && code === 'CONTENT_NOT_ACTIVE') {
    return 'Only a Published Quiz can be copied. Reload to see its current status.';
  }

  if (action === 'activate') {
    return 'The Quiz could not be activated. Try again.';
  }

  if (action === 'copy') {
    return 'The Quiz could not be copied. Try again.';
  }

  return error.message;
}

type QuizCreatorEditorProps = Readonly<{
  scope: QuizAuthoringScope;
  quizId: string | undefined;
}>;

function QuizCreatorEditor({ scope, quizId }: QuizCreatorEditorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [aiNavigationIntent] = useState(() => readAiBuilderNavigationIntent(location.state));
  const [aiReturnTo] = useState(() => readAiBuilderReturnTo(location.state));
  const [proposalPrefill] = useState(() => readQuizPrefill(location.state));
  const { clearAuth } = useAuth();

  const blankDraft = useMemo(() => createBlankDraft(), []);
  const [draft, setDraft] = useState<QuizDraftInput>(() => proposalPrefill ?? blankDraft);
  const [savedDraft, setSavedDraft] = useState<QuizDraftInput>(blankDraft);
  const [persistedQuiz, setPersistedQuiz] = useState<AdminQuizResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(quizId));
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [variantQualityReview, setVariantQualityReview] =
    useState<VariantQualityReviewState | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<{
    index: number;
    question: QuizQuestionDraftInput | null;
  } | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<'activate' | 'copy' | null>(null);
  const [showActivateConfirmation, setShowActivateConfirmation] = useState(false);
  const operationRef = useRef<'save' | 'activate' | 'copy' | null>(null);

  useEffect(() => {
    if (aiNavigationIntent || aiReturnTo || proposalPrefill) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [
    aiNavigationIntent,
    aiReturnTo,
    location.pathname,
    location.search,
    navigate,
    proposalPrefill,
  ]);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    let isCurrentRequest = true;

    void getQuizForAuthoring(scope, quizId)
      .then((quiz) => {
        if (!isCurrentRequest) {
          return;
        }

        const nextDraft = toQuizDraftInput(quiz);
        setPersistedQuiz(quiz);
        setDraft(nextDraft);
        setSavedDraft(toQuizDraftInput(quiz));
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          clearAuth();
          return;
        }

        setLoadError(getQuizErrorMessage(error, 'load'));
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [clearAuth, quizId, reloadVersion, scope]);

  const isReadOnly = persistedQuiz !== null && persistedQuiz?.status !== 'DRAFT';
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const isBusy = isSaving || lifecycleAction !== null;
  const hasTitleError = hasSubmitted && draft.title.trim().length === 0;
  const hasThresholdError =
    hasSubmitted &&
    (!Number.isInteger(draft.passThresholdPercentage) ||
      draft.passThresholdPercentage < 0 ||
      draft.passThresholdPercentage > 100);

  useEffect(() => {
    if (!isDirty || isReadOnly) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, isReadOnly]);

  function updateDraft(patch: Partial<QuizDraftInput>) {
    setDraft((current) => ({
      ...current,
      ...patch,
    }));
    setSaveError(null);
    setSuccessMessage(null);
  }

  function saveQuestion(question: QuizQuestionDraftInput) {
    if (!editingQuestion) {
      return;
    }

    setDraft((current) => {
      const questions = [...current.questions];

      if (editingQuestion.question === null) {
        questions.push(question);
      } else {
        const existingId = editingQuestion.question.id;
        const index = existingId
          ? questions.findIndex((item) => item.id === existingId)
          : editingQuestion.index;

        if (index < 0 || index >= questions.length) {
          return current;
        }

        questions[index] = question;
      }

      return {
        ...current,
        questions: questions.map((item, index) => ({ ...item, position: index })),
      };
    });

    setSaveError(null);
    setSuccessMessage(null);
    setEditingQuestion(null);
  }

  function removeQuestion(index: number) {
    setDraft((current) => ({
      ...current,
      questions: current.questions
        .filter((_, questionIndex) => questionIndex !== index)
        .map((question, questionIndex) => ({ ...question, position: questionIndex })),
    }));
    setSaveError(null);
    setSuccessMessage(null);
  }

  async function handleGenerateDraft(request: ReusableContentGenerationRequestDto) {
    try {
      if (aiNavigationIntent?.variant && scope.kind === 'organisation') {
        const result = await generateOrganisationContentVariant(scope.organisationId, {
          contentType: aiNavigationIntent.variant.contentType,
          targetDifficulty: request.requestedDifficulty,
          requestedCategories: request.requestedCategories,
          topic: request.topic,
          learningObjective: request.learningObjective,
          sourceConcept: aiNavigationIntent.variant.sourceConcept,
          ...(request.administratorGuidance
            ? { administratorGuidance: request.administratorGuidance }
            : {}),
        });
        if (result.contentType !== 'QUIZ') {
          throw new Error('AI generation returned the wrong content type.');
        }
        setVariantQualityReview({
          findings: result.findings,
          semanticReviewStatus: result.semanticReviewStatus,
        });
        return result.draft;
      }
      setVariantQualityReview(null);
      return await generateQuizDraft(scope, request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
      }
      throw error;
    }
  }

  function handleGeneratedDraft(generatedDraft: QuizDraftInput) {
    setDraft(generatedDraft);
    setHasSubmitted(false);
    setSaveError(null);
    setSuccessMessage(null);
    setEditingQuestion(null);
  }

  async function persistDraft(): Promise<AdminQuizResponseDto | null> {
    setHasSubmitted(true);

    if (
      isReadOnly ||
      !draft.title.trim() ||
      !Number.isInteger(draft.passThresholdPercentage) ||
      draft.passThresholdPercentage < 0 ||
      draft.passThresholdPercentage > 100
    ) {
      return null;
    }

    const isCreating = persistedQuiz === null;
    const savedQuiz = isCreating
      ? await createQuizDraft(scope, normalizeDraft(draft))
      : await updateQuizDraft(scope, persistedQuiz.id, normalizeDraft(draft));

    setPersistedQuiz(savedQuiz);
    setDraft(toQuizDraftInput(savedQuiz));
    setSavedDraft(toQuizDraftInput(savedQuiz));
    setHasSubmitted(false);

    if (isCreating) {
      navigate(quizEditorPath(scope, savedQuiz.id), {
        replace: true,
        state: aiReturnTo ? { aiGenerationReturnTo: aiReturnTo } : null,
      });
    }

    return savedQuiz;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operationRef.current || isReadOnly) return;

    operationRef.current = 'save';
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const wasCreating = persistedQuiz === null;
      const savedQuiz = await persistDraft();
      if (savedQuiz) {
        setSuccessMessage(wasCreating ? 'Quiz Draft created.' : 'Quiz Draft saved.');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        return;
      }

      setSaveError(getQuizErrorMessage(error, 'save'));
    } finally {
      operationRef.current = null;
      setIsSaving(false);
    }
  }

  async function handleActivate() {
    if (operationRef.current || !persistedQuiz || persistedQuiz.status !== 'DRAFT') return;

    operationRef.current = 'activate';
    setShowActivateConfirmation(false);
    setLifecycleAction('activate');
    setSaveError(null);
    setSuccessMessage(null);
    let saveCompleted = !isDirty;

    try {
      const quizToActivate = isDirty ? await persistDraft() : persistedQuiz;
      if (!quizToActivate) return;
      saveCompleted = true;

      const activated = await activateQuiz(scope, quizToActivate.id);
      setPersistedQuiz(activated);
      setDraft(toQuizDraftInput(activated));
      setSavedDraft(toQuizDraftInput(activated));
      setSuccessMessage('Quiz activated.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        return;
      }
      setSaveError(getQuizErrorMessage(error, saveCompleted ? 'activate' : 'save'));
    } finally {
      operationRef.current = null;
      setLifecycleAction(null);
    }
  }

  async function handleCopy() {
    if (operationRef.current || !persistedQuiz || persistedQuiz.status !== 'PUBLISHED') {
      return;
    }

    operationRef.current = 'copy';
    setLifecycleAction('copy');
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const copied = await copyQuiz(scope, persistedQuiz.id);
      navigate(quizEditorPath(scope, copied.id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        return;
      }
      setSaveError(getQuizErrorMessage(error, 'copy'));
    } finally {
      operationRef.current = null;
      setLifecycleAction(null);
    }
  }

  if (isLoading) {
    return (
      <AppLayout contentStyle={{ backgroundColor: 'white' }}>
        <div
          className="flex min-h-full items-center justify-center gap-3 font-overpass text-lg text-purple"
          aria-live="polite"
        >
          <span className="rounded-full bg-purple p-2">
            <LoadingSpinnerSVG />
          </span>
          Loading Quiz…
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout contentStyle={{ backgroundColor: 'white' }}>
        <section className="mx-auto w-full max-w-3xl p-8">
          <h1 className="font-jost text-4xl font-medium tracking-wider text-purple">
            Quiz Creator
          </h1>
          <div className="mt-6 border border-red-200 bg-red-50 p-4 font-overpass text-red-800">
            <p role="alert">{loadError}</p>
            <button
              type="button"
              className="mt-4 bg-main-purple px-4 py-2 font-jost text-white hover:bg-hover-purple"
              onClick={() => {
                setIsLoading(true);
                setLoadError(null);
                setReloadVersion((current) => current + 1);
              }}
            >
              Retry
            </button>
          </div>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      {saveError && (
        <BasicAlert variant="danger" onClose={() => setSaveError(null)}>
          {saveError}
        </BasicAlert>
      )}
      {successMessage && (
        <BasicAlert variant="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </BasicAlert>
      )}

      <main className="mx-auto w-full max-w-5xl p-8">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-jost text-4xl font-medium tracking-wider text-purple">
              {persistedQuiz ? persistedQuiz.title || 'Quiz Creator' : 'Create Quiz'}
            </h1>
            <p className="mt-2 font-overpass text-dark-pink">
              Create and maintain reusable Quiz metadata.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {aiReturnTo && (
              <button
                type="button"
                className="border border-default bg-white px-4 py-2 font-jost text-purple"
                onClick={() => navigate(aiReturnTo)}
              >
                Return to Campaign
              </button>
            )}
            {!isReadOnly && (
              <GenerateWithAiDialog
                scope={scope.kind}
                disabled={isBusy}
                initiallyOpen={aiNavigationIntent?.autoOpenGenerateWithAi}
                initialDifficulty={aiNavigationIntent?.requestedDifficulty}
                initialCategories={aiNavigationIntent?.requestedCategories}
                initialGuidance={aiNavigationIntent?.administratorGuidance}
                onGenerate={handleGenerateDraft}
                onGenerated={handleGeneratedDraft}
              />
            )}
            {persistedQuiz?.status === 'DRAFT' && (
              <button
                type="button"
                disabled={isBusy}
                className="bg-main-purple px-4 py-2 font-jost text-white disabled:opacity-60"
                onClick={() => {
                  if (draft.questions.length === 0) {
                    setSaveError('Add at least one question before activating this Quiz.');
                    return;
                  }
                  setShowActivateConfirmation(true);
                }}
              >
                {lifecycleAction === 'activate' ? 'Activating…' : 'Activate Quiz'}
              </button>
            )}
            {persistedQuiz?.status === 'PUBLISHED' && (
              <button
                type="button"
                disabled={isBusy}
                className="border border-default bg-faint-purple px-4 py-2 font-jost text-purple disabled:opacity-60"
                onClick={() => void handleCopy()}
              >
                {lifecycleAction === 'copy' ? 'Copying…' : 'Copy to Draft'}
              </button>
            )}
            <span className="border border-purple bg-faint-purple px-4 py-2 font-jost text-purple">
              {persistedQuiz
                ? persistedQuiz.status.charAt(0) + persistedQuiz.status.slice(1).toLowerCase()
                : 'Draft'}
            </span>
          </div>
        </header>

        {isReadOnly && (
          <div className="mb-6 border border-purple bg-faint-purple p-4 font-overpass text-purple">
            This Quiz is read only because it is no longer a draft.
          </div>
        )}

        {variantQualityReview && <VariantQualityReview {...variantQualityReview} />}

        <form
          aria-label="Quiz metadata"
          aria-busy={isSaving}
          noValidate
          onSubmit={(event) => void handleSave(event)}
        >
          <section className="space-y-6 border border-default bg-white-purple p-6 shadow-sm">
            <h2 className="font-jost text-2xl font-medium tracking-wider text-purple">
              Quiz metadata
            </h2>

            <FormField
              id="quiz-title"
              label="Title"
              errorText={hasTitleError ? 'Title is required.' : undefined}
            >
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="text"
                  required
                  maxLength={200}
                  disabled={isReadOnly || isBusy}
                  value={draft.title}
                  className={CONTROL_CLASSES}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                />
              )}
            </FormField>

            <FormField id="quiz-description" label="Description">
              {(controlProps) => (
                <textarea
                  {...controlProps}
                  rows={5}
                  disabled={isReadOnly || isBusy}
                  value={draft.description ?? ''}
                  className={CONTROL_CLASSES}
                  onChange={(event) =>
                    updateDraft({
                      description: event.target.value || null,
                    })
                  }
                />
              )}
            </FormField>

            <FormField
              id="quiz-pass-threshold"
              label="Pass threshold percentage"
              helperText="Enter a whole number from 0 to 100."
              errorText={
                hasThresholdError
                  ? 'Pass threshold must be a whole number from 0 to 100.'
                  : undefined
              }
            >
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="number"
                  required
                  min={0}
                  max={100}
                  step={1}
                  disabled={isReadOnly || isBusy}
                  value={draft.passThresholdPercentage}
                  className={CONTROL_CLASSES}
                  onChange={(event) =>
                    updateDraft({
                      passThresholdPercentage: event.currentTarget.valueAsNumber,
                    })
                  }
                />
              )}
            </FormField>

            <SelectField
              id="quiz-difficulty"
              label="Difficulty"
              value={draft.difficultyLevel}
              options={DIFFICULTY_OPTIONS}
              disabled={isReadOnly || isBusy}
              onChange={(value) =>
                updateDraft({
                  difficultyLevel: value as DifficultyLevelDto,
                })
              }
            />
          </section>

          <section className="mt-8 border border-default bg-white-purple p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-jost text-2xl font-medium tracking-wider text-purple">
                Questions ({draft.questions.length})
              </h2>
              {!isReadOnly && (
                <button
                  type="button"
                  disabled={isBusy}
                  className="bg-main-purple px-4 py-2 font-jost text-white disabled:opacity-60"
                  onClick={() =>
                    setEditingQuestion({ index: draft.questions.length, question: null })
                  }
                >
                  Add Question
                </button>
              )}
            </div>

            {draft.questions.length === 0 && (
              <p className="mt-4 font-overpass text-dark-pink">No questions added yet.</p>
            )}

            <div className="mt-5 space-y-4">
              {draft.questions.map((question, index) => (
                <article
                  key={question.id ?? `new-${index}`}
                  className="border border-default bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-jost text-xl text-purple">Question {index + 1}</h3>
                      <p className="mt-2 font-overpass text-dark-pink">{question.prompt}</p>
                    </div>
                    {!isReadOnly && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          className="font-jost text-purple underline disabled:opacity-60"
                          onClick={() => setEditingQuestion({ index, question })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          className="font-jost text-purple underline disabled:opacity-60"
                          onClick={() => removeQuestion(index)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 font-overpass text-dark-pink">
                    <div>
                      <dt>Type</dt>
                      <dd>
                        {question.questionType === 'SINGLE_CHOICE'
                          ? 'Single choice'
                          : 'Multiple choice'}
                      </dd>
                    </div>
                    <div>
                      <dt>Points</dt>
                      <dd>{question.points}</dd>
                    </div>
                    <div>
                      <dt>Categories</dt>
                      <dd>
                        {question.categories.length
                          ? question.categories
                              .map((category) => category.replaceAll('_', ' ').toLowerCase())
                              .join(', ')
                          : 'None'}
                      </dd>
                    </div>
                    <div>
                      <dt>Shuffle options</dt>
                      <dd>{question.shuffleOptions ? 'Yes' : 'No'}</dd>
                    </div>
                    {question.questionType === 'MULTIPLE_CHOICE' && (
                      <div>
                        <dt>Selections</dt>
                        <dd>
                          Minimum {question.minSelections}; maximum {question.maxSelections}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <ol className="mt-4 space-y-2">
                    {question.answerOptions.map((option, optionIndex) => (
                      <li key={option.id ?? `new-option-${optionIndex}`}>
                        <span className="font-semibold">
                          {option.label}. {option.text}
                        </span>
                        {option.isCorrect && <span> - Correct</span>}
                        {option.feedbackText && (
                          <p className="font-overpass text-sm text-gray-600">
                            Feedback: {option.feedbackText}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>

          {!isReadOnly && (
            <div className="mt-8 flex items-center gap-4">
              <button
                type="submit"
                disabled={isBusy || !isDirty}
                className="bg-main-purple px-6 py-3 font-jost text-lg text-white hover:bg-hover-purple disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? 'Saving…' : 'Save Draft'}
              </button>
              <span className="font-overpass text-sm text-gray-600" aria-live="polite">
                {isDirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
            </div>
          )}
        </form>
      </main>

      {editingQuestion && !isReadOnly && !isBusy && (
        <QuestionEditorDialog
          question={editingQuestion.question}
          position={editingQuestion.index}
          onCancel={() => setEditingQuestion(null)}
          onSave={saveQuestion}
        />
      )}

      {showActivateConfirmation && (
        <BasicConfirmationModal
          title="Activate Quiz"
          message="Activate this Quiz? Unsaved changes will be saved first. Once activated, the Quiz becomes read-only."
          confirmButtonText="Activate Quiz"
          confirmButtonVariant="default"
          isConfirming={lifecycleAction === 'activate'}
          isConfirmDisabled={isBusy}
          isDismissDisabled={isBusy}
          onCancel={() => setShowActivateConfirmation(false)}
          onConfirm={() => void handleActivate()}
        />
      )}
    </AppLayout>
  );
}

function QuizCreatorPage({ contextKind }: QuizCreatorPageProps) {
  const { organisationId, quizId } = useParams<{
    organisationId: string;
    quizId: string;
  }>();
  const { authContext } = useAuth();

  const scope = useMemo<QuizAuthoringScope | null>(() => {
    if (contextKind === 'platform') {
      return { kind: 'platform' };
    }

    return organisationId ? { kind: 'organisation', organisationId } : null;
  }, [contextKind, organisationId]);

  if (
    !scope ||
    (scope.kind === 'organisation' && scope.organisationId !== authContext?.organisation?.id)
  ) {
    return <Navigate to="/organisation-information" replace />;
  }

  const editorKey =
    scope.kind === 'organisation'
      ? `organisation:${scope.organisationId}:${quizId ?? 'new'}`
      : `platform:${quizId ?? 'new'}`;

  return <QuizCreatorEditor key={editorKey} scope={scope} quizId={quizId} />;
}

export default QuizCreatorPage;
