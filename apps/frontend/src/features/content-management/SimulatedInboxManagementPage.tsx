import type {
  ActivationValidationIssue,
  CreateSimulatedInboxDraftRequest,
  OrganisationEmailDraftInput,
  OrganisationEmailListResponse,
  SimulatedInboxChildEmail,
  SimulatedInboxDetail,
} from '@insightful-phish/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  Navigate,
  useBlocker,
  useNavigate,
  useParams,
  type BlockerFunction,
} from 'react-router-dom';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import { FormField, SelectField } from '../../components/ui/FormField';
import { useAuth } from '../../context/useAuth';
import { EmailBuilder, type EmailBuilderFieldErrors } from '../email-authoring/EmailBuilder';
import { EmailPreview } from '../email-authoring/EmailPreview';
import { createEmptyOrganisationEmailDraft } from '../email-authoring/emailDraft';
import { ContentManagementShell } from './ContentManagementShell';
import {
  simulatedInboxManagementClient,
  type SimulatedInboxManagementClient,
} from './simulatedInboxClient';
import { getSimulatedInboxError } from './simulatedInboxPresentation';
import './content-management.css';

type EditorMode = 'authored' | 'snapshot' | null;
type ConfirmationIntent = 'activate' | 'remove' | 'leave' | null;

type BlockedNavigation = Readonly<{
  proceed: () => void;
  reset: () => void;
}>;

function InboxNavigationBlocker({
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

function childToDraft(email: SimulatedInboxChildEmail): OrganisationEmailDraftInput {
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
  };
}

function metadataFromDetail(detail: SimulatedInboxDetail): CreateSimulatedInboxDraftRequest {
  return {
    title: detail.title,
    description: detail.description ?? '',
    difficultyLevel: detail.difficultyLevel,
  };
}

function fieldErrorsFromIssues(issues: readonly ActivationValidationIssue[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    errors[issue.field] ??= issue.message;
  }
  return errors;
}

function selectAvailableEmailId(
  emails: readonly SimulatedInboxChildEmail[],
  currentId: string | null,
) {
  if (emails.some((email) => email.id === currentId)) return currentId;
  return [...emails].sort((left, right) => left.position - right.position)[0]?.id ?? null;
}

function inboxHeading(isNew: boolean, active: boolean) {
  if (isNew) return 'New Simulated Inbox';
  return active ? 'Active Simulated Inbox' : 'Inbox Draft';
}

function currentAuthoringStep(isNew: boolean, emailCount: number) {
  if (isNew) return 1;
  if (emailCount < 2) return 2;
  return 3;
}

function metadataActionLabel(pendingAction: string | null, isNew: boolean) {
  if (pendingAction === 'save') return 'Saving…';
  return isNew ? 'Create Draft' : 'Save Draft';
}

function emailEditorHeading(editorMode: Exclude<EditorMode, null>, active: boolean) {
  if (editorMode === 'authored') return 'Add authored email';
  return active ? 'View email snapshot' : 'Edit email snapshot';
}

function emailActionLabel(pendingAction: string | null, editorMode: Exclude<EditorMode, null>) {
  if (pendingAction === 'email') return 'Saving…';
  return editorMode === 'authored' ? 'Add email' : 'Save email';
}

async function persistEditorEmail(input: {
  client: SimulatedInboxManagementClient;
  organisationId: string;
  simulationId: string;
  editorMode: Exclude<EditorMode, null>;
  selectedEmailId: string | null;
  draft: OrganisationEmailDraftInput;
}) {
  if (input.editorMode === 'authored') {
    const response = await input.client.addAuthoredEmail(
      input.organisationId,
      input.simulationId,
      input.draft,
    );
    return {
      emailId: response.email.id,
      notice: response.libraryEmailReused
        ? 'Email added. An exact library email was reused as its source.'
        : 'Email added and registered in the library.',
    };
  }
  if (!input.selectedEmailId) return null;
  const response = await input.client.updateEmail(
    input.organisationId,
    input.simulationId,
    input.selectedEmailId,
    input.draft,
  );
  return {
    emailId: response.id,
    notice: 'Inbox email saved independently from its library source.',
  };
}

function reorderEmailPositions(
  emails: readonly SimulatedInboxChildEmail[],
  emailId: string,
  direction: -1 | 1,
) {
  const index = emails.findIndex((email) => email.id === emailId);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= emails.length) return null;
  const reordered = [...emails];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  return reordered.map((email, position) => ({ emailId: email.id, position }));
}

function firstInvalidEmail(
  issues: readonly ActivationValidationIssue[],
  emails: readonly SimulatedInboxChildEmail[],
) {
  const emailId = issues.find((issue) => issue.emailId !== null)?.emailId;
  if (!emailId) return null;
  return emails.find((email) => email.id === emailId) ?? null;
}

function difficultyLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function categoryLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function SimulatedInboxManagementPage({
  client = simulatedInboxManagementClient,
  blockUnsavedNavigation = false,
}: Readonly<{
  client?: SimulatedInboxManagementClient;
  blockUnsavedNavigation?: boolean;
}>) {
  const { organisationId, simulationId } = useParams<{
    organisationId: string;
    simulationId: string;
  }>();
  const { clearAuth, permissions } = useAuth();
  const navigate = useNavigate();
  const canManage = permissions.includes('MANAGE_CAMPAIGNS');
  const isNew = !simulationId;
  const [detail, setDetail] = useState<SimulatedInboxDetail | null>(null);
  const [metadata, setMetadata] = useState<CreateSimulatedInboxDraftRequest>({
    title: '',
    description: '',
    difficultyLevel: 'EASY',
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorDraft, setEditorDraft] = useState<OrganisationEmailDraftInput | null>(null);
  const [editorOriginal, setEditorOriginal] = useState<OrganisationEmailDraftInput | null>(null);
  const [editorErrors, setEditorErrors] = useState<EmailBuilderFieldErrors>({});
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>({});
  const [activationIssues, setActivationIssues] = useState<ActivationValidationIssue[]>([]);
  const [confirmationIntent, setConfirmationIntent] = useState<ConfirmationIntent>(null);
  const [removeEmailId, setRemoveEmailId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryResult, setLibraryResult] = useState<OrganisationEmailListResponse | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [blockedNavigation, setBlockedNavigation] = useState<BlockedNavigation | null>(null);
  const loadRequestRef = useRef(0);
  const libraryRequestRef = useRef(0);
  const operationInFlightRef = useRef(false);
  const allowedNavigationRef = useRef(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const listPath = organisationId
    ? `/organisations/${encodeURIComponent(organisationId)}/content/simulated-inboxes`
    : '/organisation-information';

  const sortedEmails = useMemo(
    () => [...(detail?.emails ?? [])].sort((left, right) => left.position - right.position),
    [detail?.emails],
  );
  const selectedEmail =
    sortedEmails.find((email) => email.id === selectedEmailId) ?? sortedEmails[0] ?? null;
  const activeLibraryEmails = (libraryResult?.items ?? []).filter(
    (email) => email.status === 'ACTIVE',
  );
  const active = detail?.lifecycleStatus === 'ACTIVE';
  const metadataDirty = detail
    ? JSON.stringify(metadata) !== JSON.stringify(metadataFromDetail(detail))
    : metadata.title !== '' || metadata.description !== '' || metadata.difficultyLevel !== 'EASY';
  const editorDirty = Boolean(
    editorDraft &&
    (editorMode === 'authored' ||
      (editorOriginal && JSON.stringify(editorDraft) !== JSON.stringify(editorOriginal))),
  );
  const isDirty = metadataDirty || editorDirty;

  const handleError = useCallback(
    (cause: unknown, fallback: string) => {
      const presentation = getSimulatedInboxError(cause, fallback);
      if (presentation.unauthorized) clearAuth();
      setOperationError(presentation.message);
      return presentation;
    },
    [clearAuth],
  );

  const loadDetail = useCallback(async () => {
    if (!organisationId || !simulationId) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await client.get(organisationId, simulationId);
      if (requestId !== loadRequestRef.current) return;
      setDetail(response);
      setMetadata(metadataFromDetail(response));
      setSelectedEmailId((current) => selectAvailableEmailId(response.emails, current));
    } catch (cause) {
      if (requestId !== loadRequestRef.current) return;
      const presentation = getSimulatedInboxError(
        cause,
        'Simulated inbox details could not be loaded. Try again.',
      );
      if (presentation.unauthorized) clearAuth();
      setLoadError(presentation.message);
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [clearAuth, client, organisationId, simulationId]);

  useEffect(() => {
    if (isNew) return;
    const timeoutId = globalThis.setTimeout(() => void loadDetail(), 0);
    return () => {
      globalThis.clearTimeout(timeoutId);
      loadRequestRef.current += 1;
    };
  }, [isNew, loadDetail]);

  useEffect(() => {
    allowedNavigationRef.current = false;
  }, [simulationId]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      blockUnsavedNavigation &&
      isDirty &&
      !allowedNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
    [blockUnsavedNavigation, isDirty],
  );

  const handleBlockedNavigation = useCallback((navigation: BlockedNavigation) => {
    setBlockedNavigation(navigation);
    setConfirmationIntent('leave');
  }, []);

  const perform = async (name: string, action: () => Promise<void>) => {
    if (operationInFlightRef.current) return;
    operationInFlightRef.current = true;
    setPendingAction(name);
    setOperationError(null);
    setNotice(null);
    try {
      await action();
    } finally {
      operationInFlightRef.current = false;
      setPendingAction(null);
    }
  };

  const saveMetadata = () =>
    perform('save', async () => {
      setMetadataErrors({});
      try {
        if (!organisationId) return;
        if (isNew) {
          const created = await client.create(organisationId, metadata);
          allowedNavigationRef.current = true;
          navigate(`${listPath}/${created.id}`, { replace: true });
          return;
        }
        if (!simulationId) return;
        const response = await client.update(organisationId, simulationId, metadata);
        setDetail(response);
        setMetadata(metadataFromDetail(response));
        setNotice('Inbox Draft saved.');
      } catch (cause) {
        const presentation = handleError(cause, 'Inbox Draft could not be saved. Try again.');
        setMetadataErrors(fieldErrorsFromIssues(presentation.issues));
      }
    });

  const refreshAfterEmailMutation = async (emailId?: string) => {
    await loadDetail();
    if (emailId) setSelectedEmailId(emailId);
    setEditorMode(null);
    setEditorDraft(null);
    setEditorOriginal(null);
    setEditorErrors({});
    setActivationIssues([]);
  };

  const beginAuthoredEmail = () => {
    setEditorMode('authored');
    const draft = createEmptyOrganisationEmailDraft();
    setEditorDraft(draft);
    setEditorOriginal(null);
    setEditorErrors({});
    setOperationError(null);
    setShowLibrary(false);
  };

  const beginEditEmail = (email: SimulatedInboxChildEmail) => {
    const draft = childToDraft(email);
    setSelectedEmailId(email.id);
    setEditorMode('snapshot');
    setEditorDraft(draft);
    setEditorOriginal(draft);
    setEditorErrors({});
    setOperationError(null);
    setShowLibrary(false);
  };

  const saveEmail = () =>
    perform('email', async () => {
      if (!organisationId || !simulationId || !editorDraft || !editorMode) return;
      try {
        const result = await persistEditorEmail({
          client,
          organisationId,
          simulationId,
          editorMode,
          selectedEmailId,
          draft: editorDraft,
        });
        if (!result) return;
        await refreshAfterEmailMutation(result.emailId);
        setNotice(result.notice);
      } catch (cause) {
        const presentation = handleError(cause, 'The inbox email could not be saved. Try again.');
        setEditorErrors(fieldErrorsFromIssues(presentation.issues));
      }
    });

  const removeEmail = () =>
    perform('remove', async () => {
      if (!organisationId || !simulationId || !removeEmailId) return;
      try {
        await client.removeEmail(organisationId, simulationId, removeEmailId);
        if (selectedEmailId === removeEmailId) setSelectedEmailId(null);
        setConfirmationIntent(null);
        setRemoveEmailId(null);
        await refreshAfterEmailMutation();
        setNotice('Email removed from the Inbox Draft.');
      } catch (cause) {
        setConfirmationIntent(null);
        handleError(cause, 'The inbox email could not be removed. Try again.');
      }
    });

  const moveEmail = (emailId: string, direction: -1 | 1) =>
    perform('reorder', async () => {
      if (!organisationId || !simulationId) return;
      const emails = reorderEmailPositions(sortedEmails, emailId, direction);
      if (!emails) return;
      try {
        const response = await client.reorderEmails(organisationId, simulationId, {
          emails,
        });
        setDetail(response);
        setSelectedEmailId(emailId);
        setNotice('Email order updated.');
      } catch (cause) {
        handleError(cause, 'The email order could not be updated. Try again.');
      }
    });

  const loadLibrary = useCallback(async () => {
    if (!organisationId) return;
    const requestId = ++libraryRequestRef.current;
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const response = await client.listLibraryEmails(organisationId, {
        page: 1,
        limit: 100,
        search: librarySearch || undefined,
        status: 'ACTIVE',
      });
      if (requestId !== libraryRequestRef.current) return;
      setLibraryResult(response);
    } catch (cause) {
      if (requestId !== libraryRequestRef.current) return;
      const presentation = getSimulatedInboxError(
        cause,
        'Active library emails could not be loaded. Try again.',
      );
      if (presentation.unauthorized) clearAuth();
      setLibraryError(presentation.message);
    } finally {
      if (requestId === libraryRequestRef.current) setLibraryLoading(false);
    }
  }, [clearAuth, client, librarySearch, organisationId]);

  useEffect(() => {
    if (!showLibrary) return;
    const timeoutId = globalThis.setTimeout(() => void loadLibrary(), 150);
    return () => {
      globalThis.clearTimeout(timeoutId);
      libraryRequestRef.current += 1;
    };
  }, [loadLibrary, showLibrary]);

  const addLibraryEmail = (organisationEmailId: string) =>
    perform('library', async () => {
      if (!organisationId || !simulationId) return;
      try {
        const response = await client.addLibraryEmail(organisationId, simulationId, {
          organisationEmailId,
        });
        setShowLibrary(false);
        await refreshAfterEmailMutation(response.email.id);
        setNotice('A snapshot of the Active library email was added.');
      } catch (cause) {
        handleError(cause, 'The library email could not be added. Try again.');
      }
    });

  const focusIssue = (issue: ActivationValidationIssue) => {
    if (!issue.emailId) return;
    const email = sortedEmails.find((candidate) => candidate.id === issue.emailId);
    if (!email) return;
    beginEditEmail(email);
    setEditorErrors(
      fieldErrorsFromIssues(activationIssues.filter((item) => item.emailId === email.id)),
    );
    globalThis.setTimeout(() => cardRefs.current.get(email.id)?.focus(), 0);
  };

  const activate = () =>
    perform('activate', async () => {
      if (!organisationId || !simulationId) return;
      setMetadataErrors({});
      setEditorErrors({});
      setActivationIssues([]);
      try {
        const response = await client.activate(organisationId, simulationId);
        setDetail(response);
        setMetadata(metadataFromDetail(response));
        setEditorMode(null);
        setEditorDraft(null);
        setConfirmationIntent(null);
        setNotice('Inbox activated and available to the Campaign Catalogue.');
      } catch (cause) {
        setConfirmationIntent(null);
        const presentation = handleError(
          cause,
          'The Inbox Draft could not be activated. Review the validation issues.',
        );
        setActivationIssues(presentation.issues);
        setMetadataErrors(
          fieldErrorsFromIssues(presentation.issues.filter((issue) => issue.emailId === null)),
        );
        const email = firstInvalidEmail(presentation.issues, sortedEmails);
        if (!email) return;
        beginEditEmail(email);
        setOperationError(presentation.message);
        setEditorErrors(
          fieldErrorsFromIssues(presentation.issues.filter((issue) => issue.emailId === email.id)),
        );
        globalThis.setTimeout(() => cardRefs.current.get(email.id)?.focus(), 0);
      }
    });

  const copy = () =>
    perform('copy', async () => {
      if (!organisationId || !simulationId) return;
      try {
        const response = await client.copy(organisationId, simulationId);
        allowedNavigationRef.current = true;
        setEditorMode(null);
        setEditorDraft(null);
        setEditorOriginal(null);
        setEditorErrors({});
        setActivationIssues([]);
        navigate(`${listPath}/${response.id}`);
      } catch (cause) {
        handleError(cause, 'The Active inbox could not be copied. Try again.');
      }
    });

  if (!organisationId) return <Navigate to="/organisation-information" replace />;

  const readOnly = !canManage || active;
  const metadataReadOnly = readOnly || editorMode !== null;
  const actionsDisabled = pendingAction !== null;
  const heading = inboxHeading(isNew, active);
  const authoringStep = currentAuthoringStep(isNew, sortedEmails.length);

  return (
    <ContentManagementShell organisationId={organisationId} section="simulated-inboxes">
      {blockUnsavedNavigation && (
        <InboxNavigationBlocker shouldBlock={shouldBlock} onBlocked={handleBlockedNavigation} />
      )}
      <section className="inbox-management" aria-labelledby="inbox-management-heading">
        <Link className="inbox-management__back" to={listPath}>
          <span aria-hidden="true">←</span> Back to Simulated Inboxes
        </Link>

        {isLoading && (
          <div className="content-management-state" aria-live="polite">
            <span>
              <LoadingSpinnerSVG />
            </span>{' '}
            Loading Inbox Draft…
          </div>
        )}
        {!isLoading && loadError && (
          <div className="content-management-error" role="alert">
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadDetail()}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && !loadError && (
          <>
            <div className="inbox-management__heading">
              <div>
                <h2 id="inbox-management-heading">{heading}</h2>
                {!isNew && (
                  <span
                    className={`email-library-status email-library-status--${active ? 'active' : 'draft'}`}
                  >
                    {active ? 'Active' : 'Draft'}
                  </span>
                )}
              </div>
              <div className="email-library__actions">
                {canManage && !active && (
                  <button
                    className="email-library-button email-library-button--primary"
                    type="button"
                    disabled={actionsDisabled || (!isNew && !metadataDirty)}
                    onClick={() => void saveMetadata()}
                  >
                    {metadataActionLabel(pendingAction, isNew)}
                  </button>
                )}
                {canManage && detail && !active && (
                  <button
                    className="email-library-button"
                    type="button"
                    disabled={actionsDisabled || isDirty}
                    title={isDirty ? 'Save or discard changes before activation.' : undefined}
                    onClick={() => setConfirmationIntent('activate')}
                  >
                    Activate
                  </button>
                )}
                {canManage && active && (
                  <button
                    className="email-library-button"
                    type="button"
                    disabled={actionsDisabled}
                    onClick={() => void copy()}
                  >
                    {pendingAction === 'copy' ? 'Copying…' : 'Copy to new Draft'}
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

            {!active && (
              <ol className="inbox-authoring-progress" aria-label="Inbox authoring progress">
                <li aria-current={authoringStep === 1 ? 'step' : undefined}>
                  <span>1</span>
                  <div>
                    <strong>Inbox details</strong>
                    <small>Name and difficulty</small>
                  </div>
                </li>
                <li aria-current={authoringStep === 2 ? 'step' : undefined}>
                  <span>2</span>
                  <div>
                    <strong>Add emails</strong>
                    <small>At least two required</small>
                  </div>
                </li>
                <li aria-current={authoringStep === 3 ? 'step' : undefined}>
                  <span>3</span>
                  <div>
                    <strong>Review and activate</strong>
                    <small>Validate the complete inbox</small>
                  </div>
                </li>
              </ol>
            )}

            {activationIssues.length > 0 && (
              <section
                className="inbox-activation-issues"
                aria-labelledby="activation-issues-heading"
              >
                <h3 id="activation-issues-heading">Activation issues</h3>
                <ul>
                  {activationIssues.map((issue, index) => (
                    <li key={`${issue.emailId ?? 'inbox'}:${issue.field}:${issue.code}:${index}`}>
                      {issue.emailId ? (
                        <button type="button" onClick={() => focusIssue(issue)}>
                          Email {(issue.position ?? 0) + 1}: {issue.message}
                        </button>
                      ) : (
                        issue.message
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="inbox-metadata" aria-labelledby="inbox-metadata-heading">
              <div className="inbox-section-heading">
                <div>
                  <span>Step 1</span>
                  <h3 id="inbox-metadata-heading">Inbox details</h3>
                </div>
                <p>Set the name, description and overall difficulty for this inbox.</p>
              </div>
              <div className="inbox-metadata__grid">
                <FormField label="Title" errorText={metadataErrors.title}>
                  {(controlProps) => (
                    <input
                      {...controlProps}
                      className="email-builder__control"
                      value={metadata.title}
                      disabled={metadataReadOnly}
                      onChange={(event) => setMetadata({ ...metadata, title: event.target.value })}
                    />
                  )}
                </FormField>
                <SelectField
                  label="Parent difficulty"
                  value={metadata.difficultyLevel}
                  disabled={metadataReadOnly}
                  errorText={metadataErrors.difficultyLevel}
                  options={[
                    { value: 'EASY', label: 'Easy' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HARD', label: 'Hard' },
                  ]}
                  onChange={(difficultyLevel) =>
                    setMetadata({
                      ...metadata,
                      difficultyLevel:
                        difficultyLevel as CreateSimulatedInboxDraftRequest['difficultyLevel'],
                    })
                  }
                  selectClassName="email-builder__control"
                />
              </div>
              <FormField label="Description" errorText={metadataErrors.description}>
                {(controlProps) => (
                  <textarea
                    {...controlProps}
                    rows={3}
                    className="email-builder__control"
                    value={metadata.description}
                    disabled={metadataReadOnly}
                    onChange={(event) =>
                      setMetadata({ ...metadata, description: event.target.value })
                    }
                  />
                )}
              </FormField>
              {metadataErrors.emails && (
                <p className="inbox-metadata__error" role="alert">
                  {metadataErrors.emails}
                </p>
              )}
            </section>

            {isNew ? (
              <div className="content-management-state">
                Create the Inbox Draft to begin adding emails.
              </div>
            ) : (
              <section className="inbox-emails" aria-labelledby="inbox-emails-heading">
                <div className="inbox-emails__heading">
                  <div>
                    <span className="inbox-section-step">Step 2</span>
                    <h3 id="inbox-emails-heading">Ordered emails</h3>
                    <p>
                      {sortedEmails.length} {sortedEmails.length === 1 ? 'email' : 'emails'}
                    </p>
                  </div>
                  {canManage && !active && (
                    <div className="email-library__actions">
                      <button
                        className="email-library-button"
                        type="button"
                        disabled={actionsDisabled || metadataDirty || editorDirty}
                        onClick={beginAuthoredEmail}
                      >
                        Add authored email
                      </button>
                      <button
                        className="email-library-button"
                        type="button"
                        disabled={actionsDisabled || metadataDirty || editorDirty}
                        onClick={() => {
                          setShowLibrary((current) => !current);
                          setEditorMode(null);
                          setEditorDraft(null);
                        }}
                      >
                        Browse Email Library
                      </button>
                    </div>
                  )}
                </div>

                {showLibrary && (
                  <section
                    className="inbox-library-picker"
                    aria-labelledby="library-picker-heading"
                  >
                    <div className="inbox-library-picker__heading">
                      <h4 id="library-picker-heading">Active library emails</h4>
                      <button type="button" onClick={() => setShowLibrary(false)}>
                        Close
                      </button>
                    </div>
                    <label htmlFor="inbox-library-search">Search library</label>
                    <input
                      id="inbox-library-search"
                      type="search"
                      className="email-builder__control"
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                    />
                    {libraryLoading && <p aria-live="polite">Loading Active library emails…</p>}
                    {libraryError && <p role="alert">{libraryError}</p>}
                    {!libraryLoading &&
                      !libraryError &&
                      libraryResult &&
                      activeLibraryEmails.length === 0 && (
                        <p>No Active library emails match this search.</p>
                      )}
                    {!libraryLoading && !libraryError && activeLibraryEmails.length > 0 && (
                      <ul>
                        {activeLibraryEmails.map((email) => (
                          <li key={email.id}>
                            <div>
                              <strong>{email.subject || 'Untitled email'}</strong>
                              <span>{email.senderLabel || email.senderAddress}</span>
                            </div>
                            <button
                              className="email-library-button"
                              type="button"
                              disabled={actionsDisabled}
                              onClick={() => void addLibraryEmail(email.id)}
                            >
                              Add snapshot
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {sortedEmails.length === 0 ? (
                  <div className="content-management-state">
                    No emails have been added to this Inbox Draft.
                  </div>
                ) : (
                  <div className="inbox-email-workspace">
                    <div className="inbox-email-list" aria-label="Ordered inbox emails">
                      {sortedEmails.map((email, index) => (
                        <article
                          key={email.id}
                          ref={(node) => {
                            if (node) cardRefs.current.set(email.id, node);
                            else cardRefs.current.delete(email.id);
                          }}
                          tabIndex={-1}
                          className={
                            selectedEmail?.id === email.id
                              ? 'inbox-email-card inbox-email-card--selected'
                              : 'inbox-email-card'
                          }
                        >
                          <button
                            type="button"
                            className="inbox-email-card__select"
                            onClick={() => setSelectedEmailId(email.id)}
                          >
                            <span className="inbox-email-card__position">
                              Email {email.position + 1}
                            </span>
                            <strong>{email.subject || 'Untitled email'}</strong>
                            <span>
                              {email.senderLabel || 'No sender'} ·{' '}
                              {email.senderAddress || 'No address'}
                            </span>
                          </button>
                          <dl>
                            <div>
                              <dt>Classification</dt>
                              <dd>{difficultyLabel(email.expectedClassification)}</dd>
                            </div>
                            <div>
                              <dt>Difficulty</dt>
                              <dd>{difficultyLabel(email.difficultyLevel)}</dd>
                            </div>
                          </dl>
                          <p>
                            {email.categories.length > 0
                              ? email.categories.map(categoryLabel).join(', ')
                              : 'No categories'}
                          </p>
                          {email.sourceOrganisationEmailId && (
                            <small>Originally copied from library.</small>
                          )}
                          {canManage && !active && (
                            <div className="inbox-email-card__actions">
                              <button
                                type="button"
                                disabled={
                                  actionsDisabled || metadataDirty || editorDirty || index === 0
                                }
                                onClick={() => void moveEmail(email.id, -1)}
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                disabled={
                                  actionsDisabled ||
                                  metadataDirty ||
                                  editorDirty ||
                                  index === sortedEmails.length - 1
                                }
                                onClick={() => void moveEmail(email.id, 1)}
                              >
                                Move down
                              </button>
                              <button
                                type="button"
                                disabled={actionsDisabled || metadataDirty || editorDirty}
                                onClick={() => beginEditEmail(email)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={actionsDisabled || metadataDirty || editorDirty}
                                onClick={() => {
                                  setRemoveEmailId(email.id);
                                  setConfirmationIntent('remove');
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {readOnly && (
                            <div className="inbox-email-card__actions">
                              <button type="button" onClick={() => beginEditEmail(email)}>
                                View details
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    {selectedEmail && !editorDraft && (
                      <EmailPreview email={childToDraft(selectedEmail)} />
                    )}
                  </div>
                )}

                {editorDraft && editorMode && (
                  <section
                    className="inbox-email-editor"
                    aria-labelledby="inbox-email-editor-heading"
                  >
                    <div className="inbox-emails__heading">
                      <h3 id="inbox-email-editor-heading">
                        {emailEditorHeading(editorMode, active)}
                      </h3>
                      <div className="email-library__actions">
                        {!readOnly && (
                          <button
                            className="email-library-button email-library-button--primary"
                            type="button"
                            disabled={actionsDisabled}
                            onClick={() => void saveEmail()}
                          >
                            {emailActionLabel(pendingAction, editorMode)}
                          </button>
                        )}
                        <button
                          className="email-library-button"
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() => {
                            setEditorMode(null);
                            setEditorDraft(null);
                            setEditorOriginal(null);
                            setEditorErrors({});
                          }}
                        >
                          {readOnly ? 'Close' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                    {editorMode === 'snapshot' && selectedEmail?.sourceOrganisationEmailId && (
                      <p className="inbox-email-editor__source">
                        Originally copied from library. Changes here affect only this snapshot.
                      </p>
                    )}
                    <EmailBuilder
                      value={editorDraft}
                      onChange={setEditorDraft}
                      disabled={readOnly}
                      fieldErrors={editorErrors}
                    />
                  </section>
                )}
              </section>
            )}
          </>
        )}
      </section>

      {confirmationIntent === 'activate' && (
        <BasicConfirmationModal
          title="Activate simulated inbox"
          message="Activation makes this inbox read-only and available to the Campaign Catalogue."
          confirmButtonText="Activate"
          onConfirm={() => void activate()}
          onCancel={() => setConfirmationIntent(null)}
          confirmButtonVariant="success"
          isConfirming={pendingAction === 'activate'}
          isConfirmDisabled={actionsDisabled}
          isDismissDisabled={actionsDisabled}
        />
      )}
      {confirmationIntent === 'remove' && (
        <BasicConfirmationModal
          title="Remove email"
          message="This removes the independent snapshot from the Inbox Draft."
          confirmButtonText="Remove"
          onConfirm={() => void removeEmail()}
          onCancel={() => {
            setConfirmationIntent(null);
            setRemoveEmailId(null);
          }}
          confirmButtonVariant="danger"
          isConfirming={pendingAction === 'remove'}
          isConfirmDisabled={actionsDisabled}
          isDismissDisabled={actionsDisabled}
        />
      )}
      {confirmationIntent === 'leave' && blockedNavigation && (
        <BasicConfirmationModal
          title="Leave without saving"
          message="Your unsaved Inbox Draft changes will be lost."
          confirmButtonText="Leave without saving"
          onConfirm={() => {
            allowedNavigationRef.current = true;
            setConfirmationIntent(null);
            blockedNavigation.proceed();
            setBlockedNavigation(null);
          }}
          onCancel={() => {
            setConfirmationIntent(null);
            blockedNavigation.reset();
            setBlockedNavigation(null);
          }}
          confirmButtonVariant="danger"
        />
      )}
    </ContentManagementShell>
  );
}
