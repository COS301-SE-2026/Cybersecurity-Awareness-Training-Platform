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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body !== null) {
    const message = (error.body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return fallback;
}

function getDisplayStatus(status: TrainingDocumentManagementListItemDto['status']): DisplayStatus {
  if (status === 'AVAILABLE') return 'Active';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Unavailable';
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
    <section className="training-document-management" aria-labelledby="training-documents-heading">
      {feedback === null ? null : (
        <BasicAlert variant={feedback.variant} onClose={() => setFeedback(null)}>
          {feedback.text}
        </BasicAlert>
      )}
      <div className="training-document-management__create">
        <h2 id="training-documents-heading">Create and Activate a Training Document</h2>
        {canManage === true ? (
          <Link className="training-document-management__create-button" to={createPath}>
            Create
          </Link>
        ) : null}
      </div>
      <h2 className="training-document-management__list-heading">
        All Training Documents ({documents.length})
      </h2>

      {isLoading === true ? <p role="status">Loading Training Documents...</p> : null}
      {loadError === null ? null : (
        <div role="alert" className="training-document-management__error">
          <p>{loadError}</p>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)}>
            Retry
          </button>
        </div>
      )}
      {isLoading !== true && loadError === null && documents.length === 0 ? (
        <p className="training-document-management__empty">
          No Training Documents have been created yet.
        </p>
      ) : null}

      <ul className="training-document-management__list">
        {documents.map((document) => {
          const editPath = `/organisations/${encodeURIComponent(organisationId)}/training-documents/${encodeURIComponent(document.id)}`;
          const isArchived = document.status === 'ARCHIVED';
          return (
            <li
              key={document.id}
              className={`training-document-card training-document-card--${document.status.toLowerCase()}`}
            >
              <div className="training-document-card__content">
                <h3>{document.title}</h3>
                <p>{document.contentSummary?.trim() || 'No Summary Provided'}</p>
              </div>
              <div className="training-document-card__controls">
                <StatusBadge status={getDisplayStatus(document.status)} />
                {canManage === true ? (
                  <div className="training-document-card__actions">
                    {document.status === 'DRAFT' ? <Link to={editPath}>Edit</Link> : null}
                    <button
                      type="button"
                      onClick={() =>
                        setMutationTarget({
                          document,
                          action: isArchived === true ? 'unarchive' : 'archive',
                        })
                      }
                    >
                      {isArchived === true ? 'Unarchive' : 'Archive'}
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
