import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingAsyncContent } from '../components/training/TrainingAsyncContent';
import { trainingStateActionStyle } from '../components/training/trainingStateStyles';
import { getQuiz, startQuizAttempt, submitQuizAttempt } from '../lib/quizApi';
import type { CampaignItemQuiz, SubmitQuizAnswer } from '../lib/quizApi';

type SelectedAnswers = Record<string, string>;

type LoadQuizContentOptions = {
  campaignItemId?: string;
  isActive: () => boolean;
  setError: (message: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  onQuizLoaded: (quiz: CampaignItemQuiz) => void;
};

type QuizHeaderProps = {
  quiz: CampaignItemQuiz;
  answeredQuestionCount: number;
};

type QuizAlertProps = {
  message: string | null;
};

type QuizFormProps = {
  quiz: CampaignItemQuiz;
  selectedAnswers: SelectedAnswers;
  isStartingAttempt: boolean;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getQuizMetaText(quiz: CampaignItemQuiz, answeredQuestionCount: number): string {
  const details = [`Question ${answeredQuestionCount} of ${quiz.questions.length} answered`];

  if (quiz.passThresholdPercentage !== null && quiz.passThresholdPercentage !== undefined) {
    details.push(`Pass mark: ${quiz.passThresholdPercentage}%`);
  }

  if (quiz.difficultyLevel) {
    details.push(`Difficulty: ${quiz.difficultyLevel}`);
  }

  return details.join(' · ');
}

function buildSubmitAnswers(
  quiz: CampaignItemQuiz,
  selectedAnswers: SelectedAnswers,
): SubmitQuizAnswer[] {
  return quiz.questions.map((question) => ({
    questionId: question.id,
    selectedOptionIds: [selectedAnswers[question.id]],
  }));
}

async function loadQuizContent({
  campaignItemId,
  isActive,
  setError,
  setIsLoading,
  onQuizLoaded,
}: LoadQuizContentOptions): Promise<void> {
  if (!campaignItemId) {
    setError('No campaign item was provided for this quiz.');
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);
    setError(null);

    const loadedQuiz = await getQuiz(campaignItemId);

    if (isActive()) {
      onQuizLoaded(loadedQuiz);
    }
  } catch (loadError) {
    if (isActive()) {
      setError(getErrorMessage(loadError, 'The quiz could not be loaded.'));
    }
  } finally {
    if (isActive()) {
      setIsLoading(false);
    }
  }
}

function navigateToResults(
  attemptId: string,
  navigate: ReturnType<typeof useNavigate>,
  hasNavigatedToResultsRef: { current: boolean },
) {
  if (hasNavigatedToResultsRef.current) {
    return;
  }

  hasNavigatedToResultsRef.current = true;
  navigate(`/quiz-attempts/${attemptId}/results`);
}

function QuizHeader({ quiz, answeredQuestionCount }: QuizHeaderProps) {
  return (
    <section style={headerStyle}>
      <p style={eyebrowStyle}>UC-03 Quiz</p>
      <h1 style={titleStyle}>{quiz.title}</h1>
      {quiz.description ? <p style={descriptionStyle}>{quiz.description}</p> : null}
      <p style={metaStyle}>{getQuizMetaText(quiz, answeredQuestionCount)}</p>
    </section>
  );
}

function QuizAlert({ message }: QuizAlertProps) {
  if (message === null) {
    return null;
  }

  return (
    <div role="alert" style={alertStyle}>
      {message}
    </div>
  );
}

function QuizForm({
  quiz,
  selectedAnswers,
  isStartingAttempt,
  isSubmitting,
  hasSubmitted,
  onSelectAnswer,
  onSubmit,
}: QuizFormProps) {
  const isInteractionLocked = isSubmitting || hasSubmitted;
  const isSubmitDisabled = isInteractionLocked || isStartingAttempt;
  const submitButtonLabel = isSubmitting || isStartingAttempt ? 'Submitting...' : 'Submit Quiz';

  return (
    <form onSubmit={onSubmit} style={formStyle}>
      {quiz.questions.map((question, questionIndex) => (
        <fieldset
          key={question.id}
          disabled={isInteractionLocked}
          style={questionCardStyle}
          aria-labelledby={`${question.id}-prompt`}
        >
          <legend style={questionLegendStyle}>Question {questionIndex + 1}</legend>

          <h2 id={`${question.id}-prompt`} style={questionPromptStyle}>
            {question.text}
          </h2>

          <div style={optionsListStyle}>
            {question.options.map((option) => {
              const inputId = `${question.id}-${option.id}`;
              const isSelected = selectedAnswers[question.id] === option.id;

              return (
                <label
                  key={option.id}
                  htmlFor={inputId}
                  style={{
                    ...optionStyle,
                    borderColor: isSelected ? '#FF00D4' : 'rgba(255, 255, 255, 0.14)',
                    backgroundColor: isSelected
                      ? 'rgba(132, 0, 255, 0.28)'
                      : 'rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={question.id}
                    value={option.id}
                    aria-label={`${option.label}. ${option.text}`}
                    checked={isSelected}
                    onChange={() => onSelectAnswer(question.id, option.id)}
                    style={{ accentColor: '#FF00D4' }}
                  />
                  <span style={optionLabelStyle}>{option.label}</span>
                  <span>{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div style={submitRowStyle}>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={{
            ...primaryButtonStyle,
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            opacity: isSubmitDisabled ? 0.72 : 1,
          }}
        >
          {submitButtonLabel}
        </button>
      </div>
    </form>
  );
}

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const campaignItemId = quizId;
  const submitInFlightRef = useRef(false);
  const attemptPromiseRef = useRef<Promise<string> | null>(null);
  const hasNavigatedToResultsRef = useRef(false);

  const [quiz, setQuiz] = useState<CampaignItemQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isStartingAttempt, setIsStartingAttempt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const applyLoadedQuiz = useEffectEvent((loadedQuiz: CampaignItemQuiz) => {
    setQuiz(loadedQuiz);
    setSelectedAnswers({});
    setAttemptId(null);
    setHasSubmitted(false);
    submitInFlightRef.current = false;
    hasNavigatedToResultsRef.current = false;
    setValidationMessage(null);
  });

  useEffect(() => {
    let isActive = true;

    void loadQuizContent({
      campaignItemId,
      isActive: () => isActive,
      setError,
      setIsLoading,
      onQuizLoaded: applyLoadedQuiz,
    });

    return () => {
      isActive = false;
    };
  }, [campaignItemId, reloadToken]);

  const answeredQuestionCount = useMemo(() => {
    return Object.keys(selectedAnswers).length;
  }, [selectedAnswers]);

  const allQuestionsAnswered = useMemo(() => {
    return quiz?.questions.every((question) => Boolean(selectedAnswers[question.id])) ?? false;
  }, [quiz, selectedAnswers]);

  const hasQuizContent = Boolean(quiz?.questions.length);
  const loadErrorMessage = quiz === null ? error : null;

  function handleSelectAnswer(questionId: string, optionId: string) {
    if (isSubmitting || hasSubmitted) {
      return;
    }

    setValidationMessage(null);

    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: optionId,
    }));
  }

  async function ensureAttemptStarted(): Promise<string> {
    if (attemptId !== null) {
      return attemptId;
    }

    if (attemptPromiseRef.current !== null) {
      return attemptPromiseRef.current;
    }

    if (!campaignItemId) {
      throw new Error('No campaign item was provided for this quiz.');
    }

    setIsStartingAttempt(true);

    attemptPromiseRef.current = startQuizAttempt(campaignItemId)
      .then((attempt) => {
        setAttemptId(attempt.attemptId);
        return attempt.attemptId;
      })
      .finally(() => {
        setIsStartingAttempt(false);
        attemptPromiseRef.current = null;
      });

    return attemptPromiseRef.current;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (quiz === null || submitInFlightRef.current || isSubmitting || hasSubmitted) {
      return;
    }

    if (!allQuestionsAnswered) {
      setValidationMessage('Please answer every question before submitting the quiz.');
      return;
    }

    try {
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setError(null);
      setValidationMessage(null);

      const activeAttemptId = await ensureAttemptStarted();
      const answers = buildSubmitAnswers(quiz, selectedAnswers);

      await submitQuizAttempt(activeAttemptId, answers);

      setHasSubmitted(true);
      navigateToResults(activeAttemptId, navigate, hasNavigatedToResultsRef);
    } catch (submitError) {
      submitInFlightRef.current = false;
      hasNavigatedToResultsRef.current = false;
      setError(getErrorMessage(submitError, 'The quiz could not be submitted.'));
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout
      contentStyle={{
        overflowY: 'auto',
        padding: '2rem',
      }}
    >
      <TrainingAsyncContent
        isLoading={isLoading}
        loadingTitle="Loading quiz"
        loadingMessage="Your quiz questions are being loaded."
        errorMessage={loadErrorMessage}
        errorTitle="Unable to load quiz"
        errorAction={
          <button
            type="button"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            style={trainingStateActionStyle}
          >
            Try Again
          </button>
        }
        isEmpty={!hasQuizContent}
        emptyTitle="No quiz questions available"
        emptyMessage="This quiz does not have any available questions yet."
      >
        {quiz && hasQuizContent ? (
          <div style={pageShellStyle}>
            <QuizHeader quiz={quiz} answeredQuestionCount={answeredQuestionCount} />
            <QuizAlert message={error} />
            <QuizAlert message={validationMessage} />
            <QuizForm
              quiz={quiz}
              selectedAnswers={selectedAnswers}
              isStartingAttempt={isStartingAttempt}
              isSubmitting={isSubmitting}
              hasSubmitted={hasSubmitted}
              onSelectAnswer={handleSelectAnswer}
              onSubmit={handleSubmit}
            />
          </div>
        ) : null}
      </TrainingAsyncContent>
    </AppLayout>
  );
}

export default QuizPage;

const pageShellStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  color: '#FFFFFF',
  fontFamily: 'Overpass',
} satisfies CSSProperties;

const headerStyle = {
  marginBottom: '1.5rem',
} satisfies CSSProperties;

const eyebrowStyle = {
  margin: 0,
  color: '#FF00D4',
  fontFamily: 'Jost',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
} satisfies CSSProperties;

const titleStyle = {
  margin: '0.4rem 0',
  fontFamily: 'Jost',
  fontSize: '2.4rem',
  lineHeight: 1.1,
} satisfies CSSProperties;

const descriptionStyle = {
  maxWidth: '720px',
  color: '#D8CCE8',
  lineHeight: 1.6,
} satisfies CSSProperties;

const metaStyle = {
  color: '#BFA9DD',
  fontSize: '0.95rem',
} satisfies CSSProperties;

const alertStyle = {
  marginBottom: '1rem',
  padding: '1rem',
  border: '1px solid #FF6B8A',
  backgroundColor: 'rgba(255, 107, 138, 0.12)',
  color: '#FFFFFF',
} satisfies CSSProperties;

const formStyle = {
  display: 'grid',
  gap: '1.25rem',
} satisfies CSSProperties;

const questionCardStyle = {
  padding: '1.4rem',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
} satisfies CSSProperties;

const questionLegendStyle = {
  padding: '0 0.5rem',
  color: '#FF00D4',
  fontFamily: 'Jost',
  fontWeight: 700,
} satisfies CSSProperties;

const questionPromptStyle = {
  margin: '0 0 1rem',
  fontFamily: 'Jost',
  fontSize: '1.25rem',
} satisfies CSSProperties;

const optionsListStyle = {
  display: 'grid',
  gap: '0.8rem',
} satisfies CSSProperties;

const optionStyle = {
  display: 'grid',
  gridTemplateColumns: 'auto auto 1fr',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.9rem 1rem',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  cursor: 'pointer',
} satisfies CSSProperties;

const optionLabelStyle = {
  color: '#FF00D4',
  fontFamily: 'Jost',
  fontWeight: 700,
} satisfies CSSProperties;

const submitRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: '1px solid #FF00D4',
  backgroundColor: '#8400FF',
  color: '#FFFFFF',
  minWidth: '200px',
  padding: '0.95rem 1.6rem',
  fontFamily: 'Jost',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
} satisfies CSSProperties;
