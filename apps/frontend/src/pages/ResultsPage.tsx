import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingAsyncContent } from '../components/training/TrainingAsyncContent';
import { trainingStateActionStyle } from '../components/training/trainingStateStyles';
import { ApiError } from '../lib/apiClient';
import { getQuiz, getQuizResult, startQuizAttempt } from '../lib/quizApi';
import type { CampaignItemQuiz, QuizResult } from '../lib/quizApi';
import './QuizPages.css';
import StatusBadge from '../components/ui/StatusBadge';
import BackToLoginButton from '../components/BackToLoginButton';

export function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const retakeInFlightRef = useRef(false);

  const [result, setResult] = useState<QuizResult | null>(null);
  const [occurrence, setOccurrence] = useState<CampaignItemQuiz | null>(null);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const [isStartingRetake, setIsStartingRetake] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadResult() {
      if (!attemptId) {
        setError('No quiz attempt was provided.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setOccurrence(null);
        setRetakeError(null);

        const loadedResult = await getQuizResult(attemptId);

        if (isActive) {
          setResult(loadedResult);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error ? loadError.message : 'The quiz result could not be loaded.',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      isActive = false;
    };
  }, [attemptId, reloadToken]);

  useEffect(() => {
    let isActive = true;
    const campaignItemId = result?.campaignItemId;

    if (campaignItemId) {
      void getQuiz(campaignItemId)
        .then((loadedOccurrence) => {
          if (isActive) setOccurrence(loadedOccurrence);
        })
        .catch(() => {
          if (isActive) setOccurrence(null);
        });
    }

    return () => {
      isActive = false;
    };
  }, [result?.campaignItemId]);

  const orderedAnswers = useMemo(() => result?.answers ?? [], [result]);
  const hasResult = result !== null;
  const backToCampaignPath = '/campaigns';
  const backToCampaignLabel = 'Back to Campaigns';
  const currentAttemptSummary = useMemo(
    () => result?.attemptHistory.find((attempt) => attempt.attemptId === result.attemptId) ?? null,
    [result],
  );
  const showAttemptHistory =
    result !== null && (result.attemptHistory.length > 1 || (occurrence?.maxAttempts ?? 1) > 1);

  async function handleRetake() {
    const campaignItemId = result?.campaignItemId;
    if (
      !campaignItemId ||
      !occurrence ||
      occurrence.attemptsRemaining === 0 ||
      retakeInFlightRef.current
    ) {
      return;
    }

    retakeInFlightRef.current = true;
    setIsStartingRetake(true);
    setRetakeError(null);

    try {
      await startQuizAttempt(campaignItemId);
      navigate(`/quizzes/${campaignItemId}`);
    } catch (startError) {
      const message =
        startError instanceof Error ? startError.message : 'The quiz could not be started.';
      setRetakeError(message);

      if (startError instanceof ApiError && startError.status === 409) {
        try {
          setOccurrence(await getQuiz(campaignItemId));
        } catch {
          setOccurrence(null);
        }
      }
    } finally {
      retakeInFlightRef.current = false;
      setIsStartingRetake(false);
    }
  }

  return (
    <AppLayout
      className="quiz-layout"
      contentStyle={{
        overflowY: 'auto',
        padding: '2rem',
        backgroundColor: 'white',
      }}
    >
      <TrainingAsyncContent
        isLoading={isLoading}
        loadingTitle="Loading results"
        loadingMessage="Your quiz result feedback is being loaded."
        errorMessage={error}
        errorTitle="Unable to load results"
        errorAction={
          <button
            type="button"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            style={trainingStateActionStyle}
          >
            Try Again
          </button>
        }
        isEmpty={!hasResult}
        emptyTitle="No result available"
        emptyMessage="No quiz result feedback could be found for this attempt."
      >
        {result ? (
          <div style={pageShellStyle}>
            <div style={backNavigationStyle}>
              <BackToLoginButton to={backToCampaignPath} label={backToCampaignLabel} />
            </div>
            {retakeError ? (
              <div role="alert" style={retakeAlertStyle}>
                {retakeError}
              </div>
            ) : null}
            <section style={summaryCardStyle}>
              <div style={summaryHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Quiz Results</p>
                  <h1 style={titleStyle}>{result.quizTitle}</h1>
                </div>
                <StatusBadge status={result.passed ? 'Passed' : 'Not Passed'} />
              </div>
              <p style={metaStyle}>Attempt score</p>
              <p style={scoreStyle}>
                {result.pointsEarned}/{result.pointsAvailable} ({Math.round(result.scorePercentage)}
                %)
              </p>
              {currentAttemptSummary ? (
                <p style={metaStyle}>
                  Attempt {currentAttemptSummary.attemptNumber}
                  {occurrence ? ` of ${occurrence.maxAttempts}` : ''}
                </p>
              ) : null}
              {currentAttemptSummary?.submittedAt ? (
                <p style={metaStyle}>
                  <time dateTime={currentAttemptSummary.submittedAt}>
                    Submitted {formatAttemptDateTime(currentAttemptSummary.submittedAt)}
                  </time>
                </p>
              ) : null}
              {occurrence ? (
                <p style={metaStyle}>
                  Attempts remaining: {occurrence.attemptsRemaining} of {occurrence.maxAttempts}
                </p>
              ) : null}
            </section>

            {showAttemptHistory ? (
              <section style={attemptHistoryStyle} aria-labelledby="attempt-history-heading">
                <h2 id="attempt-history-heading" style={sectionTitleStyle}>
                  Attempt History
                </h2>
                <div style={answerListStyle}>
                  {result.attemptHistory.map((attempt) => (
                    <article key={attempt.attemptId} style={answerCardStyle}>
                      <div style={answerHeaderStyle}>
                        <h3 style={answerTitleStyle}>Attempt {attempt.attemptNumber}</h3>
                        <StatusBadge status={attempt.passed ? 'Passed' : 'Not Passed'} />
                      </div>
                      <p style={metaStyle}>
                        <time dateTime={attempt.submittedAt ?? undefined}>
                          {formatAttemptDateTime(attempt.submittedAt)}
                        </time>
                      </p>
                      <div style={attemptFooterStyle}>
                        <span style={answerTitleStyle}>{Math.round(attempt.scorePercentage)}%</span>
                        {attempt.attemptId === result.attemptId ? (
                          <span style={metaStyle}>Current result</span>
                        ) : (
                          <Link
                            to={`/quiz-attempts/${attempt.attemptId}/results`}
                            style={attemptLinkStyle}
                          >
                            View Results
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {result.feedbackAvailable ? (
              <section style={feedbackSectionStyle} aria-labelledby="answer-feedback-heading">
                <h2 id="answer-feedback-heading" style={sectionTitleStyle}>
                  Answer Feedback
                </h2>
                {orderedAnswers.length === 0 ? (
                  <div style={emptyFeedbackStyle}>No answer-level feedback was returned.</div>
                ) : (
                  <div style={answerListStyle}>
                    {orderedAnswers.map((answer, index) => {
                      const selectedOptions = answer.options.filter((option) => option.selected);
                      const otherOptions = answer.options.filter((option) => !option.selected);

                      return (
                        <article key={answer.questionId} style={answerCardStyle}>
                          <h3 style={questionTitleStyle}>
                            Question {index + 1}: {answer.questionPrompt}
                          </h3>
                          {answer.awardedPoints !== null && answer.awardedPoints !== undefined ? (
                            <p style={metaStyle}>Awarded points: {answer.awardedPoints}</p>
                          ) : null}
                          <div style={answerResponseStyle}>
                            <div style={answerHeaderStyle}>
                              <h4 style={answerSectionTitleStyle}>
                                {selectedOptions.length === 1 ? 'Your answer' : 'Your answers'}
                              </h4>
                              <StatusBadge status={answer.isCorrect ? 'Correct' : 'Incorrect'} />
                            </div>
                            <div style={answerListStyle}>
                              {selectedOptions.map((option) => (
                                <div key={option.optionId} style={selectedOptionStyle}>
                                  <div style={selectedOptionHeaderStyle}>
                                    <span style={optionLabelStyle}>{option.label}</span>
                                    <span>{option.text}</span>
                                  </div>
                                  {option.feedbackText ? (
                                    <p style={feedbackTextStyle}>{option.feedbackText}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                          {otherOptions.length > 0 ? (
                            <details style={otherOptionsStyle}>
                              <summary style={otherOptionsSummaryStyle}>
                                {otherOptions.length === 1 ? 'Other option' : 'Other options'}
                              </summary>
                              <div style={answerListStyle}>
                                {otherOptions.map((option) => (
                                  <div key={option.optionId} style={selectedOptionStyle}>
                                    <div style={answerHeaderStyle}>
                                      <div style={selectedOptionHeaderStyle}>
                                        <span style={optionLabelStyle}>{option.label}</span>
                                        <span>{option.text}</span>
                                      </div>
                                      <StatusBadge
                                        status={option.isCorrect ? 'Correct' : 'Incorrect'}
                                      />
                                    </div>
                                    {option.feedbackText ? (
                                      <p style={feedbackTextStyle}>{option.feedbackText}</p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section style={lockedFeedbackStyle} aria-labelledby="answer-feedback-locked-heading">
                <h2 id="answer-feedback-locked-heading" style={sectionTitleStyle}>
                  Question feedback is not available yet
                </h2>
                <p style={lockedFeedbackTextStyle}>
                  Your question answers and feedback will be available after you pass the quiz or
                  use all available attempts.
                  {occurrence
                    ? ` You have ${occurrence.attemptsRemaining} ${occurrence.attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.`
                    : ''}
                </p>
              </section>
            )}

            <div style={actionRowStyle}>
              {result.campaignItemId && occurrence && occurrence.attemptsRemaining > 0 ? (
                <button
                  type="button"
                  disabled={isStartingRetake}
                  onClick={() => void handleRetake()}
                  style={{ ...secondaryLinkStyle, cursor: isStartingRetake ? 'wait' : 'pointer' }}
                >
                  {isStartingRetake ? 'Starting...' : 'Retake Quiz'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </TrainingAsyncContent>
    </AppLayout>
  );
}

export default ResultsPage;

function formatAttemptDateTime(value: string | null): string {
  if (value === null) {
    return 'Submission time unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Submission time unavailable';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const pageShellStyle = {
  width: 'min(980px, 100%)',
  margin: '0 auto',
  color: '#1F2937',
  fontFamily: 'Overpass',
} satisfies CSSProperties;

const retakeAlertStyle = {
  marginBottom: '1rem',
  padding: '1rem',
  border: '1px solid #FF6B8A',
  backgroundColor: 'rgba(255, 107, 138, 0.12)',
  color: '#991B1B',
} satisfies CSSProperties;

const summaryCardStyle = {
  padding: '1.6rem',
  border: '1px solid #D1D5DB',
  backgroundColor: '#FFFFFF',
  marginBottom: '1.5rem',
} satisfies CSSProperties;

const eyebrowStyle = {
  margin: 0,
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
} satisfies CSSProperties;

const titleStyle = {
  margin: '0.4rem 0',
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontSize: '2.4rem',
} satisfies CSSProperties;

const scoreStyle = {
  margin: '1rem 0',
  color: 'var(--ip-deep-purple)',
  fontFamily: 'Jost',
  fontSize: '3rem',
  fontWeight: 700,
} satisfies CSSProperties;

const metaStyle = {
  color: 'var(--ip-deep-purple)',
  fontSize: '0.95rem',
  fontWeight: 600,
} satisfies CSSProperties;

const feedbackSectionStyle = {
  display: 'grid',
  gap: '1rem',
} satisfies CSSProperties;

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--ip-deep-purple)',
  fontFamily: 'Jost',
  fontSize: '1.5rem',
} satisfies CSSProperties;

const emptyFeedbackStyle = {
  padding: '1rem',
  border: '1px solid #D1D5DB',
  backgroundColor: '#FFFFFF',
} satisfies CSSProperties;

const answerListStyle = {
  display: 'grid',
  gap: '1rem',
} satisfies CSSProperties;

const answerCardStyle = {
  padding: '1.2rem',
  border: '1px solid #D1D5DB',
  backgroundColor: '#FFFFFF',
} satisfies CSSProperties;

const answerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  alignItems: 'center',
} satisfies CSSProperties;

const answerTitleStyle = {
  margin: 0,
  fontFamily: 'Jost',
  fontSize: '1.2rem',
} satisfies CSSProperties;

const feedbackTextStyle = {
  color: 'var(--ip-deep-purple)',
  lineHeight: 1.6,
  fontStyle: 'italic',
  marginBottom: 0,
} satisfies CSSProperties;

const selectedOptionStyle = {
  padding: '0.85rem',
  border: '1px solid var(--ip-bg-purple)',
  backgroundColor: 'var(--ip-faint-purple)',
} satisfies CSSProperties;

const selectedOptionHeaderStyle = {
  display: 'flex',
  gap: '0.6rem',
  alignItems: 'center',
} satisfies CSSProperties;

const optionLabelStyle = {
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontWeight: 700,
} satisfies CSSProperties;

const actionRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  padding: '1.5rem 0 2rem',
} satisfies CSSProperties;

const secondaryLinkStyle = {
  color: 'var(--ip-deep-purple)',
  border: '1px solid var(--ip-purple)',
  backgroundColor: '#FFFFFF',
  padding: '0.85rem 1.2rem',
  textDecoration: 'none',
  fontFamily: 'Jost',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
} satisfies CSSProperties;

const backNavigationStyle = { marginBottom: '1.5rem' } satisfies CSSProperties;
const attemptFooterStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  marginTop: '0.75rem',
} satisfies CSSProperties;
const attemptLinkStyle = {
  ...secondaryLinkStyle,
  padding: '0.55rem 0.85rem',
  fontSize: '0.9rem',
} satisfies CSSProperties;
const attemptHistoryStyle = {
  ...feedbackSectionStyle,
  marginBottom: '1.5rem',
} satisfies CSSProperties;
const summaryHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
} satisfies CSSProperties;
const questionTitleStyle = {
  margin: '0 0 0.75rem',
  color: 'var(--ip-deep-purple)',
  fontFamily: 'Jost',
  fontSize: '1.35rem',
  fontWeight: 700,
  lineHeight: 1.4,
} satisfies CSSProperties;
const answerResponseStyle = {
  marginTop: '1rem',
  padding: '1rem',
  border: '1px solid var(--ip-purple)',
  backgroundColor: '#FFFFFF',
} satisfies CSSProperties;
const answerSectionTitleStyle = {
  margin: 0,
  color: 'var(--ip-deep-purple)',
  fontFamily: 'Jost',
  fontSize: '1.1rem',
  fontWeight: 700,
} satisfies CSSProperties;
const otherOptionsStyle = {
  marginTop: '1rem',
  borderTop: '1px solid #D1D5DB',
  paddingTop: '1rem',
} satisfies CSSProperties;
const otherOptionsSummaryStyle = {
  marginBottom: '0.75rem',
  color: 'var(--ip-deep-purple)',
  cursor: 'pointer',
  fontFamily: 'Jost',
  fontSize: '1.05rem',
  fontWeight: 700,
} satisfies CSSProperties;
const lockedFeedbackStyle = {
  ...emptyFeedbackStyle,
  marginBottom: '1.5rem',
} satisfies CSSProperties;
const lockedFeedbackTextStyle = {
  marginBottom: 0,
  color: 'var(--ip-deep-purple)',
  fontWeight: 600,
  lineHeight: 1.6,
} satisfies CSSProperties;
