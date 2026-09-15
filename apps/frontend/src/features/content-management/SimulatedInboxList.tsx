import type {
  ListSimulatedInboxesQuery,
  SimulatedInboxListResponse,
} from '@insightful-phish/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPagesSearchSVG from '../../components/AdminPagesSearchSVG';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import { useAuth } from '../../context/useAuth';
import type { SimulatedInboxManagementClient } from './simulatedInboxClient';
import { formatContentUpdatedAt, getSimulatedInboxError } from './simulatedInboxPresentation';

const initialQuery: ListSimulatedInboxesQuery = { page: 1, limit: 20 };

export function SimulatedInboxList({
  organisationId,
  canManage,
  client,
}: Readonly<{
  organisationId: string;
  canManage: boolean;
  client: SimulatedInboxManagementClient;
}>) {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [query, setQuery] = useState<ListSimulatedInboxesQuery>(initialQuery);
  const [result, setResult] = useState<SimulatedInboxListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const requestRef = useRef(0);
  const root = `/organisations/${encodeURIComponent(organisationId)}/content/simulated-inboxes`;

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.list(organisationId, query);
      if (requestRef.current === requestId) setResult(response);
    } catch (cause) {
      if (requestRef.current !== requestId) return;
      const presentation = getSimulatedInboxError(
        cause,
        'Simulated inboxes could not be loaded. Try again.',
      );
      if (presentation.unauthorized) clearAuth();
      setResult(null);
      setError(presentation.message);
    } finally {
      if (requestRef.current === requestId) setIsLoading(false);
    }
  }, [clearAuth, client, organisationId, query]);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => void load(), 0);
    return () => {
      globalThis.clearTimeout(timeoutId);
      requestRef.current += 1;
    };
  }, [load]);

  const copy = async (simulationId: string) => {
    if (copyingId) return;
    setCopyingId(simulationId);
    setError(null);
    try {
      const created = await client.copy(organisationId, simulationId);
      navigate(`${root}/${created.id}`);
    } catch (cause) {
      const presentation = getSimulatedInboxError(
        cause,
        'The Active inbox could not be copied. Try again.',
      );
      if (presentation.unauthorized) clearAuth();
      setError(presentation.message);
    } finally {
      setCopyingId(null);
    }
  };

  const hasFilters = Boolean(query.search || query.lifecycleStatus);
  const isEmpty = !isLoading && !error && result?.pagination.total === 0;

  return (
    <section className="simulated-inboxes" aria-labelledby="simulated-inboxes-heading">
      <div className="email-library__heading">
        <div>
          <h2 id="simulated-inboxes-heading">Simulated Inboxes</h2>
          <p>Build ordered email experiences for campaign simulations.</p>
        </div>
        {canManage && (
          <button
            className="email-library-button email-library-button--primary"
            type="button"
            onClick={() => navigate(`${root}/new`)}
          >
            Create Inbox
          </button>
        )}
      </div>

      <div className="email-library__filters" aria-label="Simulated inbox search and filters">
        <div className="email-library__search">
          <label htmlFor="simulated-inbox-search">Search inboxes</label>
          <div>
            <AdminPagesSearchSVG />
            <input
              id="simulated-inbox-search"
              type="search"
              value={query.search ?? ''}
              placeholder="Search title or description"
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  page: 1,
                  search: event.target.value || undefined,
                }))
              }
            />
          </div>
        </div>
        <div className="email-library__filter">
          <label htmlFor="simulated-inbox-status">Lifecycle</label>
          <select
            id="simulated-inbox-status"
            value={query.lifecycleStatus ?? ''}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                page: 1,
                lifecycleStatus:
                  event.target.value === ''
                    ? undefined
                    : (event.target.value as NonNullable<
                        ListSimulatedInboxesQuery['lifecycleStatus']
                      >),
              }))
            }
          >
            <option value="">Draft and Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="content-management-state" aria-live="polite">
          <span>
            <LoadingSpinnerSVG />
          </span>
          Loading simulated inboxes…
        </div>
      )}
      {!isLoading && error && (
        <div className="content-management-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {isEmpty && (
        <div className="content-management-state">
          {hasFilters
            ? 'No inboxes match your search or filter.'
            : 'No simulated inboxes have been created yet.'}
        </div>
      )}
      {!isLoading && !error && result && result.items.length > 0 && (
        <>
          <div className="simulated-inbox-list" aria-label="Simulated inboxes">
            {result.items.map((inbox) => (
              <article key={inbox.id} className="simulated-inbox-list__card">
                <div className="simulated-inbox-list__card-heading">
                  <span
                    className={`email-library-status email-library-status--${inbox.lifecycleStatus.toLowerCase()}`}
                  >
                    {inbox.lifecycleStatus === 'ACTIVE' ? 'Active' : 'Draft'}
                  </span>
                  <span className="simulated-inbox-list__difficulty">
                    {inbox.difficultyLevel.charAt(0) + inbox.difficultyLevel.slice(1).toLowerCase()}
                  </span>
                </div>
                <h3>{inbox.title || 'Untitled inbox'}</h3>
                <p>{inbox.description || 'No description'}</p>
                <dl>
                  <div>
                    <dt>Emails</dt>
                    <dd>{inbox.emailCount}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatContentUpdatedAt(inbox.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="simulated-inbox-list__actions">
                  <button
                    className="email-library-button"
                    type="button"
                    onClick={() => navigate(`${root}/${inbox.id}`)}
                  >
                    {inbox.lifecycleStatus === 'ACTIVE' ? 'View' : 'Open Draft'}
                  </button>
                  {canManage && inbox.lifecycleStatus === 'ACTIVE' && (
                    <button
                      className="email-library-button"
                      type="button"
                      disabled={copyingId !== null}
                      onClick={() => void copy(inbox.id)}
                    >
                      {copyingId === inbox.id ? 'Copying…' : 'Copy to new Draft'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {result.pagination.totalPages > 1 && (
            <nav className="email-library__pagination" aria-label="Simulated inbox pagination">
              <button
                type="button"
                disabled={query.page <= 1}
                onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              >
                Previous
              </button>
              <span>
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={query.page >= result.pagination.totalPages}
                onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
