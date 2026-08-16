import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { CampaignDetailResponseDto } from '@insightful-phish/shared';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import CampaignBuilder from './CampaignBuilder';
import type { CampaignManagementClient } from './campaignManagementClient';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';
import { developmentCampaignManagementClient } from './developmentCampaignManagementClient';
import { toDateTimeLocal } from './campaignDraftDate';
import { toCreateCampaignDraftRequest } from './campaignDraftRequest';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import './campaign-management.css';

type CampaignManagementDetailPageProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  client?: Pick<CampaignManagementClient, 'getCampaignDetail' | 'createCampaignDraft'>;
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

type ConfirmationIntent = 'reset' | 'discard-new' | 'leave' | null;

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

  const currentLoadState = campaignId && loadState?.campaignId === campaignId ? loadState : null;

  const detail = currentLoadState?.status === 'loaded' ? currentLoadState.detail : null;

  const editorKey = isNew ? 'new' : (detail?.id ?? null);

  const isLoading = !isNew && (!currentLoadState || currentLoadState.status === 'loading');

  const loadError = currentLoadState?.status === 'error' ? currentLoadState.message : null;

  const canEditDraft = detail?.status === 'DRAFT' && detail.allowedActions.includes('EDIT');

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

  async function handleCreateCampaignDraft(draft: CampaignDraftFormState) {
    setSaveError(null);

    try {
      const created = await client.createCampaignDraft(
        campaignContext,
        toCreateCampaignDraftRequest(campaignContext, draft),
      );

      navigate(`${campaignListPath}/${created.id}`, {
        replace: true,
      });
    } catch {
      setSaveError('Campaign could not be saved.');
    }
  }

  const confirmationConfiguration =
    confirmationIntent === 'leave'
      ? {
          title: 'Leave without saving',
          confirmButtonText: 'Leave without saving',
        }
      : {
          title: 'Discard unsaved changes',
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
            saveButtonText="Save Draft"
          />
        )}

        {isNew && saveError && (
          <section className="campaign-error" role="alert">
            <p>{saveError}</p>
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
            message="Your local Campaign Draft changes will be lost."
            confirmButtonText={confirmationConfiguration.confirmButtonText}
            confirmButtonVariant="danger"
            onCancel={() => {
              setConfirmationIntent(null);
            }}
            onConfirm={() => {
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
