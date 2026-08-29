import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  Navigate,
  useBlocker,
  useNavigate,
  useParams,
  type BlockerFunction,
} from 'react-router-dom';
import type {
  CampaignCatalogueQueryDto,
  CampaignDetailItemDto,
  CampaignDetailResponseDto,
} from '@insightful-phish/shared';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import type { CampaignCatalogueState } from './CampaignCatalogue';
import CampaignBuilder from './CampaignBuilder';
import CampaignReadOnlyDetail from './CampaignReadOnlyDetail';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';
import { toCampaignDraftItems } from './campaignDraftItems';
import { apiCampaignManagementClient } from './apiCampaignManagementClient';
import { toDateTimeLocal } from './campaignDraftDate';
import { toCreateCampaignDraftRequest, toUpdateCampaignDraftRequest } from './campaignDraftRequest';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import './campaign-management.css';

type CampaignManagementDetailPageProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  client?: Pick<
    CampaignManagementClient,
    'getCampaignCatalogue' | 'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
  > &
    Partial<
      Pick<CampaignManagementClient, 'activateCampaign' | 'archiveCampaign' | 'reactivateCampaign'>
    >;
  canManageCampaigns?: boolean;
  blockUnsavedNavigation?: boolean;
}>;

type CampaignDetailLoadState =
  | {
      campaignId: string;
      status: 'loaded';
      detail: CampaignDetailResponseDto;
    }
  | {
      campaignId: string;
      status: 'error';
      message: string;
    }
  | {
      campaignId: string;
      status: 'loading';
    };

type EditorDirtyState = {
  editorKey: string;
  isDirty: boolean;
};

type OwnedCatalogueState = {
  ownerKey: string;
  state: CampaignCatalogueState;
};

type LifecycleMutation = 'activate' | 'archive' | 'reactivate';

type ConfirmationIntent = 'reset' | 'discard-new' | 'leave' | 'reload' | LifecycleMutation | null;

function hasUnavailableCampaignContent(items: readonly CampaignDetailItemDto[]): boolean {
  return items.some((item) =>
    item.itemType === 'COMPONENT'
      ? !item.sourceAvailable
      : item.children.some((child) => !child.sourceAvailable),
  );
}

function getRouteOwnershipKey(
  contextKind: CampaignManagementContext['kind'],
  organisationId: string | undefined,
  campaignId: string | undefined,
): string {
  return `${contextKind}:${organisationId ?? ''}:${campaignId ?? 'new'}`;
}

type BlockedNavigation = Readonly<{
  proceed: () => void;
  reset: () => void;
}>;

type CampaignNavigationBlockerProps = Readonly<{
  shouldBlock: BlockerFunction;
  onBlocked: (navigation: BlockedNavigation) => void;
}>;

function CampaignNavigationBlocker({ shouldBlock, onBlocked }: CampaignNavigationBlockerProps) {
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

function CampaignManagementDetailPage({
  contextKind,
  client = apiCampaignManagementClient,
  canManageCampaigns = true,
  blockUnsavedNavigation = false,
}: CampaignManagementDetailPageProps) {
  const { organisationId, campaignId } = useParams<{
    organisationId: string;
    campaignId: string;
  }>();

  const context = useMemo<CampaignManagementContext | null>(() => {
    if (contextKind === 'platform') {
      return { kind: 'platform' };
    }

    if (!organisationId) {
      return null;
    }

    return {
      kind: 'organisation',
      organisationId,
    };
  }, [contextKind, organisationId]);

  const isNew = campaignId === undefined;
  const navigate = useNavigate();
  const blockedNavigationRef = useRef<BlockedNavigation | null>(null);
  const allowedNextNavigationRef = useRef(false);

  const [loadState, setLoadState] = useState<CampaignDetailLoadState | null>(null);
  const requestIdRef = useRef(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [editorDirtyState, setEditorDirtyState] = useState<EditorDirtyState | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [confirmationIntent, setConfirmationIntent] = useState<ConfirmationIntent>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveRequestIdRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState<LifecycleMutation | null>(
    null,
  );
  const lifecycleRequestIdRef = useRef(0);
  const lifecycleInFlightRef = useRef(false);
  const [catalogueLoadState, setCatalogueLoadState] = useState<OwnedCatalogueState | null>(null);
  const catalogueRequestIdRef = useRef(0);
  const [catalogueRetryAttempt, setCatalogueRetryAttempt] = useState(0);
  const [catalogueQuery, setCatalogueQuery] = useState<CampaignCatalogueQueryDto>({
    page: 1,
    limit: 10,
  });

  const routeOwnershipKey = getRouteOwnershipKey(contextKind, organisationId, campaignId);
  const [activeRouteOwnershipKey, setActiveRouteOwnershipKey] = useState(routeOwnershipKey);

  const catalogueQueryKey = [
    routeOwnershipKey,
    catalogueQuery.page,
    catalogueQuery.limit,
    catalogueQuery.search ?? '',
    catalogueQuery.type ?? '',
  ].join(':');

  if (activeRouteOwnershipKey !== routeOwnershipKey) {
    setActiveRouteOwnershipKey(routeOwnershipKey);
    setIsSaving(false);
    setSaveError(null);
    setPendingLifecycleAction(null);
    setLifecycleError(null);
    setConfirmationIntent(null);
  }

  const currentLoadState = campaignId && loadState?.campaignId === campaignId ? loadState : null;

  const detail = currentLoadState?.status === 'loaded' ? currentLoadState.detail : null;

  const editorKey = isNew ? 'new' : (detail?.id ?? null);

  const isLoading = !isNew && (!currentLoadState || currentLoadState.status === 'loading');

  const loadError = currentLoadState?.status === 'error' ? currentLoadState.message : null;

  const canEditDraft =
    canManageCampaigns && detail?.status === 'DRAFT' && detail.allowedActions.includes('EDIT');

  const shouldLoadCatalogue = isNew || canEditDraft;
  const currentCatalogueState =
    catalogueLoadState?.ownerKey === catalogueQueryKey
      ? catalogueLoadState.state
      : { status: 'loading' as const };

  const isEditorDirty =
    Boolean(editorKey) && editorDirtyState?.editorKey === editorKey && editorDirtyState.isDirty;

  const shouldBlockNavigation = useCallback<BlockerFunction>(
    () => isEditorDirty && !allowedNextNavigationRef.current,
    [isEditorDirty],
  );

  const handleBlockedNavigation = useCallback((navigation: BlockedNavigation) => {
    blockedNavigationRef.current = navigation;
    setConfirmationIntent('leave');
  }, []);

  const isMutationPending = isSaving || pendingLifecycleAction !== null;
  const hasActivationItems = Boolean(detail?.items.length);
  const hasUnavailableActivationContent = Boolean(
    detail && hasUnavailableCampaignContent(detail.items),
  );
  const hasActivationAction =
    canManageCampaigns && Boolean(detail?.allowedActions.includes('ACTIVATE'));
  const hasOtherActivationRestriction =
    !hasActivationAction &&
    hasActivationItems &&
    !hasUnavailableActivationContent &&
    !isEditorDirty;
  const canRequestActivation =
    hasActivationAction &&
    hasActivationItems &&
    !hasUnavailableActivationContent &&
    !isEditorDirty &&
    !isMutationPending;
  const hasArchiveAction =
    canManageCampaigns && detail?.status === 'ACTIVE' && detail.allowedActions.includes('ARCHIVE');
  const hasReactivateAction =
    canManageCampaigns &&
    detail?.status === 'ARCHIVED' &&
    detail.allowedActions.includes('REACTIVATE');
  const canRequestArchive = Boolean(hasArchiveAction) && !isMutationPending;
  const canRequestReactivate = Boolean(hasReactivateAction) && !isMutationPending;

  const heading = isNew
    ? 'Create Campaign'
    : canEditDraft
      ? 'Edit Draft Campaign'
      : detail?.status === 'DRAFT'
        ? 'Draft Campaign'
        : 'Campaign';

  useEffect(() => {
    if (!campaignId || !context) {
      return;
    }

    const requestId = ++requestIdRef.current;

    void client
      .getCampaignDetail(context, campaignId)
      .then((response) => {
        if (requestIdRef.current === requestId) {
          setLoadState({
            campaignId,
            status: 'loaded',
            detail: response,
          });
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          setLoadState({
            campaignId,
            status: 'error',
            message: 'Campaign could not be loaded. Try again.',
          });
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [campaignId, client, context, retryAttempt]);

  useEffect(() => {
    if (!context || !shouldLoadCatalogue) {
      return;
    }

    const requestId = ++catalogueRequestIdRef.current;

    void client
      .getCampaignCatalogue(context, {
        ...catalogueQuery,
        search: catalogueQuery.search?.trim() || undefined,
      })
      .then((response) => {
        if (catalogueRequestIdRef.current === requestId) {
          setCatalogueLoadState({
            ownerKey: catalogueQueryKey,
            state: {
              status: 'loaded',
              items: response.items,
              pagination: response.pagination,
            },
          });
        }
      })
      .catch(() => {
        if (catalogueRequestIdRef.current === requestId) {
          setCatalogueLoadState({
            ownerKey: catalogueQueryKey,
            state: { status: 'error' },
          });
        }
      });

    return () => {
      catalogueRequestIdRef.current += 1;
    };
  }, [
    catalogueQuery,
    catalogueQueryKey,
    catalogueRetryAttempt,
    client,
    context,
    shouldLoadCatalogue,
  ]);

  useEffect(() => {
    blockedNavigationRef.current = null;
    allowedNextNavigationRef.current = false;
    return () => {
      saveRequestIdRef.current += 1;
      saveInFlightRef.current = false;
      lifecycleRequestIdRef.current += 1;
      lifecycleInFlightRef.current = false;
    };
  }, [routeOwnershipKey]);

  useEffect(() => {
    if (!isEditorDirty) {
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
  }, [isEditorDirty]);

  if (!context) {
    return <Navigate to="/" replace />;
  }

  const campaignContext = context;

  const campaignListPath =
    context.kind === 'organisation'
      ? `/organisations/${context.organisationId}/campaigns`
      : '/platform/campaigns';

  function reloadAuthoritativeDetail() {
    if (!campaignId) {
      return;
    }

    setSaveError(null);
    setLifecycleError(null);
    setEditorDirtyState(null);
    setLoadState({
      campaignId,
      status: 'loading',
    });
    setRetryAttempt((current) => current + 1);
  }

  function retryCampaignCatalogue() {
    setCatalogueLoadState({
      ownerKey: catalogueQueryKey,
      state: { status: 'loading' },
    });
    setCatalogueRetryAttempt((current) => current + 1);
  }

  function updateCatalogueSearch(search: string) {
    setCatalogueQuery((current) => ({
      ...current,
      page: 1,
      search,
    }));
  }

  function updateCatalogueType(type: CampaignCatalogueQueryDto['type']) {
    setCatalogueQuery((current) => ({
      ...current,
      page: 1,
      type,
    }));
  }

  function updateCataloguePage(page: number) {
    setCatalogueQuery((current) => ({
      ...current,
      page,
    }));
  }

  async function handleCreateCampaignDraft(draft: CampaignDraftFormState) {
    if (saveInFlightRef.current || lifecycleInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    const saveRequestId = ++saveRequestIdRef.current;

    setIsSaving(true);
    setSaveError(null);
    setLifecycleError(null);

    try {
      const created = await client.createCampaignDraft(
        campaignContext,
        toCreateCampaignDraftRequest(campaignContext, draft),
      );

      if (saveRequestIdRef.current !== saveRequestId) {
        return;
      }

      allowedNextNavigationRef.current = true;
      navigate(`${campaignListPath}/${created.id}`, {
        replace: true,
      });
    } catch {
      if (saveRequestIdRef.current !== saveRequestId) {
        return;
      }

      setSaveError('Campaign could not be saved. Try again.');
    } finally {
      if (saveRequestIdRef.current === saveRequestId) {
        saveInFlightRef.current = false;
        setIsSaving(false);
      }
    }
  }

  async function handleUpdateCampaignDraft(
    draft: CampaignDraftFormState,
    authoritativeDetail: CampaignDetailResponseDto,
  ) {
    if (saveInFlightRef.current || lifecycleInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    const saveRequestId = ++saveRequestIdRef.current;

    setIsSaving(true);
    setSaveError(null);
    setLifecycleError(null);

    try {
      const updated = await client.updateCampaignDraft(
        campaignContext,
        authoritativeDetail.id,
        toUpdateCampaignDraftRequest(campaignContext, draft, authoritativeDetail.updatedAt),
      );

      if (saveRequestIdRef.current !== saveRequestId) {
        return;
      }

      setLoadState({
        campaignId: updated.id,
        status: 'loaded',
        detail: updated,
      });
      setEditorDirtyState({
        editorKey: updated.id,
        isDirty: false,
      });
      setResetVersion((current) => current + 1);
    } catch (error) {
      if (saveRequestIdRef.current !== saveRequestId) {
        return;
      }

      if (error instanceof CampaignManagementClientError) {
        if (error.code === 'CAMPAIGN_CHANGED') {
          setSaveError('This Draft has changed since you opened it.');
          return;
        }

        if (error.code === 'CAMPAIGN_IMMUTABLE') {
          reloadAuthoritativeDetail();
          return;
        }
      }

      setSaveError('Campaign could not be saved. Try again.');
    } finally {
      if (saveRequestIdRef.current === saveRequestId) {
        saveInFlightRef.current = false;
        setIsSaving(false);
      }
    }
  }

  async function handleLifecycleMutation(
    action: LifecycleMutation,
    authoritativeDetail: CampaignDetailResponseDto,
  ) {
    const lifecycleMethod =
      action === 'activate'
        ? client.activateCampaign
        : action === 'archive'
          ? client.archiveCampaign
          : client.reactivateCampaign;

    const isRequestable =
      action === 'activate'
        ? !isEditorDirty &&
          authoritativeDetail.status === 'DRAFT' &&
          authoritativeDetail.allowedActions.includes('ACTIVATE') &&
          authoritativeDetail.items.length > 0 &&
          !hasUnavailableCampaignContent(authoritativeDetail.items)
        : action === 'archive'
          ? authoritativeDetail.status === 'ACTIVE' &&
            authoritativeDetail.allowedActions.includes('ARCHIVE')
          : authoritativeDetail.status === 'ARCHIVED' &&
            authoritativeDetail.allowedActions.includes('REACTIVATE');

    if (
      !lifecycleMethod ||
      lifecycleInFlightRef.current ||
      saveInFlightRef.current ||
      !isRequestable
    ) {
      return;
    }

    lifecycleInFlightRef.current = true;
    const requestId = ++lifecycleRequestIdRef.current;

    setPendingLifecycleAction(action);
    setLifecycleError(null);
    setSaveError(null);

    try {
      const lifecycleResult = await lifecycleMethod(campaignContext, authoritativeDetail.id, {
        expectedUpdatedAt: authoritativeDetail.updatedAt,
      });

      if (lifecycleRequestIdRef.current !== requestId) {
        return;
      }

      setLoadState({
        campaignId: lifecycleResult.campaignId,
        status: 'loaded',
        detail: {
          ...authoritativeDetail,
          status: lifecycleResult.status,
          updatedAt: lifecycleResult.updatedAt,
          allowedActions: lifecycleResult.allowedActions,
        },
      });

      if (action === 'activate') {
        setEditorDirtyState(null);
      }
    } catch (error) {
      if (lifecycleRequestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof CampaignManagementClientError) {
        if (error.code === 'CAMPAIGN_CHANGED') {
          setLifecycleError(
            action === 'activate'
              ? 'This Draft has changed since you opened it.'
              : 'This Campaign has changed since you opened it.',
          );
          return;
        }

        if (error.code === 'LIFECYCLE_CONFLICT') {
          reloadAuthoritativeDetail();
          return;
        }

        if (action === 'activate' && error.code === 'EMPTY_CAMPAIGN') {
          setLifecycleError('Add at least one Campaign item before activation.');
          return;
        }

        if (error.code === 'UNAVAILABLE_CAMPAIGN_CONTENT') {
          setLifecycleError(
            action === 'reactivate'
              ? 'This Campaign contains content that is no longer available and cannot be reactivated.'
              : 'Remove unavailable Campaign content before activation.',
          );
          return;
        }
      }

      setLifecycleError(
        action === 'activate'
          ? 'Campaign could not be activated. Try again.'
          : action === 'archive'
            ? 'Campaign could not be archived. Try again.'
            : 'Campaign could not be reactivated. Try again.',
      );
    } finally {
      if (lifecycleRequestIdRef.current === requestId) {
        lifecycleInFlightRef.current = false;
        setPendingLifecycleAction(null);
        setConfirmationIntent(null);
      }
    }
  }

  const confirmationConfiguration =
    confirmationIntent === 'activate' && detail
      ? {
          title: `Activate ${detail.name}`,
          message: 'Activating this Campaign will make its details and items read-only.',
          confirmButtonText: 'Activate Campaign',
          cancelButtonText: 'Keep Editing',
          confirmButtonVariant: 'default' as const,
        }
      : confirmationIntent === 'archive' && detail
        ? {
            title: `Archive ${detail.name}`,
            message:
              'Archiving this Campaign stops new assignments and new trainee progress. Existing assignments and progress remain available read-only.',
            confirmButtonText: 'Archive Campaign',
            cancelButtonText: 'Keep Active',
            confirmButtonVariant: 'danger' as const,
          }
        : confirmationIntent === 'reactivate' && detail
          ? {
              title: `Reactivate ${detail.name}`,
              message: `Reactivating this Campaign restores its eligibility without changing its content.${
                detail.campaignType === 'ORGANISATION_CUSTOM'
                  ? ' Organisation Campaign dates still apply.'
                  : ''
              }`,
              confirmButtonText: 'Reactivate Campaign',
              cancelButtonText: 'Keep Archived',
              confirmButtonVariant: 'default' as const,
            }
          : confirmationIntent === 'leave'
            ? {
                title: 'Leave without saving',
                message: 'Your local Campaign Draft changes will be lost.',
                confirmButtonText: 'Leave without saving',
                cancelButtonText: undefined,
                confirmButtonVariant: 'danger' as const,
              }
            : confirmationIntent === 'reload'
              ? {
                  title: 'Reload Draft',
                  message: 'Reloading will replace your local Campaign Draft changes.',
                  confirmButtonText: 'Reload Draft',
                  cancelButtonText: undefined,
                  confirmButtonVariant: 'danger' as const,
                }
              : {
                  title: 'Discard unsaved changes',
                  message: 'Your local Campaign Draft changes will be lost.',
                  confirmButtonText: 'Discard',
                  cancelButtonText: undefined,
                  confirmButtonVariant: 'danger' as const,
                };

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <main className="campaign-detail-shell">
        <Link className="campaign-back-link" to={campaignListPath}>
          <span aria-hidden="true">←</span>
          <span>Back to Campaigns</span>
        </Link>

        <header className="campaign-page__header">
          <div>
            <h1 className="campaign-page__title">{heading}</h1>
            <p className="campaign-page__helper">
              {isNew || canEditDraft
                ? 'Build a campaign by selecting and organising campaign items.'
                : 'Review Campaign details and ordered content.'}
            </p>
          </div>
        </header>

        {isNew && (
          <CampaignBuilder
            key={`new:${resetVersion}`}
            contextKind={context.kind}
            initialDraft={{
              name: '',
              description: '',
              accentColor: '#8400FF',
              startDate: '',
              endDate: '',
              items: [],
            }}
            onDirtyChange={(isDirty) => {
              setEditorDirtyState({
                editorKey: 'new',
                isDirty,
              });
            }}
            onRequestDiscard={() => {
              setConfirmationIntent('discard-new');
            }}
            onSave={handleCreateCampaignDraft}
            isSaving={isSaving}
            isMutationPending={isMutationPending}
            saveButtonText="Save Draft"
            savingButtonText="Saving Draft…"
            catalogueState={currentCatalogueState}
            catalogueQuery={catalogueQuery}
            onRetryCatalogue={retryCampaignCatalogue}
            onCatalogueSearchChange={updateCatalogueSearch}
            onCatalogueTypeChange={updateCatalogueType}
            onCataloguePageChange={updateCataloguePage}
          />
        )}

        {saveError && (
          <section className="campaign-error" role="alert">
            <p>{saveError}</p>

            {saveError === 'This Draft has changed since you opened it.' && (
              <button type="button" onClick={() => setConfirmationIntent('reload')}>
                Reload Draft
              </button>
            )}
          </section>
        )}

        {lifecycleError && (
          <section className="campaign-error" role="alert">
            <p>{lifecycleError}</p>

            {(lifecycleError === 'This Draft has changed since you opened it.' ||
              lifecycleError === 'This Campaign has changed since you opened it.') && (
              <button
                type="button"
                onClick={() => {
                  if (lifecycleError === 'This Draft has changed since you opened it.') {
                    setConfirmationIntent('reload');
                    return;
                  }

                  reloadAuthoritativeDetail();
                }}
              >
                {lifecycleError === 'This Draft has changed since you opened it.'
                  ? 'Reload Draft'
                  : 'Reload Campaign'}
              </button>
            )}
          </section>
        )}

        {!isNew && isLoading && (
          <section className="campaign-state" aria-live="polite">
            <span className="campaign-state__spinner">
              <LoadingSpinnerSVG />
            </span>
            <span>Loading campaign…</span>
          </section>
        )}

        {!isNew && !isLoading && loadError && (
          <section className="campaign-error" role="alert">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => {
                if (!campaignId) {
                  return;
                }

                setLoadState({
                  campaignId,
                  status: 'loading',
                });
                setRetryAttempt((current) => current + 1);
              }}
            >
              Retry
            </button>
          </section>
        )}

        {!isNew && !isLoading && !loadError && detail && canEditDraft && (
          <CampaignBuilder
            key={`${detail.id}:${resetVersion}`}
            contextKind={context.kind}
            initialDraft={{
              name: detail.name,
              description: detail.description ?? '',
              accentColor: detail.accentColor ?? '#8400FF',
              startDate: toDateTimeLocal(detail.startDate),
              endDate: toDateTimeLocal(detail.endDate),
              items: toCampaignDraftItems(detail.items),
            }}
            onDirtyChange={(isDirty) => {
              setEditorDirtyState({
                editorKey: detail.id,
                isDirty,
              });
            }}
            onRequestDiscard={() => {
              setConfirmationIntent('reset');
            }}
            onSave={(draft) => handleUpdateCampaignDraft(draft, detail)}
            isSaving={isSaving}
            isMutationPending={isMutationPending}
            requireDirtyToSave
            saveButtonText="Save Changes"
            savingButtonText="Saving Changes…"
            catalogueState={currentCatalogueState}
            catalogueQuery={catalogueQuery}
            onRetryCatalogue={retryCampaignCatalogue}
            onCatalogueSearchChange={updateCatalogueSearch}
            onCatalogueTypeChange={updateCatalogueType}
            onCataloguePageChange={updateCataloguePage}
          />
        )}

        {!isNew &&
          !isLoading &&
          !loadError &&
          detail &&
          canEditDraft &&
          client.activateCampaign && (
            <section className="campaign-lifecycle" aria-label="Campaign activation">
              <h2>Ready to activate</h2>
              <button
                type="button"
                className="campaign-button campaign-lifecycle__action campaign-lifecycle__action--activate"
                disabled={!canRequestActivation}
                onClick={() => setConfirmationIntent('activate')}
              >
                {pendingLifecycleAction === 'activate' ? 'Activating…' : 'Activate Campaign'}
              </button>

              {!hasActivationItems ? (
                <p>Add at least one Campaign item before activation.</p>
              ) : hasUnavailableActivationContent ? (
                <p>Remove unavailable Campaign content before activation.</p>
              ) : isEditorDirty ? (
                <p>Save changes before activation.</p>
              ) : hasOtherActivationRestriction ? (
                <p>Activation is not available for this Campaign.</p>
              ) : null}
            </section>
          )}

        {!isNew && !isLoading && !loadError && detail && !canEditDraft && (
          <CampaignReadOnlyDetail detail={detail} />
        )}

        {!isNew &&
          !isLoading &&
          !loadError &&
          detail &&
          !canEditDraft &&
          ((hasArchiveAction && client.archiveCampaign) ||
            (hasReactivateAction && client.reactivateCampaign)) && (
            <section className="campaign-lifecycle" aria-label="Campaign lifecycle actions">
              <h2>Campaign lifecycle</h2>
              {hasArchiveAction && client.archiveCampaign && (
                <button
                  type="button"
                  className="campaign-button campaign-lifecycle__action campaign-lifecycle__action--archive"
                  disabled={!canRequestArchive}
                  onClick={() => setConfirmationIntent('archive')}
                >
                  {pendingLifecycleAction === 'archive' ? 'Archiving…' : 'Archive Campaign'}
                </button>
              )}

              {hasReactivateAction && client.reactivateCampaign && (
                <button
                  type="button"
                  className="campaign-button campaign-lifecycle__action campaign-lifecycle__action--reactivate"
                  disabled={!canRequestReactivate}
                  onClick={() => setConfirmationIntent('reactivate')}
                >
                  {pendingLifecycleAction === 'reactivate'
                    ? 'Reactivating…'
                    : 'Reactivate Campaign'}
                </button>
              )}
            </section>
          )}

        {confirmationIntent && (
          <BasicConfirmationModal
            title={confirmationConfiguration.title}
            message={confirmationConfiguration.message}
            confirmButtonText={confirmationConfiguration.confirmButtonText}
            cancelButtonText={confirmationConfiguration.cancelButtonText}
            confirmButtonVariant={confirmationConfiguration.confirmButtonVariant}
            isConfirming={pendingLifecycleAction === confirmationIntent}
            isConfirmDisabled={
              confirmationIntent === 'activate'
                ? !canRequestActivation
                : confirmationIntent === 'archive'
                  ? !canRequestArchive
                  : confirmationIntent === 'reactivate'
                    ? !canRequestReactivate
                    : false
            }
            isDismissDisabled={pendingLifecycleAction === confirmationIntent}
            onCancel={() => {
              if (confirmationIntent === 'leave') {
                blockedNavigationRef.current?.reset();
                blockedNavigationRef.current = null;
              }

              setConfirmationIntent(null);
            }}
            onConfirm={() => {
              if (
                (confirmationIntent === 'activate' ||
                  confirmationIntent === 'archive' ||
                  confirmationIntent === 'reactivate') &&
                detail
              ) {
                void handleLifecycleMutation(confirmationIntent, detail);
                return;
              }
              if (confirmationIntent === 'reload') {
                setConfirmationIntent(null);
                reloadAuthoritativeDetail();
                return;
              }
              if (confirmationIntent === 'leave') {
                const blockedNavigation = blockedNavigationRef.current;
                blockedNavigationRef.current = null;
                setConfirmationIntent(null);
                blockedNavigation?.proceed();
                return;
              }
              if (confirmationIntent === 'discard-new') {
                allowedNextNavigationRef.current = true;
                setConfirmationIntent(null);
                navigate(campaignListPath);
                return;
              }

              if (editorKey) {
                setEditorDirtyState({
                  editorKey,
                  isDirty: false,
                });
              }

              setConfirmationIntent(null);
              setResetVersion((current) => current + 1);
            }}
          />
        )}
      </main>

      {blockUnsavedNavigation && (
        <CampaignNavigationBlocker
          shouldBlock={shouldBlockNavigation}
          onBlocked={handleBlockedNavigation}
        />
      )}
    </AppLayout>
  );
}

export default CampaignManagementDetailPage;
