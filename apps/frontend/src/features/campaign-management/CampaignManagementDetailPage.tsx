import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { CampaignDetailResponseDto } from '@insightful-phish/shared';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import type { CampaignManagementClient } from './campaignManagementClient';
import type { CampaignManagementContext } from './campaignManagement.types';
import { developmentCampaignManagementClient } from './developmentCampaignManagementClient';
import './campaign-management.css';

type CampaignManagementDetailPageProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  client?: Pick<CampaignManagementClient, 'getCampaignDetail'>;
}>;

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
  const [detail, setDetail] = useState<CampaignDetailResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canEditDraft = detail?.status === 'DRAFT' && detail.allowedActions.includes('EDIT');

  const heading = isNew
    ? 'Create Campaign'
    : canEditDraft
      ? 'Edit Draft Campaign'
      : detail?.status === 'DRAFT'
        ? 'Draft Campaign'
        : 'Campaign';

  useEffect(() => {
    if (!context || !campaignId) {
      return;
    }

    void client
      .getCampaignDetail(context, campaignId)
      .then((response) => {
        setDetail(response);
        setLoadError(null);
      })
      .catch(() => {
        setDetail(null);
        setLoadError('Campaign could not be loaded. Try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [campaignId, client, context]);

  if (!context) {
    return <Navigate to="/" replace />;
  }

  const campaignListPath =
    context.kind === 'organisation'
      ? `/organisations/${context.organisationId}/campaigns`
      : '/platform/campaigns';

  return (
    <AppLayout>
      <main className="campaign-detail-shell">
        <Link className="campaign-back-link" to={campaignListPath}>
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
          <section className="campaign-state">
            Campaign Draft details will be configured here.
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
          </section>
        )}

        {!isNew && !isLoading && !loadError && detail && canEditDraft && (
          <section className="campaign-state">
            <h2>{detail.name}</h2>
            <p>Draft details will be editable in the next commit.</p>
          </section>
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
      </main>
    </AppLayout>
  );
}

export default CampaignManagementDetailPage;
