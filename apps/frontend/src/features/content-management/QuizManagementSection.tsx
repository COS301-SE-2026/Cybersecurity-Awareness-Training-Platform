import type { ListQuizzesResponseDto } from '@insightful-phish/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../lib/apiClient';
import { listQuizzes, type QuizAuthoringScope } from '../quiz-authoring/quizAuthoringClient';
import StatusBadge from '../../components/ui/StatusBadge';

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
          className="inline-flex cursor-pointer items-center justify-center gap-2 bg-main-purple px-4 py-3 font-jost text-xl leading-5 font-regular tracking-wider text-white no-underline hover:bg-hover-purple focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
        >
          <span className="material-symbols-sharp" aria-hidden="true">
            add_2
          </span>
          Create Quiz
        </Link>
      </div>

      {isLoading && (
        <p
          className="m-0 border border-gray-300 bg-gray-50 p-5 font-overpass text-gray-600"
          role="status"
        >
          Loading quizzes…
        </p>
      )}
      {error && (
        <div
          className="flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 p-5 font-overpass text-red-800"
          role="alert"
        >
          <p className="m-0">{error}</p>
          <button
            type="button"
            className="cursor-pointer border border-current bg-white px-4 py-2 font-jost text-inherit focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
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
          <p className="m-0">No quizzes have been created yet.</p>
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
                  <StatusBadge
                    status={
                      quiz.status === 'DRAFT'
                        ? 'Draft'
                        : quiz.status === 'PUBLISHED'
                          ? 'Active'
                          : 'Archived'
                    }
                  />
                  <span className="inline-flex border border-gray-300 bg-gray-50 px-2 py-1 font-jost text-sm text-gray-700">
                    {quiz.difficultyLevel}
                  </span>
                </div>
              </div>
              <Link
                to={`${basePath}/${encodeURIComponent(quiz.id)}`}
                className="inline-flex self-end border border-purple px-4 py-2 font-jost font-medium text-purple no-underline hover:bg-faint-purple focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
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
