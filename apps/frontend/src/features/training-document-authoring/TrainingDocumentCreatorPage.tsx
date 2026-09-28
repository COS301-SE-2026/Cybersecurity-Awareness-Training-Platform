import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  type BlockerFunction,
} from 'react-router-dom';
import type {
  ReusableContentGenerationRequestDto,
  TrainingDocuemtnDraftInputDto,
  TrainingDocumentAuthoringResponseDto,
} from '@insightful-phish/shared';
import AppLayout from '../../components/layout/AppLayout';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import BackNavigation from '../../components/BackNavigation';
import BasicAlert from '../../components/alerts/BasicAlert';
import TrainingDocumentReader from '../../components/training/TrainingDocumentReader';
import StatusBadge, { type DisplayStatus } from '../../components/ui/StatusBadge';
import { ApiError } from '../../lib/apiClient';
import type { TrainingDocumentAuthoringContext } from '../../lib/trainingApi';
import { GenerateWithAiDialog } from '../ai-generation/GenerateWithAiDialog';
import {
  readAiBuilderNavigationIntent,
  readAiBuilderReturnTo,
  readTrainingDocumentPrefill,
} from '../ai-generation/aiBuilderNavigation';
import {
  generateOrganisationContentVariant,
  generateTrainingDocumentDraft,
} from '../ai-generation/aiBuilderGenerationClient';
import {
  VariantQualityReview,
  type VariantQualityReviewState,
} from '../ai-generation/VariantQualityReview';
import TrainingDocumentForm, { type TrainingDocumentFormAction } from './TrainingDocumentForm';
import {
  areTrainingDocumentDraftsEqual,
  createEmptyTrainingDocumentDraft,
  hasTrainingDocumentDraftErrors,
  TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH,
  toTrainingDocumentDraft,
  toTrainingDocumentRequest,
  validateTrainingDocumentDraft,
  type TrainingDocumentDraftErrors,
} from './trainingDocumentAuthoring';
import {
  apiTrainingDocumentAuthoringClient,
  type TrainingDocumentAuthoringClient,
} from './trainingDocumentAuthoringClient';
import '../../pages/TrainingDocumentPage.css';
import './training-document-authoring.css';

type TrainingDocumentCreatorPageProps = Readonly<{
  contextKind: TrainingDocumentAuthoringContext['kind'];
  client?: TrainingDocumentAuthoringClient;
  onAuthenticationExpired?: () => void;
}>;

type BlockedNavigation = Readonly<{
  proceed: () => void;
  reset: () => void;
}>;

type ConfirmationIntent = 'activate' | 'reload' | 'leave' | null;

type TrainingDocumentNavigationBlockerProps = Readonly<{
  shouldBlock: BlockerFunction;
  onBlocked: (navigation: BlockedNavigation) => void;
}>;

function TrainingDocumentNavigationBlocker({
  shouldBlock,
  onBlocked,
}: TrainingDocumentNavigationBlockerProps) {
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      onBlocked({
        proceed: blocker.proceed,
        reset: blocker.reset,
      });
    }
  }, [blocker, onBlocked]);

  return null;
}

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

function getDocumentDisplayStatus(
  document: TrainingDocumentAuthoringResponseDto | null,
): DisplayStatus {
  switch (document?.status) {
    case 'DRAFT':
      return 'Draft';
    case 'AVAILABLE':
      return 'Available';
    case 'UNAVAILABLE':
      return 'Unavailable';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return 'New Draft';
  }
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
  const location = useLocation();
  const [aiNavigationIntent] = useState(() => readAiBuilderNavigationIntent(location.state));
  const [aiReturnTo] = useState(() => readAiBuilderReturnTo(location.state));
  const [proposalPrefill] = useState(() => readTrainingDocumentPrefill(location.state));
  const previewRequestIdRef = useRef(0);
  const blockedNavigationRef = useRef<BlockedNavigation | null>(null);
  const allowedNextNavigationRef = useRef(false);
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
  const [preview, setPreview] = useState<{
    html: string;
    markdownHash: string;
    sourceMarkdown: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [variantQualityReview, setVariantQualityReview] =
    useState<VariantQualityReviewState | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [confirmationIntent, setConfirmationIntent] = useState<ConfirmationIntent>(null);
  const currentMarkdownRef = useRef(draft.rawMarkdown);

  useEffect(() => {
    if (aiNavigationIntent || aiReturnTo || proposalPrefill) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [
    aiNavigationIntent,
    aiReturnTo,
    location.pathname,
    location.search,
    navigate,
    proposalPrefill,
  ]);

  useEffect(() => {
    let isCurrent = true;

    async function loadDocument() {
      previewRequestIdRef.current += 1;
      setPreview(null);
      setPreviewError(null);
      setLoadError(null);

      if (context === null) {
        setLoadStatus('error');
        setLoadError('Organisation context is missing.');
        return;
      }

      if (trainingDocumentId === undefined) {
        const initialDraft = proposalPrefill ?? createEmptyTrainingDocumentDraft();
        setDocument(null);
        setDraft(initialDraft);
        currentMarkdownRef.current = initialDraft.rawMarkdown;
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
          currentMarkdownRef.current = loadedDraft.rawMarkdown;
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
  }, [client, context, onAuthenticationExpired, proposalPrefill, trainingDocumentId]);

  const isReadOnly = document !== null && document.status !== 'DRAFT';
  const isDirty = areTrainingDocumentDraftsEqual(draft, persistedDraft) === false;
  const shouldBlockNavigation = useCallback<BlockerFunction>(
    () => isDirty === true && allowedNextNavigationRef.current === false,
    [isDirty],
  );
  const handleBlockedNavigation = useCallback((navigation: BlockedNavigation) => {
    blockedNavigationRef.current = navigation;
    setConfirmationIntent('leave');
  }, []);
  const backPath =
    context?.kind === 'organisation'
      ? `/organisations/${encodeURIComponent(context.organisationId)}/content/training-documents`
      : '/platform/campaigns';
  const backLabel =
    context?.kind === 'organisation' ? 'Back to Content Management' : 'Back to Campaigns';

  function handleDraftChange(patch: Partial<TrainingDocuemtnDraftInputDto>) {
    if (patch.rawMarkdown !== undefined) {
      currentMarkdownRef.current = patch.rawMarkdown;
    }
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setSaveFeedback(null);
    setPreviewError(null);
  }

  function handleGeneratedDraft(generatedDraft: TrainingDocuemtnDraftInputDto) {
    const nextDraft = {
      ...generatedDraft,
      categories: [...generatedDraft.categories],
    };
    currentMarkdownRef.current = nextDraft.rawMarkdown;
    setDraft(nextDraft);
    setErrors({});
    setSaveFeedback(null);
    setPreview(null);
    setPreviewError(null);
  }

  async function handleGenerateDraft(request: ReusableContentGenerationRequestDto) {
    if (context === null) {
      throw new Error('Organisation context is missing.');
    }

    try {
      if (aiNavigationIntent?.variant && context.kind === 'organisation') {
        const result = await generateOrganisationContentVariant(context.organisationId, {
          contentType: aiNavigationIntent.variant.contentType,
          targetDifficulty: request.requestedDifficulty,
          requestedCategories: request.requestedCategories,
          topic: request.topic,
          learningObjective: request.learningObjective,
          sourceConcept: aiNavigationIntent.variant.sourceConcept,
          ...(request.administratorGuidance
            ? { administratorGuidance: request.administratorGuidance }
            : {}),
        });
        if (result.contentType !== 'TRAINING_DOCUMENT') {
          throw new Error('AI generation returned the wrong content type.');
        }
        setVariantQualityReview({
          findings: result.findings,
          semanticReviewStatus: result.semanticReviewStatus,
        });
        return result.draft;
      }
      setVariantQualityReview(null);
      return await generateTrainingDocumentDraft(context, request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onAuthenticationExpired?.();
      }
      throw error;
    }
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
      currentMarkdownRef.current = savedDraft.rawMarkdown;
      setPersistedDraft(savedDraft);
      setSaveFeedback({ kind: 'success', text: 'Training Document Saved' });
      setLifecycleError(null);
      setHasConflict(false);

      if (trainingDocumentId === undefined) {
        allowedNextNavigationRef.current = true;
        navigate(getDocumentPath(context, response.id), {
          replace: true,
          state: aiReturnTo ? { aiGenerationReturnTo: aiReturnTo } : null,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setLifecycleError('This Training Document changed on the server. Reload it to continue.');
        setHasConflict(true);
        setSaveFeedback(null);
      } else {
        setSaveFeedback({
          kind: 'error',
          text: getRequestErrorMessage(error, 'Could not save this Training Document.'),
        });
      }
      if (error instanceof ApiError && error.status === 401) {
        onAuthenticationExpired?.();
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePreview() {
    if (context === null || pendingAction !== null) {
      return;
    }

    if (draft.rawMarkdown.length > TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH) {
      setErrors((current) => ({
        ...current,
        rawMarkdown: `Use ${TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH} characters or fewer.`,
      }));
      return;
    }

    const sourceMarkdown = draft.rawMarkdown;
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    setPendingAction('preview');
    setPreviewError(null);
    try {
      const response = await client.preview(context, { rawMarkdown: sourceMarkdown });
      if (
        previewRequestIdRef.current === requestId &&
        currentMarkdownRef.current === sourceMarkdown
      ) {
        setPreview({ ...response, sourceMarkdown });
      } else if (previewRequestIdRef.current === requestId) {
        setPreviewError('The Markdown changed while previewing. Preview it again.');
      }
    } catch (error) {
      if (previewRequestIdRef.current === requestId) {
        setPreviewError(
          getRequestErrorMessage(error, 'Preview is unavailable. You can still save this draft.'),
        );
        if (error instanceof ApiError && error.status === 401) {
          onAuthenticationExpired?.();
        }
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setPendingAction(null);
      }
    }
  }

  function requestActivation() {
    if (document?.status !== 'DRAFT' || pendingAction !== null) {
      return;
    }

    const nextErrors = validateTrainingDocumentDraft(draft, true);
    setErrors(nextErrors);
    if (hasTrainingDocumentDraftErrors(nextErrors) === true) {
      return;
    }

    if (isDirty === true) {
      setLifecycleError('Save your changes before activating this Training Document.');
      return;
    }

    setConfirmationIntent('activate');
  }

  async function confirmActivation() {
    if (context === null || trainingDocumentId === undefined || pendingAction !== null) {
      return;
    }

    setPendingAction('activate');
    setLifecycleError(null);
    try {
      const response = await client.activate(context, trainingDocumentId);
      const activatedDraft = toTrainingDocumentDraft(response);
      setDocument(response);
      setDraft(activatedDraft);
      currentMarkdownRef.current = activatedDraft.rawMarkdown;
      setPersistedDraft(activatedDraft);
      setSaveFeedback({ kind: 'success', text: 'Training Document Activated' });
      setConfirmationIntent(null);
      setHasConflict(false);
    } catch (error) {
      setLifecycleError(
        getRequestErrorMessage(error, 'Could not activate this Training Document.'),
      );
      setConfirmationIntent(null);
      if (error instanceof ApiError && error.status === 409) {
        setHasConflict(true);
      }
      if (error instanceof ApiError && error.status === 401) {
        onAuthenticationExpired?.();
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopy() {
    const canCopy = document?.status === 'AVAILABLE' || document?.status === 'ARCHIVED';
    if (
      context === null ||
      trainingDocumentId === undefined ||
      canCopy !== true ||
      pendingAction !== null
    ) {
      return;
    }

    setPendingAction('copy');
    setLifecycleError(null);
    try {
      const response = await client.copy(context, trainingDocumentId);
      navigate(getDocumentPath(context, response.id));
    } catch (error) {
      setLifecycleError(getRequestErrorMessage(error, 'Could not copy this Training Document.'));
      if (error instanceof ApiError && error.status === 401) {
        onAuthenticationExpired?.();
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmReload() {
    if (context === null || trainingDocumentId === undefined || pendingAction !== null) {
      return;
    }

    setPendingAction('reload');
    try {
      const response = await client.getDocument(context, trainingDocumentId);
      const reloadedDraft = toTrainingDocumentDraft(response);
      setDocument(response);
      setDraft(reloadedDraft);
      currentMarkdownRef.current = reloadedDraft.rawMarkdown;
      setPersistedDraft(reloadedDraft);
      setErrors({});
      setPreview(null);
      setPreviewError(null);
      setSaveFeedback(null);
      setLifecycleError(null);
      setHasConflict(false);
      setConfirmationIntent(null);
    } catch (error) {
      setLifecycleError(getRequestErrorMessage(error, 'Could not reload this Training Document.'));
      setConfirmationIntent(null);
    } finally {
      setPendingAction(null);
    }
  }

  const previewIsStale = preview !== null && preview.sourceMarkdown !== draft.rawMarkdown;

  useEffect(() => {
    blockedNavigationRef.current = null;
    allowedNextNavigationRef.current = false;
  }, [trainingDocumentId]);

  useEffect(() => {
    if (isDirty !== true) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  return (
    <AppLayout
      className="training-document-creator-layout"
      contentStyle={{ backgroundColor: '#ffffff' }}
    >
      <TrainingDocumentNavigationBlocker
        shouldBlock={shouldBlockNavigation}
        onBlocked={handleBlockedNavigation}
      />
      <main className="training-document-creator">
        <div className="training-document-creator__back">
          <BackNavigation to={backPath} label={backLabel} />
        </div>
        <header className="training-document-creator__header">
          <h1 className="training-document-creator__title">
            {trainingDocumentId === undefined ? 'Create Training Document' : draft.title}
          </h1>
          <StatusBadge status={getDocumentDisplayStatus(document)} />
        </header>

        {loadStatus === 'loading' ? (
          <p className="training-document-creator__message" role="status">
            Loading Training Document...
          </p>
        ) : null}
        {loadError === null ? null : (
          <BasicAlert variant="danger" onClose={() => setLoadError(null)}>
            {loadError}
          </BasicAlert>
        )}
        {saveFeedback === null ? null : (
          <BasicAlert
            variant={saveFeedback.kind === 'success' ? 'success' : 'danger'}
            onClose={() => setSaveFeedback(null)}
          >
            {saveFeedback.text}
          </BasicAlert>
        )}
        {previewError === null ? null : (
          <BasicAlert variant="danger" onClose={() => setPreviewError(null)}>
            {previewError}
          </BasicAlert>
        )}
        {lifecycleError === null ? null : (
          <BasicAlert
            variant="danger"
            onClose={() => {
              setLifecycleError(null);
              setHasConflict(false);
            }}
          >
            <span>{lifecycleError}</span>
            {hasConflict === true ? (
              <button
                className="training-document-creator__reload"
                type="button"
                onClick={() => setConfirmationIntent('reload')}
              >
                Reload Document
              </button>
            ) : null}
          </BasicAlert>
        )}
        {loadStatus === 'ready' ? (
          <>
            {context !== null && (isReadOnly === false || aiReturnTo) ? (
              <div className="mb-5 flex items-center justify-end gap-3">
                {aiReturnTo && (
                  <button
                    type="button"
                    className="border border-default bg-white px-4 py-2 font-jost text-purple"
                    onClick={() => navigate(aiReturnTo)}
                  >
                    Return to Campaign
                  </button>
                )}
                {isReadOnly === false && (
                  <GenerateWithAiDialog
                    scope={context.kind}
                    disabled={pendingAction !== null}
                    initiallyOpen={aiNavigationIntent?.autoOpenGenerateWithAi}
                    initialDifficulty={aiNavigationIntent?.requestedDifficulty}
                    initialCategories={aiNavigationIntent?.requestedCategories}
                    initialGuidance={aiNavigationIntent?.administratorGuidance}
                    onGenerate={handleGenerateDraft}
                    onGenerated={handleGeneratedDraft}
                  />
                )}
              </div>
            ) : null}

            {variantQualityReview && <VariantQualityReview {...variantQualityReview} />}

            <TrainingDocumentForm
              draft={draft}
              errors={errors}
              readOnly={isReadOnly}
              pendingAction={pendingAction}
              showSave={isReadOnly === false}
              showActivate={document?.status === 'DRAFT'}
              showCopy={document?.status === 'AVAILABLE' || document?.status === 'ARCHIVED'}
              saveDisabled={trainingDocumentId === undefined ? false : isDirty === false}
              activateDisabled={isDirty}
              previewDisabled={draft.rawMarkdown.length > TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH}
              onChange={handleDraftChange}
              onSave={handleSave}
              onPreview={handlePreview}
              onActivate={requestActivation}
              onCopy={handleCopy}
            />

            {preview === null ? null : (
              <section className="training-document-creator__preview" aria-label="Preview">
                <div className="training-document-creator__preview-heading">
                  <h2>Preview</h2>
                  {previewIsStale === true ? (
                    <p
                      className="font-jost font-medium tracking-wider text-md text-red-600"
                      role="status"
                    >
                      Preview Out of Date
                    </p>
                  ) : null}
                </div>
                <TrainingDocumentReader
                  resolvedContent={preview.html}
                  resolvedFormat="html"
                  borderWidth={2}
                />
              </section>
            )}
          </>
        ) : null}

        {confirmationIntent === null ? null : (
          <BasicConfirmationModal
            title={
              confirmationIntent === 'activate'
                ? 'Activate Training Document'
                : confirmationIntent === 'reload'
                  ? 'Reload document'
                  : 'Leave without Saving'
            }
            message={
              confirmationIntent === 'activate'
                ? 'The document will become read-only. You can copy it into a new draft later.'
                : confirmationIntent === 'reload'
                  ? 'Your unsaved local changes will be discarded and replaced with the server version.'
                  : 'Your local Training Document Draft changes will be lost.'
            }
            confirmButtonText={
              confirmationIntent === 'activate'
                ? 'Activate'
                : confirmationIntent === 'reload'
                  ? 'Reload'
                  : 'Leave without Saving'
            }
            confirmButtonVariant={confirmationIntent === 'activate' ? 'success' : 'danger'}
            isConfirming={pendingAction === 'activate' || pendingAction === 'reload'}
            isDismissDisabled={pendingAction === 'activate' || pendingAction === 'reload'}
            onConfirm={() => {
              if (confirmationIntent === 'activate') {
                void confirmActivation();
                return;
              }

              if (confirmationIntent === 'reload') {
                void confirmReload();
                return;
              }

              const blockedNavigation = blockedNavigationRef.current;
              blockedNavigationRef.current = null;
              setConfirmationIntent(null);
              blockedNavigation?.proceed();
            }}
            onCancel={() => {
              if (confirmationIntent === 'leave') {
                blockedNavigationRef.current?.reset();
                blockedNavigationRef.current = null;
              }

              setConfirmationIntent(null);
            }}
          />
        )}
      </main>
    </AppLayout>
  );
}

export default TrainingDocumentCreatorPage;
export { TrainingDocumentCreatorPage };
