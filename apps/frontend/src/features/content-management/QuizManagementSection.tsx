import type { ListQuizzesResponseDto } from '@insightful-phish/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../lib/apiClient';
import { listQuizzes, type QuizAuthoringScope } from '../quiz-authoring/quizAuthoringClient';

type QuizList = typeof listQuizzes;

export function QuizManagementSection({
  organisationId,
  list = listQuizzes,
}: Readonly<{
  organisationId: string | null;
  list?: QuizList;
}>) {
  const { clearAuth } = useAuth();
  const [quizzes, setQuizzes] = useState<ListQuizzesResponseDto['items']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const basePath =
    organisationId === null
      ? '/platform/quizzes'
      : `/organisations/${encodeURIComponent(organisationId)}/quizzes`;

  useEffect(() => {
    let active = true;
    const scope: QuizAuthoringScope =
      organisationId === null ? { kind: 'platform' } : { kind: 'organisation', organisationId };

    void list(scope)
      .then((response) => {
        if (active) setQuizzes(response.items);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError('Quizzes could not be loaded.');
        if (caught instanceof ApiError && caught.status === 401) clearAuth();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [organisationId, list, clearAuth, retryKey]);

  return (
    <section aria-labelledby="quizzes-heading">
      <h2 id="quizzes-heading">Quizzes</h2>
      <Link to={`${basePath}/new`}>Create Quiz</Link>

      {isLoading && <p role="status">Loading quizzes…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setRetryKey((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && quizzes.length === 0 && <p>No quizzes yet.</p>}
      {!isLoading && !error && quizzes.length > 0 && (
        <ul>
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <strong>{quiz.title}</strong> <span>{quiz.status}</span>{' '}
              <span>{quiz.difficultyLevel}</span>{' '}
              <Link to={`${basePath}/${encodeURIComponent(quiz.id)}`}>
                {quiz.status === 'DRAFT' ? 'Edit' : 'View'} {quiz.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PlatformQuizManagementPage() {
  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <main className="p-6">
        <h1>Platform Content Management</h1>
        <QuizManagementSection organisationId={null} />
      </main>
    </AppLayout>
  );
}
