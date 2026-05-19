import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuiz, startQuizAttempt, submitQuizAttempt } from '../lib/quizApi';
import type { CampaignItemQuiz } from '../lib/quizApi';

type SelectedAnswers = Record<string, string>;

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const campaignItemId = quizId;

  const [quiz, setQuiz] = useState<CampaignItemQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isStartingAttempt, setIsStartingAttempt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    async function loadQuiz() {
      if (!campaignItemId) {
        setError('No campaign item was provided for this quiz.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const loadedQuiz = await getQuiz(campaignItemId);

        if (isActive) {
          setQuiz(loadedQuiz);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error ? loadError.message : 'The quiz could not be loaded.',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadQuiz();

    return () => {
      isActive = false;
    };
  }, [campaignItemId]);

  const answeredQuestionCount = useMemo(() => {
    return Object.keys(selectedAnswers).length;
  }, [selectedAnswers]);

  const allQuestionsAnswered = useMemo(() => {
    if (!quiz) {
      return false;
    }

    return quiz.questions.every((question) => Boolean(selectedAnswers[question.id]));
  }, [quiz, selectedAnswers]);

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
    if (attemptId) {
      return attemptId;
    }

    if (!campaignItemId) {
      throw new Error('No campaign item was provided for this quiz.');
    }

    setIsStartingAttempt(true);

    try {
      const attempt = await startQuizAttempt(campaignItemId);
      setAttemptId(attempt.attemptId);
      return attempt.attemptId;
    } finally {
      setIsStartingAttempt(false);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quiz) {
      return;
    }

    if (isSubmittingRef.current || isSubmitting || hasSubmitted) {
      return;
    }

    if (!allQuestionsAnswered) {
      setValidationMessage('Please answer every question before submitting the quiz.');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      setValidationMessage(null);

      const activeAttemptId = await ensureAttemptStarted();

      const answers = quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: [selectedAnswers[question.id]],
      }));

      await submitQuizAttempt(activeAttemptId, answers);

      setHasSubmitted(true);
      navigate(`/quiz-attempts/${activeAttemptId}/results`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'The quiz could not be submitted.',
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="quiz-page">
        <p>Loading quiz…</p>
      </main>
    );
  }

  if (error && !quiz) {
    return (
      <main className="quiz-page">
        <h1>Quiz unavailable</h1>
        <p role="alert">{error}</p>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="quiz-page">
        <h1>Quiz unavailable</h1>
        <p role="alert">No quiz content was found.</p>
      </main>
    );
  }

  return (
    <main className="quiz-page">
      <header>
        <p>
          Question {answeredQuestionCount} of {quiz.questions.length} answered
        </p>

        <h1>{quiz.title}</h1>

        {quiz.description ? <p>{quiz.description}</p> : null}

        {quiz.passThresholdPercentage !== null && quiz.passThresholdPercentage !== undefined ? (
          <p>Pass mark: {quiz.passThresholdPercentage}%</p>
        ) : null}
      </header>

      {error ? <p role="alert">{error}</p> : null}
      {validationMessage ? <p role="alert">{validationMessage}</p> : null}

      <form onSubmit={handleSubmit}>
        {quiz.questions.map((question, questionIndex) => (
          <fieldset key={question.id} disabled={isSubmitting || hasSubmitted}>
            <legend>
              {questionIndex + 1}. {question.text}
            </legend>

            {question.options.map((option) => {
              const inputId = `${question.id}-${option.id}`;

              return (
                <label key={option.id} htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={selectedAnswers[question.id] === option.id}
                    onChange={() => handleSelectAnswer(question.id, option.id)}
                  />
                  <span>
                    {option.label}. {option.text}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ))}

        <button type="submit" disabled={isSubmitting || isStartingAttempt || hasSubmitted}>
          {isSubmitting || isStartingAttempt ? 'Submitting…' : 'Submit quiz'}
        </button>
      </form>
    </main>
  );
}

export default QuizPage;
