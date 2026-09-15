import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  TrainingDocuemtnDraftInputDto,
  TrainingDocumentAuthoringResponseDto,
} from '@insightful-phish/shared';
import AppLayout from '../../components/layout/AppLayout';
import { ApiError } from '../../lib/apiClient';
import type { TrainingDocumentAuthoringContext } from '../../lib/trainingApi';
import TrainingDocumentForm from './TrainingDocumentForm';
import {
  createEmptyTrainingDocumentDraft,
  toTrainingDocumentDraft,
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

function TrainingDocumentCreatorPage({
  contextKind,
  client = apiTrainingDocumentAuthoringClient,
  onAuthenticationExpired,
}: TrainingDocumentCreatorPageProps) {
  const { organisationId, trainingDocumentId } = useParams<{
    organisationId: string;
    trainingDocumentId: string;
  }>();
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
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

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
        setDocument(null);
        setDraft(createEmptyTrainingDocumentDraft());
        setLoadStatus('ready');
        return;
      }

      setLoadStatus('loading');
      try {
        const response = await client.getDocument(context, trainingDocumentId);
        if (isCurrent === true) {
          setDocument(response);
          setDraft(toTrainingDocumentDraft(response));
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
  const backPath =
    context?.kind === 'organisation'
      ? `/organisations/${encodeURIComponent(context.organisationId)}/campaigns`
      : '/platform/campaigns';

  function handleDraftChange(patch: Partial<TrainingDocuemtnDraftInputDto>) {
    setDraft((current) => ({ ...current, ...patch }));
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
        {loadStatus === 'ready' ? (
          <TrainingDocumentForm
            draft={draft}
            errors={{}}
            readOnly={isReadOnly}
            showSave={isReadOnly === false}
            saveDisabled
            previewDisabled
            onChange={handleDraftChange}
            onSave={() => undefined}
            onPreview={() => undefined}
          />
        ) : null}
      </main>
    </AppLayout>
  );
}

export default TrainingDocumentCreatorPage;
export { TrainingDocumentCreatorPage };
