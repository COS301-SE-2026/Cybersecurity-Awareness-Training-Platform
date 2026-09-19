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
    <section className="grid gap-6" aria-labelledby="quizzes-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="quizzes-heading"
            className="m-0 font-jost text-[1.65rem] font-medium text-dark-pink"
          >
            Quizzes
          </h2>
          <p className="mt-2 mb-0 font-overpass text-gray-600">
            Create and manage reusable quizzes for campaigns.
          </p>
        </div>
        <Link
          to={`${basePath}/new`}
          className="inline-flex items-center justify-center bg-main-purple px-4 py-3 font-jost text-white no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
        >
          Create Quiz
        </Link>
      </div>

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
      {!isLoading && !error && quizzes.length === 0 && (
        <div className="border border-gray-300 bg-gray-50 p-5 font-overpass text-gray-600">
          <p className="m-0">No quizzes yet.</p>
          <p className="mb-0">Create your first reusable quiz using the button above.</p>
        </div>
      )}
      {!isLoading && !error && quizzes.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex min-w-0 flex-col gap-4 border border-gray-300 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="m-0 min-w-0 break-words font-jost text-[1.35rem] font-medium text-purple">
                  {quiz.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex border px-2 py-1 font-jost text-sm font-medium ${
                      quiz.status === 'DRAFT'
                        ? 'border-purple-200 bg-purple-50 text-purple-800'
                        : quiz.status === 'PUBLISHED'
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : 'border-gray-300 bg-gray-100 text-gray-700'
                    }`}
                  >
                    {quiz.status}
                  </span>
                  <span className="inline-flex border border-gray-300 bg-gray-50 px-2 py-1 font-jost text-sm text-gray-700">
                    {quiz.difficultyLevel}
                  </span>
                </div>
              </div>
              <Link
                to={`${basePath}/${encodeURIComponent(quiz.id)}`}
                className="inline-flex self-end border border-purple px-4 py-2 font-jost font-medium text-purple no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
              >
                {quiz.status === 'DRAFT' ? 'Edit Quiz' : 'View Quiz'}
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
