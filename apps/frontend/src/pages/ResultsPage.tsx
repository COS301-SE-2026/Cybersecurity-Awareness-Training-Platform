import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingAsyncContent } from '../components/training/TrainingAsyncContent';
import { trainingStateActionStyle } from '../components/training/trainingStateStyles';
import { getQuizResult } from '../lib/quizApi';
import type { QuizResult } from '../lib/quizApi';

export function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const [result, setResult] = useState<QuizResult | null>(null);
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

  const orderedAnswers = useMemo(() => result?.answers ?? [], [result]);
  const hasResult = result !== null;
  const backToQuizPath = result?.campaignItemId
    ? `/quizzes/${result.campaignItemId}`
    : '/campaigns';
  const backToQuizLabel = result?.campaignItemId ? 'Back to quiz' : 'Back to campaigns';

  return (
    <AppLayout
      contentStyle={{
        overflowY: 'auto',
        padding: '2rem',
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

            <section style={feedbackSectionStyle} aria-labelledby="answer-feedback-heading">
              <h2 id="answer-feedback-heading" style={sectionTitleStyle}>
                Answer Feedback
              </h2>

              {orderedAnswers.length === 0 ? (
                <div style={emptyFeedbackStyle}>No answer-level feedback was returned.</div>
              ) : (
                <div style={answerListStyle}>
                  {orderedAnswers.map((answer, index) => (
                    <article key={answer.questionId} style={answerCardStyle}>
                      <div style={answerHeaderStyle}>
                        <h3 style={answerTitleStyle}>Question {index + 1}</h3>

                        <span
                          style={{
                            ...statusPillStyle,
                            borderColor: answer.isCorrect ? '#00E6A8' : '#FF6B8A',
                            color: answer.isCorrect ? '#00E6A8' : '#FF9FB3',
                          }}
                        >
                          {answer.isCorrect ? 'Correct' : 'Needs Review'}
                        </span>
                      </div>

                      {answer.awardedPoints !== null && answer.awardedPoints !== undefined ? (
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
              <Link to={backToQuizPath} style={secondaryLinkStyle}>
                {backToQuizLabel}
              </Link>
            </div>
          </div>
        ) : null}
      </TrainingAsyncContent>
    </AppLayout>
  );
}

export default ResultsPage;

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
