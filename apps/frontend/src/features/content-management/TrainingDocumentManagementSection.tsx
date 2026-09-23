import type { TrainingDocumentManagementListItemDto } from '@insightful-phish/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BasicAlert from '../../components/alerts/BasicAlert';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import StatusBadge, { type DisplayStatus } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../lib/apiClient';
import {
  archiveTrainingDocument,
  listOrganisationTrainingDocuments,
  unarchiveTrainingDocument,
} from '../../lib/trainingApi';

type TrainingDocumentManagementSectionProps = Readonly<{
  organisationId: string;
  canManage: boolean;
}>;

type MutationTarget = Readonly<{
  document: TrainingDocumentManagementListItemDto;
  action: 'archive' | 'unarchive';
}>;

type Feedback = Readonly<{
  variant: 'success' | 'danger';
  text: string;
}>;

const CARD_ACTION_CLASS =
  'inline-flex cursor-pointer items-center justify-center gap-1 border border-purple bg-white px-3 py-2 font-jost font-medium text-purple no-underline hover:bg-faint-purple focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body !== null) {
    const message = (error.body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return fallback;
}

function getDisplayStatus(status: TrainingDocumentManagementListItemDto['status']): DisplayStatus {
  if (status === 'AVAILABLE') return 'Available';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Unavailable';
}

function getCardTone(status: TrainingDocumentManagementListItemDto['status']): string {
  if (status === 'AVAILABLE') return 'border-success-subtle/50 bg-success-soft/30';
  if (status === 'DRAFT') return 'border-brand-subtle/50 bg-brand-softer/30';
  return 'border-default-medium/50 bg-neutral-secondary-medium/30';
}

export function TrainingDocumentManagementSection({
  organisationId,
  canManage,
}: TrainingDocumentManagementSectionProps) {
  const { clearAuth } = useAuth();
  const [documents, setDocuments] = useState<TrainingDocumentManagementListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mutationTarget, setMutationTarget] = useState<MutationTarget | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const createPath = `/organisations/${encodeURIComponent(organisationId)}/training-documents/new`;

  useEffect(() => {
    let isCurrent = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError(null);

      void listOrganisationTrainingDocuments(organisationId)
        .then((result) => {
          if (isCurrent === true) setDocuments(result.items);
        })
        .catch((error: unknown) => {
          if (isCurrent !== true) return;
          setLoadError(getErrorMessage(error, 'Training Documents could not be loaded.'));
          if (error instanceof ApiError && error.status === 401) clearAuth();
        })
        .finally(() => {
          if (isCurrent === true) setIsLoading(false);
        });
    }, 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [clearAuth, organisationId, refreshKey]);

  async function confirmMutation(): Promise<void> {
    if (mutationTarget === null) return;
    setIsMutating(true);
    setFeedback(null);

    try {
      const context = { kind: 'organisation' as const, organisationId };
      if (mutationTarget.action === 'archive') {
        await archiveTrainingDocument(context, mutationTarget.document.id);
        setFeedback({ variant: 'success', text: 'Training Document Archived' });
      } else {
        await unarchiveTrainingDocument(context, mutationTarget.document.id);
        setFeedback({ variant: 'success', text: 'Training Document Restored as Draft' });
      }
      setMutationTarget(null);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFeedback({
        variant: 'danger',
        text: getErrorMessage(error, 'The Training Document could not be updated.'),
      });
      if (error instanceof ApiError && error.status === 401) clearAuth();
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <section className="grid gap-6 pb-16" aria-labelledby="training-documents-heading">
      {feedback === null ? null : (
        <BasicAlert variant={feedback.variant} onClose={() => setFeedback(null)}>
          {feedback.text}
        </BasicAlert>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="training-documents-heading"
            className="m-0 font-jost text-[1.65rem] font-medium text-dark-pink"
          >
            Training Documents
          </h2>
          <p className="mt-2 mb-0 font-overpass text-gray-600">
            Create and manage reusable training documents for campaigns.
          </p>
        </div>
        {canManage === true ? (
          <Link
            className="inline-flex cursor-pointer items-center justify-center gap-2 bg-main-purple px-4 py-3 font-jost text-xl leading-5 font-regular tracking-wider text-white no-underline hover:bg-hover-purple focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
            to={createPath}
          >
            <span className="material-symbols-sharp" aria-hidden="true">
              add_2
            </span>
            Create Training Document
          </Link>
        ) : null}
      </div>
      <h2 className="mt-2 mb-0 font-jost text-[1.65rem] font-medium text-dark-pink">
        All Training Documents ({documents.length})
      </h2>

      {isLoading === true ? (
        <p
          className="m-0 border border-gray-300 bg-gray-50 p-4 font-overpass text-gray-600"
          role="status"
        >
          Loading Training Documents...
        </p>
      ) : null}
      {loadError === null ? null : (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 border border-red-200 bg-red-50 p-4 font-overpass text-red-800"
        >
          <p className="m-0">{loadError}</p>
          <button
            type="button"
            className="cursor-pointer border border-current bg-white px-4 py-2 font-jost text-inherit focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {isLoading !== true && loadError === null && documents.length === 0 ? (
        <p className="m-0 border border-gray-300 bg-gray-50 p-4 font-overpass text-gray-600">
          No Training Documents have been created yet.
        </p>
      ) : null}

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-4">
        {documents.map((document) => {
          const editPath = `/organisations/${encodeURIComponent(organisationId)}/training-documents/${encodeURIComponent(document.id)}`;
          const isArchived = document.status === 'ARCHIVED';
          const trimmedSummary = document.contentSummary?.trim() ?? '';
          const hasSummary = trimmedSummary.length > 0;
          const summary = hasSummary === true ? trimmedSummary : 'No Summary Provided';
          return (
            <li
              key={document.id}
              className={`flex aspect-[4/3] min-w-0 flex-col justify-between gap-5 border-2 border-l-[0.55rem] p-5 ${getCardTone(document.status)}`}
            >
              <div className="min-w-0">
                <h3
                  className="mt-0 mb-[0.35rem] truncate font-jost text-[1.35rem] font-medium tracking-[0.04em] text-purple"
                  title={document.title}
                >
                  {document.title}
                </h3>
                <p
                  className={
                    hasSummary === true
                      ? 'm-0 line-clamp-2 break-words font-overpass text-base leading-6 tracking-[0.02em] text-gray-600'
                      : 'mt-1 font-jost text-md font-medium tracking-wider text-red-600'
                  }
                  title={summary}
                >
                  {summary}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 self-start">
                <StatusBadge status={getDisplayStatus(document.status)} />
                {canManage === true ? (
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    {document.status === 'DRAFT' ? (
                      <Link
                        className={CARD_ACTION_CLASS}
                        to={editPath}
                        title="Edit Training Document"
                        aria-label={`Edit ${document.title}`}
                      >
                        <span className="material-symbols-sharp text-[1.55rem]" aria-hidden="true">
                          edit
                        </span>
                        <span>Edit</span>
                      </Link>
                    ) : null}
                    {document.status === 'DRAFT' ? null : (
                      <Link
                        className={CARD_ACTION_CLASS}
                        to={editPath}
                        title="View Training Document"
                        aria-label={`View ${document.title}`}
                      >
                        <span className="material-symbols-sharp text-[1.55rem]" aria-hidden="true">
                          visibility
                        </span>
                        <span>View</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      className={`inline-flex cursor-pointer items-center justify-center gap-1 border bg-white px-3 py-2 font-jost font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)] ${isArchived === true ? 'border-emerald-700 text-emerald-700 hover:bg-success-soft' : 'border-red-700 text-red-800 hover:bg-danger-soft'}`}
                      title={
                        isArchived === true
                          ? 'Unarchive Training Document'
                          : 'Archive Training Document'
                      }
                      aria-label={`${isArchived === true ? 'Unarchive' : 'Archive'} ${document.title}`}
                      onClick={() =>
                        setMutationTarget({
                          document,
                          action: isArchived === true ? 'unarchive' : 'archive',
                        })
                      }
                    >
                      <span className="material-symbols-sharp text-[1.55rem]" aria-hidden="true">
                        {isArchived === true ? 'unarchive' : 'archive'}
                      </span>
                      <span>{isArchived === true ? 'Unarchive' : 'Archive'}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {mutationTarget === null ? null : (
        <BasicConfirmationModal
          title={`${mutationTarget.action === 'archive' ? 'Archive' : 'Unarchive'} Training Document`}
          message={
            mutationTarget.action === 'archive'
              ? `Archive ${mutationTarget.document.title}?`
              : `${mutationTarget.document.title} will be restored as an editable Draft.`
          }
          confirmButtonText={mutationTarget.action === 'archive' ? 'Archive' : 'Unarchive'}
          confirmButtonVariant={mutationTarget.action === 'archive' ? 'danger' : 'success'}
          isConfirming={isMutating}
          isConfirmDisabled={isMutating}
          isDismissDisabled={isMutating}
          onConfirm={() => void confirmMutation()}
          onCancel={() => setMutationTarget(null)}
        />
      )}
    </section>
  );
}
