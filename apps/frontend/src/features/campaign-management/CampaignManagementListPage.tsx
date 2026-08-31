import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import AdminPagesSearchSVG from '../../components/AdminPagesSearchSVG';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import type {
  CampaignListQueryDto,
  CampaignListRowDto,
  CampaignStatusDto,
  GetCampaignsResponseDto,
} from '@insightful-phish/shared';
import type { CampaignManagementClient } from './campaignManagementClient';
import type { CampaignManagementContext } from './campaignManagement.types';
import { apiCampaignManagementClient } from './apiCampaignManagementClient';
import { getCampaignErrorPresentation } from './campaignManagementError';
import { useAuth } from '../../context/useAuth';
import './campaign-management.css';

type CampaignManagementListPageProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  client?: Pick<CampaignManagementClient, 'listCampaigns'>;
}>;

type CampaignListStatusFilter = NonNullable<CampaignListQueryDto['status']>;

const STATUS_LABELS: Record<CampaignStatusDto, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const STATUS_CLASSES: Record<CampaignStatusDto, string> = {
  DRAFT: 'campaign-status campaign-status--draft',
  ACTIVE: 'campaign-status campaign-status--active',
  PAUSED: 'campaign-status campaign-status--paused',
  COMPLETED: 'campaign-status campaign-status--completed',
  ARCHIVED: 'campaign-status campaign-status--archived',
};

const INITIAL_QUERY: CampaignListQueryDto = {
  page: 1,
  limit: 10,
};

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOwnershipLabel(campaign: CampaignListRowDto): string {
  return campaign.campaignType === 'PREMADE_GENERAL' ? 'Insightful Phish' : 'Organisation';
}

function CampaignManagementListPage({
  contextKind,
  client = apiCampaignManagementClient,
}: CampaignManagementListPageProps) {
  const { organisationId } = useParams<{ organisationId: string }>();
  const { clearAuth, permissions } = useAuth();

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

  const heading = contextKind === 'platform' ? 'Platform Campaigns' : 'Campaigns';
  const helper =
    contextKind === 'platform'
      ? 'Create and manage campaigns available through Insightful Phish.'
      : 'Create and manage campaigns for your organisation.';

  const [query, setQuery] = useState<CampaignListQueryDto>(INITIAL_QUERY);
  const [result, setResult] = useState<GetCampaignsResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isListAccessRevoked, setIsListAccessRevoked] = useState(false);
  const requestIdRef = useRef(0);

  const loadCampaigns = useCallback(async () => {
    if (!context) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await client.listCampaigns(context, query);

      if (requestIdRef.current === requestId) {
        setResult(response);
      }
    } catch (error) {
      if (requestIdRef.current === requestId) {
        const presentation = getCampaignErrorPresentation(error, {
          fallback: 'Campaigns could not be loaded. Try again.',
          forbidden: 'You no longer have permission to view Campaigns.',
        });

        if (presentation.kind === 'unauthorized') {
          clearAuth();
        } else if (presentation.kind === 'forbidden') {
          setIsListAccessRevoked(true);
        }

        setResult(null);
        setLoadError(presentation.message);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [clearAuth, client, context, query]);

  useEffect(() => {
    // The asynchronous client request is effect-owned and guarded by requestIdRef
    // so an earlier response cannot overwrite the latest query result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCampaigns();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadCampaigns]);

  if (!context) {
    return <Navigate to="/" replace />;
  }

  const campaignListPath =
    context.kind === 'organisation'
      ? `/organisations/${context.organisationId}/campaigns`
      : '/platform/campaigns';

  const hasFilters = Boolean(query.search?.trim() || query.status);
  const isEmpty = !isLoading && !loadError && result !== null && result.pagination.totalItems === 0;
  const canManageCampaigns =
    !isListAccessRevoked &&
    (context.kind === 'platform' || permissions.includes('MANAGE_CAMPAIGNS'));

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <div className="campaign-page" aria-busy={isLoading}>
        <header className="campaign-page__header">
          <h1 className="campaign-page__title">{heading}</h1>
          <p className="campaign-page__helper">{helper}</p>
          {canManageCampaigns && (
            <Link
              className="campaign-button campaign-button--primary"
              to={`${campaignListPath}/new`}
            >
              Create Campaign
            </Link>
          )}
        </header>

        <section className="campaign-filters" aria-label="Campaign search and filters">
          <div className="campaign-search">
            <label htmlFor="campaign-search">Search campaigns</label>
            <div className="campaign-search__control">
              <AdminPagesSearchSVG />
              <input
                id="campaign-search"
                type="search"
                value={query.search ?? ''}
                placeholder="Search campaigns"
                onChange={(event) => {
                  const search = event.target.value;

                  setQuery((current) => ({
                    ...current,
                    page: 1,
                    search: search || undefined,
                  }));
                }}
              />
            </div>
          </div>

          <div className="campaign-filter">
            <label htmlFor="campaign-status-filter">Campaign status</label>
            <select
              id="campaign-status-filter"
              value={query.status ?? ''}
              onChange={(event) => {
                const status =
                  event.target.value === ''
                    ? undefined
                    : (event.target.value as CampaignListStatusFilter);

                setQuery((current) => ({
                  ...current,
                  page: 1,
                  status,
                }));
              }}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </section>

        {isLoading && (
          <div className="campaign-state" aria-live="polite">
            <span className="campaign-state__spinner">
              <LoadingSpinnerSVG />
            </span>
            <span>Loading campaigns…</span>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="campaign-error" role="alert">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => {
                void loadCampaigns();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {isEmpty && (
          <div className="campaign-state">
            <p>
              {hasFilters
                ? 'No campaigns match your search or filters.'
                : 'No campaigns have been created yet.'}
            </p>
          </div>
        )}

        {!isLoading && !loadError && result && result.items.length > 0 && (
          <>
            <h2 className="campaign-list__heading">Campaigns ({result.pagination.totalItems})</h2>

            <div className="campaign-list">
              {result.items.map((campaign) => {
                const campaignActionLabel = campaign.allowedActions.includes('VIEW')
                  ? campaign.status === 'DRAFT'
                    ? canManageCampaigns && campaign.allowedActions.includes('EDIT')
                      ? 'Continue Editing'
                      : 'View Draft'
                    : 'View Campaign'
                  : null;

                return (
                  <article className="campaign-card" key={campaign.id}>
                    <div
                      className="campaign-card__accent"
                      style={{
                        backgroundColor: campaign.accentColor ?? '#837DC3',
                      }}
                      aria-hidden="true"
                    />

                    <div className="campaign-card__body">
                      <div className="campaign-card__heading">
                        <div>
                          <h3>{campaign.name}</h3>
                          <p>{campaign.description || 'No description provided.'}</p>
                        </div>

                        <span className={STATUS_CLASSES[campaign.status]}>
                          {STATUS_LABELS[campaign.status]}
                        </span>
                      </div>

                      <dl className="campaign-metadata">
                        <div>
                          <dt>Ownership</dt>
                          <dd>{getOwnershipLabel(campaign)}</dd>
                        </div>

                        <div>
                          <dt>Items</dt>
                          <dd>{campaign.itemCount}</dd>
                        </div>

                        {context.kind === 'organisation' && (
                          <>
                            <div>
                              <dt>Start date</dt>
                              <dd>{formatDate(campaign.startDate)}</dd>
                            </div>

                            <div>
                              <dt>End date</dt>
                              <dd>{formatDate(campaign.endDate)}</dd>
                            </div>
                          </>
                        )}

                        <div>
                          <dt>Last updated</dt>
                          <dd>{formatUpdatedAt(campaign.updatedAt)}</dd>
                        </div>
                      </dl>

                      <div className="campaign-card__footer">
                        <span>
                          Created by {campaign.createdBy?.displayName ?? 'Unknown administrator'}
                        </span>

                        {campaignActionLabel && (
                          <Link className="campaign-link" to={`${campaignListPath}/${campaign.id}`}>
                            {campaignActionLabel}
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {result.pagination.totalPages > 1 && (
              <nav className="campaign-list__pagination" aria-label="Campaign pagination">
                <button
                  type="button"
                  disabled={!result.pagination.hasPreviousPage}
                  onClick={() => {
                    setQuery((current) => ({
                      ...current,
                      page: Math.max(1, result.pagination.page - 1),
                    }));
                  }}
                >
                  Previous
                </button>

                <span>
                  Page {result.pagination.page} of {result.pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={!result.pagination.hasNextPage}
                  onClick={() => {
                    setQuery((current) => ({
                      ...current,
                      page: result.pagination.page + 1,
                    }));
                  }}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default CampaignManagementListPage;
