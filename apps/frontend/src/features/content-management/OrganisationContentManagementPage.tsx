import type {
  ListOrganisationEmailsQuery,
  OrganisationEmailDraftInput,
  OrganisationEmailListResponse,
  OrganisationEmailManagementDetailResponse,
  ReusableContentGenerationRequestDto,
} from '@insightful-phish/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Navigate,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  type BlockerFunction,
} from 'react-router-dom';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import AdminPagesSearchSVG from '../../components/AdminPagesSearchSVG';
import { useAuth } from '../../context/useAuth';
import {
  activateOrganisationEmail,
  copyOrganisationEmail,
  getOrganisationEmail,
  getOrganisationEmails,
  registerOrganisationEmail,
  updateOrganisationEmail,
} from '../../lib/campaignsApi';
import { ApiError } from '../../lib/apiClient';
import { GenerateWithAiDialog } from '../ai-generation/GenerateWithAiDialog';
import {
  readAiBuilderReturnTo,
  readOrganisationEmailPrefill,
} from '../ai-generation/aiBuilderNavigation';
import { generateOrganisationEmailDraft } from '../ai-generation/aiBuilderGenerationClient';
import { EmailBuilder, type EmailBuilderFieldErrors } from '../email-authoring/EmailBuilder';
import { createEmptyOrganisationEmailDraft } from '../email-authoring/emailDraft';
import { ContentManagementShell, type ContentManagementSection } from './ContentManagementShell';
import { SimulatedInboxList } from './SimulatedInboxList';
import { TrainingDocumentManagementSection } from './TrainingDocumentManagementSection';
import { QuizManagementSection } from './QuizManagementSection';
import {
  simulatedInboxManagementClient,
  type SimulatedInboxManagementClient,
} from './simulatedInboxClient';
import './content-management.css';
import StatusBadge from '../../components/ui/StatusBadge';

type OrganisationEmailLibraryClient = Readonly<{
  list: typeof getOrganisationEmails;
  get: typeof getOrganisationEmail;
  register: typeof registerOrganisationEmail;
  update: typeof updateOrganisationEmail;
  activate: typeof activateOrganisationEmail;
  copy: typeof copyOrganisationEmail;
}>;

type OrganisationContentManagementPageProps = Readonly<{
  section: ContentManagementSection;
  client?: OrganisationEmailLibraryClient;
  simulatedInboxClient?: SimulatedInboxManagementClient;
}>;

const apiClient: OrganisationEmailLibraryClient = {
  list: getOrganisationEmails,
  get: getOrganisationEmail,
  register: registerOrganisationEmail,
  update: updateOrganisationEmail,
  activate: activateOrganisationEmail,
  copy: copyOrganisationEmail,
};

const initialQuery: ListOrganisationEmailsQuery = { page: 1, limit: 20 };

type BlockedNavigation = Readonly<{
  proceed: () => void;
  reset: () => void;
}>;

function EmailLibraryNavigationBlocker({
  shouldBlock,
  onBlocked,
}: Readonly<{
  shouldBlock: BlockerFunction;
  onBlocked: (navigation: BlockedNavigation) => void;
}>) {
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      onBlocked({ proceed: blocker.proceed, reset: blocker.reset });
    }
  }, [blocker, onBlocked]);

  return null;
}

function detailToDraft(
  email: OrganisationEmailManagementDetailResponse,
): OrganisationEmailDraftInput {
  return {
    senderLabel: email.senderLabel,
    senderAddress: email.senderAddress,
    subject: email.subject,
    preview: email.preview,
    bodyHtml: email.bodyHtml,
    link: email.link,
    expectedClassification: email.expectedClassification,
    redFlags: email.redFlags,
    categories: email.categories,
    difficultyLevel: email.difficultyLevel,
    portalTemplateId: email.portalTemplateId,
  };
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isErrorRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorString(value: Record<string, unknown>, property: string): string {
  const candidate = value[property];
  return typeof candidate === 'string' ? candidate : '';
}

function readErrorField(detail: Record<string, unknown>): string {
  const field = readErrorString(detail, 'field');
  if (field) return field;
  if (!Array.isArray(detail.path)) return '';
  return detail.path.join('.');
}

function collectFieldErrors(details: unknown[]): EmailBuilderFieldErrors {
  const fieldErrors: Record<string, string> = {};
  for (const detail of details) {
    if (!isErrorRecord(detail)) continue;
    const field = readErrorField(detail);
    const message = readErrorString(detail, 'message');
    if (field && message) fieldErrors[field] ??= message;
  }
  return fieldErrors;
}

function getEditorHeading(
  isCreating: boolean,
  status: OrganisationEmailManagementDetailResponse['status'] | undefined,
) {
  if (isCreating) return 'New Email Draft';
  return status === 'ACTIVE' ? 'Active Email' : 'Email Draft';
}

function getSaveDraftLabel(isSaving: boolean, isCreating: boolean) {
  if (isSaving) return 'Saving…';
  return isCreating ? 'Create Draft' : 'Save Draft';
}

function getApiError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return { message: fallback, fieldErrors: {} as EmailBuilderFieldErrors, unauthorized: false };
  }

  const body = isErrorRecord(error.body) ? error.body : null;
  const responseMessage = body ? readErrorString(body, 'message').trim() : '';
  const message = responseMessage || error.message || fallback;
  const details = Array.isArray(body?.details) ? body.details : [];
  const fieldErrors = collectFieldErrors(details);

  return { message, fieldErrors, unauthorized: error.status === 401 };
}

function EmailLibrary({
  organisationId,
  canManage,
  client,
}: Readonly<{
  organisationId: string;
  canManage: boolean;
  client: OrganisationEmailLibraryClient;
}>) {
  const { clearAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [proposalPrefill] = useState(() => readOrganisationEmailPrefill(location.state));
  const [aiReturnTo] = useState(() => readAiBuilderReturnTo(location.state));
  const [query, setQuery] = useState<ListOrganisationEmailsQuery>(initialQuery);
  const [result, setResult] = useState<OrganisationEmailListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrganisationEmailManagementDetailResponse | null>(null);
  const [draft, setDraft] = useState<OrganisationEmailDraftInput | null>(proposalPrefill);
  const [isCreating, setIsCreating] = useState(Boolean(proposalPrefill));
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EmailBuilderFieldErrors>({});
  const [operationError, setOperationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showActivationConfirmation, setShowActivationConfirmation] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [blockedNavigation, setBlockedNavigation] = useState<BlockedNavigation | null>(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const operationInFlightRef = useRef(false);
  const allowedNavigationRef = useRef(false);

  useEffect(() => {
    if (proposalPrefill || aiReturnTo) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [aiReturnTo, location.pathname, location.search, navigate, proposalPrefill]);

  const loadList = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setIsLoading(true);
    setListError(null);
    try {
      const response = await client.list(organisationId, query);
      if (listRequestRef.current === requestId) setResult(response);
    } catch (error) {
      if (listRequestRef.current !== requestId) return;
      const presentation = getApiError(error, 'Email library could not be loaded. Try again.');
      if (presentation.unauthorized) clearAuth();
      setResult(null);
      setListError(presentation.message);
    } finally {
      if (listRequestRef.current === requestId) setIsLoading(false);
    }
  }, [clearAuth, client, organisationId, query]);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => void loadList(), 0);
    return () => {
      globalThis.clearTimeout(timeoutId);
      listRequestRef.current += 1;
    };
  }, [loadList]);

  const openEmail = async (emailId: string) => {
    const requestId = ++detailRequestRef.current;
    setIsCreating(false);
    setIsDetailLoading(true);
    setDetailError(null);
    setOperationError(null);
    setFieldErrors({});
    setNotice(null);
    try {
      const email = await client.get(organisationId, emailId);
      if (detailRequestRef.current !== requestId) return;
      setSelected(email);
      setDraft(detailToDraft(email));
    } catch (error) {
      if (detailRequestRef.current !== requestId) return;
      const presentation = getApiError(error, 'Email details could not be loaded. Try again.');
      if (presentation.unauthorized) clearAuth();
      setSelected(null);
      setDraft(null);
      setDetailError(presentation.message);
    } finally {
      if (detailRequestRef.current === requestId) setIsDetailLoading(false);
    }
  };

  const beginCreate = () => {
    detailRequestRef.current += 1;
    setSelected(null);
    setDraft(createEmptyOrganisationEmailDraft());
    setIsCreating(true);
    setIsDetailLoading(false);
    setDetailError(null);
    setOperationError(null);
    setFieldErrors({});
    setNotice(null);
  };

  const handleOperationError = (error: unknown, fallback: string) => {
    const presentation = getApiError(error, fallback);
    if (presentation.unauthorized) clearAuth();
    setFieldErrors(presentation.fieldErrors);
    setOperationError(presentation.message);
  };

  const refreshAfterMutation = async (email: OrganisationEmailManagementDetailResponse) => {
    setSelected(email);
    setDraft(detailToDraft(email));
    setIsCreating(false);
    await loadList();
  };

  const generateEmailDraft = async (request: ReusableContentGenerationRequestDto) => {
    try {
      return await generateOrganisationEmailDraft(organisationId, request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
      }
      throw error;
    }
  };

  const applyGeneratedEmailDraft = (generatedDraft: OrganisationEmailDraftInput) => {
    setDraft({
      ...generatedDraft,
      link: null,
      redFlags: generatedDraft.redFlags.map((redFlag) => ({ ...redFlag })),
      categories: [...generatedDraft.categories],
    });
    setFieldErrors({});
    setOperationError(null);
    setNotice(null);
  };

  const saveDraft = async () => {
    if (!draft || !canManage || operationInFlightRef.current) return;
    operationInFlightRef.current = true;
    setIsSaving(true);
    setOperationError(null);
    setFieldErrors({});
    setNotice(null);
    try {
      if (isCreating) {
        const response = await client.register(organisationId, draft);
        await refreshAfterMutation(response.email);
        setNotice(
          response.reused
            ? 'An exact equivalent already existed. The existing library email is now open.'
            : 'Email Draft created.',
        );
      } else if (selected?.status === 'DRAFT') {
        const email = await client.update(organisationId, selected.id, draft);
        await refreshAfterMutation(email);
        setNotice('Email Draft saved.');
      }
    } catch (error) {
      handleOperationError(error, 'Email Draft could not be saved. Try again.');
    } finally {
      operationInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const activateDraft = async () => {
    if (!selected || selected.status !== 'DRAFT' || !canManage || operationInFlightRef.current) {
      return;
    }
    operationInFlightRef.current = true;
    setIsSaving(true);
    setOperationError(null);
    setFieldErrors({});
    try {
      const email = await client.activate(organisationId, selected.id);
      await refreshAfterMutation(email);
      setShowActivationConfirmation(false);
      setNotice('Email activated and ready for selection.');
    } catch (error) {
      setShowActivationConfirmation(false);
      handleOperationError(error, 'Email could not be activated. Review the highlighted fields.');
    } finally {
      operationInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const copyActive = async () => {
    if (!selected || selected.status !== 'ACTIVE' || !canManage || operationInFlightRef.current) {
      return;
    }
    operationInFlightRef.current = true;
    setIsSaving(true);
    setOperationError(null);
    setFieldErrors({});
    try {
      const email = await client.copy(organisationId, selected.id);
      await refreshAfterMutation(email);
      setNotice('Active email copied into a new Draft.');
    } catch (error) {
      handleOperationError(error, 'Email could not be copied. Try again.');
    } finally {
      operationInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const hasFilters = Boolean(query.search || query.status);
  const isEmpty = !isLoading && !listError && result?.pagination.total === 0;
  const editorReadOnly = !canManage || selected?.status === 'ACTIVE';
  const hasUnsavedChanges = Boolean(
    draft &&
    (isCreating
      ? JSON.stringify(draft) !== JSON.stringify(createEmptyOrganisationEmailDraft())
      : selected && JSON.stringify(draft) !== JSON.stringify(detailToDraft(selected))),
  );
  const isEditorOpen =
    isCreating || selected !== null || draft !== null || isDetailLoading || detailError !== null;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      !allowedNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
    [hasUnsavedChanges],
  );

  const handleBlockedNavigation = useCallback((navigation: BlockedNavigation) => {
    setBlockedNavigation(navigation);
    setShowDiscardConfirmation(true);
  }, []);

  const resetEditor = () => {
    detailRequestRef.current += 1;
    setSelected(null);
    setDraft(null);
    setIsCreating(false);
    setIsDetailLoading(false);
    setDetailError(null);
    setOperationError(null);
    setFieldErrors({});
    setNotice(null);
  };

  const closeEditor = () => {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      setShowDiscardConfirmation(true);
      return;
    }
    resetEditor();
  };

  return (
    <section
      className={isEditorOpen ? 'email-library email-library--editing' : 'email-library'}
      aria-labelledby="email-library-heading"
    >
      <EmailLibraryNavigationBlocker
        shouldBlock={shouldBlock}
        onBlocked={handleBlockedNavigation}
      />
      <div className="email-library__heading">
        <div>
          <h2 id="email-library-heading">Email Library</h2>
          <p>Author reusable email content for simulated inbox experiences.</p>
        </div>
        <div className="flex items-center gap-3">
          {aiReturnTo && (
            <button
              className="email-library-button"
              type="button"
              onClick={() => navigate(aiReturnTo)}
            >
              Return to Campaign
            </button>
          )}
          {canManage && (
            <button
              className="email-library-button email-library-button--primary"
              type="button"
              onClick={beginCreate}
            >
              Create Email Draft
            </button>
          )}
        </div>
      </div>

      {isEditorOpen && (
        <div className="email-library__editor-navigation">
          <button type="button" disabled={isSaving} onClick={closeEditor}>
            ← Back to Email Library
          </button>
          <p>
            {isCreating
              ? 'Create a reusable email Draft.'
              : 'Review this email without losing your place in the library.'}
          </p>
        </div>
      )}

      <div className="email-library__filters" aria-label="Email library search and filters">
        <div className="email-library__search">
          <label htmlFor="email-library-search">Search emails</label>
          <div>
            <AdminPagesSearchSVG />
            <input
              id="email-library-search"
              type="search"
              value={query.search ?? ''}
              placeholder="Search sender, subject or preview"
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
          <label htmlFor="email-library-status">Lifecycle</label>
          <select
            id="email-library-status"
            value={query.status ?? ''}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                page: 1,
                status:
                  event.target.value === ''
                    ? undefined
                    : (event.target.value as NonNullable<ListOrganisationEmailsQuery['status']>),
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
        <div className="content-management-state email-library__list-state" aria-live="polite">
          <span>
            <LoadingSpinnerSVG />
          </span>{' '}
          Loading email library…
        </div>
      )}
      {!isLoading && listError && (
        <div className="content-management-error email-library__list-state" role="alert">
          <p>{listError}</p>
          <button type="button" onClick={() => void loadList()}>
            Retry
          </button>
        </div>
      )}
      {isEmpty && (
        <div className="content-management-state email-library__list-state">
          {hasFilters
            ? 'No emails match your search or filter.'
            : 'No library emails have been created yet.'}
        </div>
      )}
      {!isLoading && !listError && result && result.items.length > 0 && (
        <>
          <div className="email-library__list" aria-label="Library emails">
            {result.items.map((email) => (
              <button
                key={email.id}
                type="button"
                className={
                  selected?.id === email.id
                    ? 'email-library-card email-library-card--selected'
                    : 'email-library-card'
                }
                onClick={() => void openEmail(email.id)}
              >
                <div className="email-library-card__status">
                  <StatusBadge status={email.status === 'ACTIVE' ? 'Active' : 'Draft'} />
                </div>
                <strong>{email.subject || 'Untitled email'}</strong>
                <span>
                  {email.senderLabel || 'No sender label'} ·{' '}
                  {email.senderAddress || 'No sender address'}
                </span>
                <small>Updated {formatUpdatedAt(email.updatedAt)}</small>
              </button>
            ))}
          </div>
          {result.pagination.totalPages > 1 && (
            <nav className="email-library__pagination" aria-label="Email library pagination">
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

      {isDetailLoading && (
        <div className="content-management-state" aria-live="polite">
          Loading email details…
        </div>
      )}
      {!isDetailLoading && detailError && (
        <div className="content-management-error" role="alert">
          {detailError}
        </div>
      )}
      {!isDetailLoading && draft && (
        <section className="email-library__editor" aria-labelledby="email-editor-heading">
          <div className="email-library__editor-heading">
            <div>
              <h2 id="email-editor-heading">{getEditorHeading(isCreating, selected?.status)}</h2>
              {selected && (
                <StatusBadge status={selected.status === 'ACTIVE' ? 'Active' : 'Draft'} />
              )}
            </div>
            <div className="email-library__actions">
              {canManage && (isCreating || selected?.status === 'DRAFT') && (
                <GenerateWithAiDialog
                  scope="organisation"
                  disabled={isSaving}
                  onGenerate={generateEmailDraft}
                  onGenerated={applyGeneratedEmailDraft}
                />
              )}
              {canManage && (isCreating || selected?.status === 'DRAFT') && (
                <button
                  className="email-library-button email-library-button--primary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveDraft()}
                >
                  {getSaveDraftLabel(isSaving, isCreating)}
                </button>
              )}
              {canManage && selected?.status === 'DRAFT' && (
                <button
                  className="email-library-button"
                  type="button"
                  disabled={isSaving || hasUnsavedChanges}
                  title={hasUnsavedChanges ? 'Save the Draft before activation.' : undefined}
                  onClick={() => setShowActivationConfirmation(true)}
                >
                  Activate
                </button>
              )}
              {canManage && selected?.status === 'ACTIVE' && (
                <button
                  className="email-library-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void copyActive()}
                >
                  {isSaving ? 'Copying…' : 'Copy to Draft'}
                </button>
              )}
            </div>
          </div>
          <div className="email-library__announcements" aria-live="polite">
            {notice && <p className="email-library__notice">{notice}</p>}
            {operationError && (
              <p className="email-library__operation-error" role="alert">
                {operationError}
              </p>
            )}
          </div>
          <EmailBuilder
            value={draft}
            onChange={setDraft}
            disabled={editorReadOnly}
            fieldErrors={fieldErrors}
          />
        </section>
      )}

      {showActivationConfirmation && selected && (
        <BasicConfirmationModal
          title="Activate email"
          message="Active library emails are read-only and available for simulated inbox selection."
          confirmButtonText="Activate"
          onConfirm={() => void activateDraft()}
          onCancel={() => setShowActivationConfirmation(false)}
          confirmButtonVariant="success"
          isConfirming={isSaving}
          isConfirmDisabled={isSaving}
        />
      )}
      {showDiscardConfirmation && (
        <BasicConfirmationModal
          title="Discard unsaved email changes"
          message="Your unsaved Email Draft changes will be lost."
          confirmButtonText="Discard changes"
          onConfirm={() => {
            setShowDiscardConfirmation(false);
            resetEditor();
            if (blockedNavigation) {
              allowedNavigationRef.current = true;
              blockedNavigation.proceed();
              setBlockedNavigation(null);
            }
          }}
          onCancel={() => {
            setShowDiscardConfirmation(false);
            blockedNavigation?.reset();
            setBlockedNavigation(null);
          }}
          confirmButtonVariant="danger"
        />
      )}
    </section>
  );
}

export default function OrganisationContentManagementPage({
  section,
  client = apiClient,
  simulatedInboxClient: inboxClient = simulatedInboxManagementClient,
}: OrganisationContentManagementPageProps) {
  const { organisationId } = useParams<{ organisationId: string }>();
  const { permissions } = useAuth();

  if (!organisationId) return <Navigate to="/organisation-information" replace />;

  return (
    <ContentManagementShell organisationId={organisationId} section={section}>
      {section === 'quizzes' ? (
        <QuizManagementSection organisationId={organisationId} />
      ) : section === 'training-documents' ? (
        <TrainingDocumentManagementSection
          organisationId={organisationId}
          canManage={permissions.includes('MANAGE_CAMPAIGNS')}
        />
      ) : section === 'email-library' ? (
        <EmailLibrary
          organisationId={organisationId}
          canManage={permissions.includes('MANAGE_CAMPAIGNS')}
          client={client}
        />
      ) : (
        <SimulatedInboxList
          organisationId={organisationId}
          canManage={permissions.includes('MANAGE_CAMPAIGNS')}
          client={inboxClient}
        />
      )}
    </ContentManagementShell>
  );
}
