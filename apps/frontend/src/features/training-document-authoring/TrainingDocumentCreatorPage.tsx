import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  TrainingDocuemtnDraftInputDto,
  TrainingDocumentAuthoringResponseDto,
} from '@insightful-phish/shared';
import AppLayout from '../../components/layout/AppLayout';
import { ApiError } from '../../lib/apiClient';
import type { TrainingDocumentAuthoringContext } from '../../lib/trainingApi';
import TrainingDocumentForm, { type TrainingDocumentFormAction } from './TrainingDocumentForm';
import {
  areTrainingDocumentDraftsEqual,
  createEmptyTrainingDocumentDraft,
  hasTrainingDocumentDraftErrors,
  toTrainingDocumentDraft,
  toTrainingDocumentRequest,
  validateTrainingDocumentDraft,
  type TrainingDocumentDraftErrors,
} from './trainingDocumentAuthoring';
import {
  apiTrainingDocumentAuthoringClient,
  type TrainingDocumentAuthoringClient,
} from './trainingDocumentAuthoringClient';

type TrainingDocumentCreatorPageProps = Readonly<{
  contextKind: TrainingDocumentAuthoringContext['kind'];
  client?: TrainingDocumentAuthoringClient;
  onAuthenticationExpired?: () => void;
}>;

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body !== null) {
    const body = error.body as { message?: unknown };

    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
  }

  return fallback;
}

function getDocumentPath(context: TrainingDocumentAuthoringContext, documentId: string): string {
  if (context.kind === 'organisation') {
    return `/organisations/${encodeURIComponent(context.organisationId)}/training-documents/${encodeURIComponent(documentId)}`;
  }

  return `/platform/training-documents/${encodeURIComponent(documentId)}`;
}

function TrainingDocumentCreatorPage({
  contextKind,
  client = apiTrainingDocumentAuthoringClient,
  onAuthenticationExpired,
}: TrainingDocumentCreatorPageProps) {
  const { organisationId, trainingDocumentId } = useParams<{
    organisationId: string;
    trainingDocumentId: string;
  }>();
  const navigate = useNavigate();
  const context = useMemo<TrainingDocumentAuthoringContext | null>(() => {
    if (contextKind === 'platform') {
      return { kind: 'platform' };
    }

    if (organisationId === undefined) {
      return null;
    }

    return { kind: 'organisation', organisationId };
  }, [contextKind, organisationId]);
  const [document, setDocument] = useState<TrainingDocumentAuthoringResponseDto | null>(null);
  const [draft, setDraft] = useState<TrainingDocuemtnDraftInputDto>(
    createEmptyTrainingDocumentDraft,
  );
  const [persistedDraft, setPersistedDraft] = useState<TrainingDocuemtnDraftInputDto>(
    createEmptyTrainingDocumentDraft,
  );
  const [errors, setErrors] = useState<TrainingDocumentDraftErrors>({});
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<TrainingDocumentFormAction | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadDocument() {
      setLoadError(null);

      if (context === null) {
        setLoadStatus('error');
        setLoadError('Organisation context is missing.');
        return;
      }

      if (trainingDocumentId === undefined) {
        const initialDraft = createEmptyTrainingDocumentDraft();
        setDocument(null);
        setDraft(initialDraft);
        setPersistedDraft(initialDraft);
        setErrors({});
        setLoadStatus('ready');
        return;
      }

      setLoadStatus('loading');
      try {
        const response = await client.getDocument(context, trainingDocumentId);
        if (isCurrent === true) {
          const loadedDraft = toTrainingDocumentDraft(response);
          setDocument(response);
          setDraft(loadedDraft);
          setPersistedDraft(loadedDraft);
          setErrors({});
          setLoadStatus('ready');
        }
      } catch (error) {
        if (isCurrent === true) {
          setLoadStatus('error');
          setLoadError(getRequestErrorMessage(error, 'Could not load this Training Document.'));
          if (error instanceof ApiError && error.status === 401) {
            onAuthenticationExpired?.();
          }
        }
      }
    }

    void loadDocument();

    return () => {
      isCurrent = false;
    };
  }, [client, context, onAuthenticationExpired, trainingDocumentId]);

  const isReadOnly = document !== null && document.status !== 'DRAFT';
  const isDirty = areTrainingDocumentDraftsEqual(draft, persistedDraft) === false;
  const backPath =
    context?.kind === 'organisation'
      ? `/organisations/${encodeURIComponent(context.organisationId)}/campaigns`
      : '/platform/campaigns';

  function handleDraftChange(patch: Partial<TrainingDocuemtnDraftInputDto>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setSaveFeedback(null);
  }

  async function handleSave() {
    if (context === null || isReadOnly === true || pendingAction !== null) {
      return;
    }

    const nextErrors = validateTrainingDocumentDraft(draft);
    setErrors(nextErrors);
    if (hasTrainingDocumentDraftErrors(nextErrors) === true) {
      return;
    }

    setPendingAction('save');
    setSaveFeedback(null);
    try {
      const request = toTrainingDocumentRequest(draft);
      const response =
        trainingDocumentId === undefined
          ? await client.createDraft(context, request)
          : await client.updateDraft(context, trainingDocumentId, request);
      const savedDraft = toTrainingDocumentDraft(response);
      setDocument(response);
      setDraft(savedDraft);
      setPersistedDraft(savedDraft);
      setSaveFeedback({ kind: 'success', text: 'Training Document draft saved.' });

      if (trainingDocumentId === undefined) {
        navigate(getDocumentPath(context, response.id), { replace: true });
      }
    } catch (error) {
      setSaveFeedback({
        kind: 'error',
        text: getRequestErrorMessage(error, 'Could not save this Training Document.'),
      });
      if (error instanceof ApiError && error.status === 401) {
        onAuthenticationExpired?.();
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <AppLayout contentStyle={{ backgroundColor: '#FFFFFF' }}>
      <main className="training-document-creator">
        <Link to={backPath}>Back to Campaigns</Link>
        <header>
          <h1>{trainingDocumentId === undefined ? 'Create Training Document' : draft.title}</h1>
          <p>{document === null ? 'New draft' : document.status}</p>
        </header>

        {loadStatus === 'loading' ? <p role="status">Loading Training Document...</p> : null}
        {loadError === null ? null : <p role="alert">{loadError}</p>}
        {saveFeedback === null ? null : (
          <p role={saveFeedback.kind === 'error' ? 'alert' : 'status'}>{saveFeedback.text}</p>
        )}
        {loadStatus === 'ready' ? (
          <TrainingDocumentForm
            draft={draft}
            errors={errors}
            readOnly={isReadOnly}
            pendingAction={pendingAction}
            showSave={isReadOnly === false}
            saveDisabled={trainingDocumentId === undefined ? false : isDirty === false}
            previewDisabled
            onChange={handleDraftChange}
            onSave={handleSave}
            onPreview={() => undefined}
          />
        ) : null}
      </main>
    </AppLayout>
  );
}

export default TrainingDocumentCreatorPage;
export { TrainingDocumentCreatorPage };
