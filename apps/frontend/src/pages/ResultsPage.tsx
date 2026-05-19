import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getQuizResult } from '../lib/quizApi';
import type { QuizResult } from '../lib/quizApi';

export function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const [result, setResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [attemptId]);

  if (isLoading) {
    return (
      <main className="quiz-results-page">
        <p>Loading quiz results…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="quiz-results-page">
        <h1>Quiz result unavailable</h1>
        <p role="alert">{error}</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="quiz-results-page">
        <h1>Quiz result unavailable</h1>
        <p role="alert">No result data was found.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  return (
    <main className="quiz-results-page">
      <header>
        <h1>Quiz results</h1>

        <p>
          Score: <strong>{result.scorePercentage}%</strong>
        </p>

        <p>
          Status: <strong>{result.passed ? 'Passed' : 'Not passed'}</strong>
        </p>

        {result.summary ? <p>{result.summary}</p> : null}
      </header>

      <section aria-labelledby="answer-feedback-heading">
        <h2 id="answer-feedback-heading">Answer feedback</h2>

        {result.answers.length === 0 ? (
          <p>No answer feedback was returned for this attempt.</p>
        ) : (
          result.answers.map((answer, index) => (
            <article key={answer.questionId}>
              <h3>Question {index + 1}</h3>

              <p>
                Result: <strong>{answer.isCorrect ? 'Correct' : 'Incorrect'}</strong>
              </p>

              {answer.awardedPoints !== null && answer.awardedPoints !== undefined ? (
                <p>Points awarded: {answer.awardedPoints}</p>
              ) : null}

              {answer.feedbackShown ? <p>{answer.feedbackShown}</p> : null}

              <ul>
                {answer.selectedOptions.map((option) => (
                  <li key={option.optionId}>
                    <p>
                      Selected: {option.label}. {option.text}
                    </p>

                    <p>
                      Option result:{' '}
                      <strong>{option.isCorrect ? 'Correct option' : 'Incorrect option'}</strong>
                    </p>

                    {option.feedbackText ? <p>{option.feedbackText}</p> : null}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>

      <Link to="/dashboard">Back to dashboard</Link>
    </main>
  );
}

export default ResultsPage;
