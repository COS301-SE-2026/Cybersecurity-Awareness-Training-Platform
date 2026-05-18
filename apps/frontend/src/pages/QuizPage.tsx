import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingAsyncContent } from '../components/training/TrainingAsyncContent';
import { trainingStateActionStyle } from '../components/training/trainingStateStyles';
import {
  getQuiz,
  quizRoutes,
  startQuizAttempt,
  submitQuizAttempt,
  type GetQuizResponseDto,
} from '../lib/quizApi';

type SelectedAnswers = Record<string, string[]>;

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const isSubmittingRef = useRef(false);

  const [quiz, setQuiz] = useState<GetQuizResponseDto | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [missingQuestionIds, setMissingQuestionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      if (!quizId) {
        setErrorMessage('Quiz identifier is missing.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const quizResponse = await getQuiz(quizId);

        if (isMounted) {
          setQuiz(quizResponse);
          setSelectedAnswers({});
          setMissingQuestionIds([]);
          setSubmitErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load quiz.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [quizId, reloadToken]);

  const orderedQuestions = useMemo(() => {
    return [...(quiz?.questions ?? [])].sort((a, b) => a.position - b.position);
  }, [quiz]);
  const hasQuizContent = quiz !== null && orderedQuestions.length > 0;

  function selectSingleAnswer(questionId: string, optionId: string) {
    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: [optionId],
    }));

    setMissingQuestionIds((currentMissingIds) =>
      currentMissingIds.filter((currentQuestionId) => currentQuestionId !== questionId),
    );

    setSubmitErrorMessage(null);
  }

  async function handleSubmit() {
    if (!quiz || !quizId || isSubmittingRef.current) {
      return;
    }

    const unansweredQuestionIds = orderedQuestions
      .filter((question) => (selectedAnswers[question.id] ?? []).length === 0)
      .map((question) => question.id);

    if (unansweredQuestionIds.length > 0) {
      setMissingQuestionIds(unansweredQuestionIds);
      setSubmitErrorMessage('Please answer all questions before submitting the quiz.');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setSubmitErrorMessage(null);

      const attempt = await startQuizAttempt(quizId);

      const submitResponse = await submitQuizAttempt(attempt.attemptId, {
        answers: orderedQuestions.map((question) => ({
          questionId: question.id,
          selectedOptionIds: selectedAnswers[question.id] ?? [],
        })),
      });

      navigate(quizRoutes.result(submitResponse.attemptId));
    } catch (error) {
      setSubmitErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit quiz attempt.',
      );
    } finally {
      isSubmittingRef.current = false;
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
        errorMessage={errorMessage}
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
        {quiz && orderedQuestions.length > 0 ? (
          <div style={pageShellStyle}>
            <section style={headerStyle}>
              <p style={eyebrowStyle}>UC-03 Quiz</p>
              <h1 style={titleStyle}>{quiz.title}</h1>
              {quiz.description ? <p style={descriptionStyle}>{quiz.description}</p> : null}
              <p style={metaStyle}>
                Pass mark: {quiz.passThresholdPercentage}% · Difficulty: {quiz.difficultyLevel}
              </p>
            </section>

            {submitErrorMessage ? (
              <div role="alert" style={alertStyle}>
                {submitErrorMessage}
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
              style={formStyle}
            >
              {orderedQuestions.map((question, questionIndex) => {
                const selectedOptionIds = selectedAnswers[question.id] ?? [];
                const hasValidationError = missingQuestionIds.includes(question.id);
                const orderedOptions = [...question.options].sort(
                  (a, b) => a.position - b.position,
                );

                return (
                  <fieldset
                    key={question.id}
                    style={{
                      ...questionCardStyle,
                      borderColor: hasValidationError ? '#FF6B8A' : 'rgba(255, 255, 255, 0.16)',
                    }}
                  >
                    <legend style={questionLegendStyle}>Question {questionIndex + 1}</legend>

                    <h2 style={questionPromptStyle}>{question.prompt}</h2>

                    <div style={optionsListStyle}>
                      {orderedOptions.map((option) => {
                        const inputId = `${question.id}-${option.id}`;
                        const isSelected = selectedOptionIds.includes(option.id);

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
                              checked={isSelected}
                              onChange={() => selectSingleAnswer(question.id, option.id)}
                              style={{ accentColor: '#FF00D4' }}
                            />
                            <span style={optionLabelStyle}>{option.label}</span>
                            <span>{option.text}</span>
                          </label>
                        );
                      })}
                    </div>

                    {hasValidationError ? (
                      <p style={validationMessageStyle}>
                        Please select an answer for this question.
                      </p>
                    ) : null}
                  </fieldset>
                );
              })}

              <div style={submitRowStyle}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...primaryButtonStyle,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.72 : 1,
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </TrainingAsyncContent>
    </AppLayout>
  );
}

const pageShellStyle = {
  width: 'min(980px, 100%)',
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

const validationMessageStyle = {
  margin: '0.85rem 0 0',
  color: '#FF9FB3',
  fontWeight: 700,
} satisfies CSSProperties;

const submitRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  paddingBottom: '2rem',
} satisfies CSSProperties;

const primaryButtonStyle = {
  padding: '0.85rem 1.2rem',
  backgroundColor: '#8400FF',
  color: '#FFFFFF',
  border: '1px solid #FF00D4',
  cursor: 'pointer',
  fontFamily: 'Jost',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
} satisfies CSSProperties;
