import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingStatePanel } from '../components/training/TrainingStatePanel';
import { getQuizResult, quizRoutes, type GetQuizResultResponseDto } from '../lib/quizApi';

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const [result, setResult] = useState<GetQuizResultResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadResult() {
      if (!attemptId) {
        setErrorMessage('Quiz attempt identifier is missing.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const resultResponse = await getQuizResult(attemptId);

        if (isMounted) {
          setResult(resultResponse);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load quiz results.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      isMounted = false;
    };
  }, [attemptId, reloadToken]);

  const orderedAnswers = useMemo(() => result?.answers ?? [], [result]);

  if (isLoading) {
    return (
      <AppLayout>
        <TrainingStatePanel
          title="Loading results"
          message="Your quiz result feedback is being loaded."
        />
      </AppLayout>
    );
  }

  if (errorMessage) {
    return (
      <AppLayout>
        <TrainingStatePanel
          title="Unable to load results"
          message={errorMessage}
          action={
            <button
              type="button"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
              style={primaryButtonStyle}
            >
              Try Again
            </button>
          }
        />
      </AppLayout>
    );
  }

  if (!result) {
    return (
      <AppLayout>
        <TrainingStatePanel
          title="No result available"
          message="No quiz result feedback could be found for this attempt."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      contentStyle={{
        overflowY: 'auto',
        padding: '2rem',
      }}
    >
      <div style={pageShellStyle}>
        <section style={summaryCardStyle}>
          <p style={eyebrowStyle}>Quiz Results</p>
          <h1 style={titleStyle}>{result.passed ? 'Passed' : 'Not Passed'}</h1>

          <p style={scoreStyle}>{Math.round(result.scorePercentage)}%</p>

          <p style={descriptionStyle}>
            {result.summary ??
              'Your result was calculated by the backend response. Review the answer-level feedback below.'}
          </p>

          <p style={metaStyle}>Attempt: {result.attemptId}</p>
        </section>

        <section style={feedbackSectionStyle}>
          <h2 style={sectionTitleStyle}>Answer Feedback</h2>

          {orderedAnswers.length === 0 ? (
            <div style={emptyFeedbackStyle}>No answer-level feedback was returned.</div>
          ) : (
            <div style={answerListStyle}>
              {orderedAnswers.map((answer, answerIndex) => (
                <article key={answer.questionId} style={answerCardStyle}>
                  <div style={answerHeaderStyle}>
                    <h3 style={answerTitleStyle}>Question {answerIndex + 1}</h3>

                    {typeof answer.isCorrect === 'boolean' ? (
                      <span
                        style={{
                          ...statusPillStyle,
                          borderColor: answer.isCorrect ? '#00E6A8' : '#FF6B8A',
                          color: answer.isCorrect ? '#00E6A8' : '#FF9FB3',
                        }}
                      >
                        {answer.isCorrect ? 'Correct' : 'Needs Review'}
                      </span>
                    ) : null}
                  </div>

                  {typeof answer.awardedPoints === 'number' ? (
                    <p style={metaStyle}>Awarded points: {answer.awardedPoints}</p>
                  ) : null}

                  {answer.feedbackShown ? (
                    <p style={feedbackTextStyle}>{answer.feedbackShown}</p>
                  ) : null}

                  <div style={selectedOptionsStyle}>
                    {answer.selectedOptions.map((option) => (
                      <div key={option.optionId} style={selectedOptionStyle}>
                        <div style={selectedOptionHeaderStyle}>
                          <span style={optionLabelStyle}>{option.label}</span>
                          <span>{option.text}</span>
                        </div>

                        <p
                          style={{
                            ...optionStatusStyle,
                            color: option.isCorrect ? '#00E6A8' : '#FF9FB3',
                          }}
                        >
                          {option.isCorrect
                            ? 'Selected correct option'
                            : 'Selected incorrect option'}
                        </p>

                        {option.feedbackText ? (
                          <p style={feedbackTextStyle}>{option.feedbackText}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div style={actionRowStyle}>
          <Link to={quizRoutes.quiz(result.quizId)} style={secondaryLinkStyle}>
            Back to quiz
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

const pageShellStyle = {
  width: 'min(980px, 100%)',
  margin: '0 auto',
  color: '#FFFFFF',
  fontFamily: 'Overpass',
} satisfies CSSProperties;

const summaryCardStyle = {
  padding: '1.6rem',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
} satisfies CSSProperties;

const scoreStyle = {
  margin: '1rem 0',
  color: '#FFFFFF',
  fontFamily: 'Jost',
  fontSize: '3rem',
  fontWeight: 700,
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

const feedbackSectionStyle = {
  display: 'grid',
  gap: '1rem',
} satisfies CSSProperties;

const sectionTitleStyle = {
  margin: 0,
  fontFamily: 'Jost',
  fontSize: '1.5rem',
} satisfies CSSProperties;

const emptyFeedbackStyle = {
  padding: '1rem',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
} satisfies CSSProperties;

const answerListStyle = {
  display: 'grid',
  gap: '1rem',
} satisfies CSSProperties;

const answerCardStyle = {
  padding: '1.2rem',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
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

const statusPillStyle = {
  padding: '0.3rem 0.65rem',
  border: '1px solid',
  borderRadius: '999px',
  fontFamily: 'Jost',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
} satisfies CSSProperties;

const feedbackTextStyle = {
  color: '#D8CCE8',
  lineHeight: 1.6,
} satisfies CSSProperties;

const selectedOptionsStyle = {
  display: 'grid',
  gap: '0.75rem',
  marginTop: '1rem',
} satisfies CSSProperties;

const selectedOptionStyle = {
  padding: '0.85rem',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  backgroundColor: 'rgba(14, 0, 32, 0.58)',
} satisfies CSSProperties;

const selectedOptionHeaderStyle = {
  display: 'flex',
  gap: '0.6rem',
  alignItems: 'center',
} satisfies CSSProperties;

const optionLabelStyle = {
  color: '#FF00D4',
  fontFamily: 'Jost',
  fontWeight: 700,
} satisfies CSSProperties;

const optionStatusStyle = {
  margin: '0.6rem 0 0',
  fontWeight: 700,
} satisfies CSSProperties;

const actionRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '1.5rem 0 2rem',
} satisfies CSSProperties;

const secondaryLinkStyle = {
  color: '#FFFFFF',
  border: '1px solid #FF00D4',
  padding: '0.85rem 1.2rem',
  textDecoration: 'none',
  fontFamily: 'Jost',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
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
