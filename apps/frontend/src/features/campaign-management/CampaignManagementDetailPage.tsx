import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type {
  CampaignCatalogueItemDto,
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
} from '@insightful-phish/shared';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import type { CampaignCatalogueState } from './CampaignCatalogue';
import CampaignBuilder from './CampaignBuilder';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';
import { toCampaignDraftItems } from './campaignDraftItems';
import { developmentCampaignManagementClient } from './developmentCampaignManagementClient';
import { toDateTimeLocal } from './campaignDraftDate';
import { toCreateCampaignDraftRequest, toUpdateCampaignDraftRequest } from './campaignDraftRequest';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import './campaign-management.css';

type CampaignManagementDetailPageProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  client?: Pick<
    CampaignManagementClient,
    'getCampaignCatalogue' | 'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
  >;
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

type CatalogueSelectionState = {
  ownerKey: string;
  items: readonly CampaignCatalogueItemDto[];
};

type ConfirmationIntent = 'reset' | 'discard-new' | 'leave' | 'reload' | null;

function getRouteOwnershipKey(
  contextKind: CampaignManagementContext['kind'],
  organisationId: string | undefined,
  campaignId: string | undefined,
): string {
  return `${contextKind}:${organisationId ?? ''}:${campaignId ?? 'new'}`;
}

function CampaignManagementDetailPage({
  contextKind,
  client = developmentCampaignManagementClient,
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
  const [catalogueLoadState, setCatalogueLoadState] = useState<OwnedCatalogueState | null>(null);
  const catalogueRequestIdRef = useRef(0);
  const [catalogueRetryAttempt, setCatalogueRetryAttempt] = useState(0);
  const [catalogueQuery, setCatalogueQuery] = useState<CampaignCatalogueQueryDto>({
    page: 1,
    limit: 10,
  });

  const routeOwnershipKey = getRouteOwnershipKey(contextKind, organisationId, campaignId);
  const [activeRouteOwnershipKey, setActiveRouteOwnershipKey] = useState(routeOwnershipKey);
  const [catalogueSelection, setCatalogueSelection] = useState<CatalogueSelectionState>({
    ownerKey: routeOwnershipKey,
    items: [],
  });

  const catalogueQueryKey = [
    routeOwnershipKey,
    catalogueQuery.page,
    catalogueQuery.limit,
    catalogueQuery.search ?? '',
    catalogueQuery.type ?? '',
  ].join(':');

  const selectedCatalogueItems =
    catalogueSelection.ownerKey === routeOwnershipKey ? catalogueSelection.items : [];

  if (activeRouteOwnershipKey !== routeOwnershipKey) {
    setCatalogueSelection((currentSelection) =>
      currentSelection.ownerKey === routeOwnershipKey
        ? currentSelection
        : { ownerKey: routeOwnershipKey, items: [] },
    );
    setActiveRouteOwnershipKey(routeOwnershipKey);
    setIsSaving(false);
    setSaveError(null);
    setConfirmationIntent(null);
  }

  const currentLoadState = campaignId && loadState?.campaignId === campaignId ? loadState : null;

  const detail = currentLoadState?.status === 'loaded' ? currentLoadState.detail : null;

  const editorKey = isNew ? 'new' : (detail?.id ?? null);

  const isLoading = !isNew && (!currentLoadState || currentLoadState.status === 'loading');

  const loadError = currentLoadState?.status === 'error' ? currentLoadState.message : null;

  const canEditDraft = detail?.status === 'DRAFT' && detail.allowedActions.includes('EDIT');

  const shouldLoadCatalogue = isNew || canEditDraft;
  const currentCatalogueState =
    catalogueLoadState?.ownerKey === catalogueQueryKey
      ? catalogueLoadState.state
      : { status: 'loading' as const };

  const isEditorDirty =
    Boolean(editorKey) && editorDirtyState?.editorKey === editorKey && editorDirtyState.isDirty;

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
    return () => {
      saveRequestIdRef.current += 1;
      saveInFlightRef.current = false;
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

  function selectCatalogueItem(item: CampaignCatalogueItemDto) {
    setCatalogueSelection((currentSelection) => {
      const currentItems =
        currentSelection.ownerKey === routeOwnershipKey ? currentSelection.items : [];

      const alreadySelected = currentItems.some(
        (selectedItem) => selectedItem.type === item.type && selectedItem.id === item.id,
      );

      return {
        ownerKey: routeOwnershipKey,
        items: alreadySelected ? currentItems : [...currentItems, item],
      };
    });
  }

  async function handleCreateCampaignDraft(draft: CampaignDraftFormState) {
    if (saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    const saveRequestId = ++saveRequestIdRef.current;

    setIsSaving(true);
    setSaveError(null);

    try {
      const created = await client.createCampaignDraft(
        campaignContext,
        toCreateCampaignDraftRequest(campaignContext, draft),
      );

      if (saveRequestIdRef.current !== saveRequestId) {
        return;
      }

      const destinationOwnershipKey = getRouteOwnershipKey(contextKind, organisationId, created.id);

      setCatalogueSelection((currentSelection) =>
        currentSelection.ownerKey === routeOwnershipKey
          ? { ...currentSelection, ownerKey: destinationOwnershipKey }
          : currentSelection,
      );

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
    if (saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    const saveRequestId = ++saveRequestIdRef.current;

    setIsSaving(true);
    setSaveError(null);

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

  const confirmationConfiguration =
    confirmationIntent === 'leave'
      ? {
          title: 'Leave without saving',
          message: 'Your local Campaign Draft changes will be lost.',
          confirmButtonText: 'Leave without saving',
        }
      : confirmationIntent === 'reload'
        ? {
            title: 'Reload Draft',
            message: 'Reloading will replace your local Campaign Draft changes.',
            confirmButtonText: 'Reload Draft',
          }
        : {
            title: 'Discard unsaved changes',
            message: 'Your local Campaign Draft changes will be lost.',
            confirmButtonText: 'Discard',
          };

  return (
    <AppLayout>
      <main className="campaign-detail-shell">
        <Link
          className="campaign-back-link"
          to={campaignListPath}
          onClick={(event) => {
            if (!isEditorDirty) {
              return;
            }
            event.preventDefault();
            setConfirmationIntent('leave');
          }}
        >
          <span aria-hidden="true">←</span>
          <span>Back to Campaigns</span>
        </Link>

        <header className="campaign-page__header">
          <div>
            <h1 className="campaign-page__title">{heading}</h1>
            <p className="campaign-page__helper">
              Build a campaign by selecting and organising campaign items.
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
            saveButtonText="Save Draft"
            savingButtonText="Saving Draft…"
            catalogueState={currentCatalogueState}
            catalogueQuery={catalogueQuery}
            selectedCatalogueItems={selectedCatalogueItems}
            onSelectCatalogueItem={selectCatalogueItem}
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
            saveButtonText="Save Changes"
            savingButtonText="Saving Changes…"
            catalogueState={currentCatalogueState}
            catalogueQuery={catalogueQuery}
            selectedCatalogueItems={selectedCatalogueItems}
            onSelectCatalogueItem={selectCatalogueItem}
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
          !canEditDraft &&
          detail.status === 'DRAFT' && (
            <section className="campaign-state">
              <h2>{detail.name}</h2>
              <p>This Campaign is currently read-only.</p>
            </section>
          )}

        {!isNew && !isLoading && !loadError && detail && detail.status !== 'DRAFT' && (
          <section className="campaign-state">
            <h2>{detail.name}</h2>
            <p>Status: {detail.status}</p>
            <p>This Campaign is currently read-only.</p>
          </section>
        )}

        {confirmationIntent && (
          <BasicConfirmationModal
            title={confirmationConfiguration.title}
            message={confirmationConfiguration.message}
            confirmButtonText={confirmationConfiguration.confirmButtonText}
            confirmButtonVariant="danger"
            onCancel={() => {
              setConfirmationIntent(null);
            }}
            onConfirm={() => {
              if (confirmationIntent === 'reload') {
                setConfirmationIntent(null);
                reloadAuthoritativeDetail();
                return;
              }
              if (confirmationIntent === 'leave' || confirmationIntent === 'discard-new') {
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
    </AppLayout>
  );
}

export default CampaignManagementDetailPage;
