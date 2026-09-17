import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type {
  AdminQuizResponseDto,
  DifficultyLevelDto,
  QuizDraftInput,
  QuizQuestionDraftInput,
} from '@insightful-phish/shared';
import { difficultyLevels } from '@insightful-phish/shared';

import BasicAlert from '../../components/alerts/BasicAlert';
import AppLayout from '../../components/layout/AppLayout';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import { FormField, SelectField } from '../../components/ui/FormField';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../lib/apiClient';
import {
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

function getApiErrorCode(error: ApiError): string | undefined {
  if (!error.body || typeof error.body !== 'object' || !('error' in error.body)) {
    return undefined;
  }

  return typeof error.body.error === 'string' ? error.body.error : undefined;
}

function getQuizErrorMessage(error: unknown, action: 'load' | 'save'): string {
  if (!(error instanceof ApiError)) {
    return action === 'load'
      ? 'The Quiz could not be loaded. Try again.'
      : 'The Quiz Draft could not be saved. Try again.';
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

  return error.message;
}

type QuizCreatorEditorProps = Readonly<{
  scope: QuizAuthoringScope;
  quizId: string | undefined;
}>;

function QuizCreatorEditor({ scope, quizId }: QuizCreatorEditorProps) {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();

  const blankDraft = useMemo(() => createBlankDraft(), []);
  const [draft, setDraft] = useState<QuizDraftInput>(blankDraft);
  const [savedDraft, setSavedDraft] = useState<QuizDraftInput>(blankDraft);
  const [persistedQuiz, setPersistedQuiz] = useState<AdminQuizResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(quizId));
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<{
    index: number;
    question: QuizQuestionDraftInput | null;
  } | null>(null);

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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setSaveError(null);
    setSuccessMessage(null);

    if (
      isReadOnly ||
      !draft.title.trim() ||
      !Number.isInteger(draft.passThresholdPercentage) ||
      draft.passThresholdPercentage < 0 ||
      draft.passThresholdPercentage > 100
    ) {
      return;
    }

    const normalizedDraft = normalizeDraft(draft);
    const isCreating = persistedQuiz === null;

    setIsSaving(true);

    try {
      const savedQuiz = isCreating
        ? await createQuizDraft(scope, normalizedDraft)
        : await updateQuizDraft(scope, persistedQuiz.id, normalizedDraft);
      const returnedDraft = toQuizDraftInput(savedQuiz);

      setPersistedQuiz(savedQuiz);
      setDraft(returnedDraft);
      setSavedDraft(toQuizDraftInput(savedQuiz));
      setHasSubmitted(false);
      setSuccessMessage(isCreating ? 'Quiz Draft created.' : 'Quiz Draft saved.');

      if (isCreating) {
        const destination =
          scope.kind === 'organisation'
            ? `/organisations/${encodeURIComponent(scope.organisationId)}/quizzes/${encodeURIComponent(savedQuiz.id)}`
            : `/platform/quizzes/${encodeURIComponent(savedQuiz.id)}`;

        navigate(destination, { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        return;
      }

      setSaveError(getQuizErrorMessage(error, 'save'));
    } finally {
      setIsSaving(false);
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

          <span className="border border-purple bg-faint-purple px-4 py-2 font-jost text-purple">
            {persistedQuiz
              ? persistedQuiz.status.charAt(0) + persistedQuiz.status.slice(1).toLowerCase()
              : 'Draft'}
          </span>
        </header>

        {isReadOnly && (
          <div className="mb-6 border border-purple bg-faint-purple p-4 font-overpass text-purple">
            This Quiz is read only because it is no longer a draft.
          </div>
        )}

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
                  disabled={isReadOnly || isSaving}
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
                  disabled={isReadOnly || isSaving}
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
                  disabled={isReadOnly || isSaving}
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
              disabled={isReadOnly || isSaving}
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
                  disabled={isSaving}
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
                          disabled={isSaving}
                          className="font-jost text-purple underline disabled:opacity-60"
                          onClick={() => setEditingQuestion({ index, question })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
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
                disabled={isSaving || !isDirty}
                className="bg-main-purple px-6 py-3 font-jost text-lg text-white hover:bg-hover-purple disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save Draft'}
              </button>
              <span className="font-overpass text-sm text-gray-600" aria-live="polite">
                {isDirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
            </div>
          )}
        </form>
      </main>

      {editingQuestion && !isReadOnly && !isSaving && (
        <QuestionEditorDialog
          question={editingQuestion.question}
          position={editingQuestion.index}
          onCancel={() => setEditingQuestion(null)}
          onSave={saveQuestion}
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
