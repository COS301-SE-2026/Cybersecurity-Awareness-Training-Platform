import { useEffect, useRef, useState } from 'react';
import type {
  GetPlatformCampaignsResponseDto,
  PlatformCampaignSummaryDto,
} from '@insightful-phish/shared';

import CampaignAccordion from '../components/ui/CampaignAccordion';
import TrainingActionRow from '../components/ui/TrainingActionRow';
import { ApiError } from '../lib/apiClient';
import { discoverPlatformCampaigns, enrolPlatformCampaign } from '../lib/campaignsApi';
import CampaignAssignmentPagination from './campaign-assignment/CampaignAssignmentPagination';

type PlatformCampaignDiscoveryProps = Readonly<{
  onOpenCampaign: (campaignId: string) => Promise<void>;
}>;

function isInsideEnrolmentWindow(campaign: PlatformCampaignSummaryDto): boolean {
  const now = Date.now();
  const startDate = campaign.startDate ? Date.parse(campaign.startDate) : null;
  const endDate = campaign.endDate ? Date.parse(campaign.endDate) : null;

  return (startDate === null || startDate <= now) && (endDate === null || now < endDate);
}

function canEnrolCampaign(campaign: PlatformCampaignSummaryDto): boolean {
  return (
    campaign.eligibility.canView &&
    campaign.eligibility.canProgress &&
    isInsideEnrolmentWindow(campaign)
  );
}

function formatCampaignDate(value: string | null | undefined, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRequestErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'REQUEST FAILED. PLEASE TRY AGAIN.';
}

function PlatformCampaignDiscovery({ onOpenCampaign }: PlatformCampaignDiscoveryProps) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<GetPlatformCampaignsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmedEnrolments, setConfirmedEnrolments] = useState<Record<string, boolean>>({});
  const requestInFlight = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadCampaigns() {
      setLoading(true);
      setLoadError('');

      try {
        const response = await discoverPlatformCampaigns({ page, limit: 10 });

        if (active) {
          setData(response);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'FAILED TO LOAD PLATFORM CAMPAIGNS. TRY AGAIN.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCampaigns();

    return () => {
      active = false;
    };
  }, [page, retry]);

  async function enrolOrOpen(campaign: PlatformCampaignSummaryDto) {
    if (requestInFlight.current) {
      return;
    }

    const campaignId = campaign.campaignId;
    let enrolled = Boolean(
      campaign.isEnrolled || campaign.assignment || confirmedEnrolments[campaignId],
    );

    if (!enrolled && !canEnrolCampaign(campaign)) {
      return;
    }

    requestInFlight.current = true;
    setPendingId(campaignId);
    setActionError('');

    try {
      if (!enrolled) {
        await enrolPlatformCampaign({ campaignId });
        enrolled = true;
        setConfirmedEnrolments((previous) => ({
          ...previous,
          [campaignId]: true,
        }));
      }

      await onOpenCampaign(campaignId);
    } catch (error) {
      const message = getRequestErrorMessage(error);

      setActionError(
        enrolled ? `YOU ARE ENROLLED, BUT THE CAMPAIGN COULD NOT BE OPENED. ${message}` : message,
      );
    } finally {
      requestInFlight.current = false;
      setPendingId(null);
    }
  }

  return (
    <section
      aria-label="Discover platform campaigns"
      aria-busy={loading || pendingId !== null}
      className="flex flex-col gap-4 font-jost text-dark-pink"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-medium">Discover platform campaigns</h2>
        <button
          type="button"
          className="text-purple underline disabled:opacity-50"
          disabled={loading || pendingId !== null}
          onClick={() => setRetry((previous) => previous + 1)}
        >
          Refresh list
        </button>
      </div>

      {loading && <p role="status">LOADING PLATFORM CAMPAIGNS...</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {actionError && <p role="alert">{actionError}</p>}

      {!loading && !loadError && data?.items.length === 0 && (
        <p>NO PLATFORM CAMPAIGNS ARE AVAILABLE RIGHT NOW.</p>
      )}

      {!loading &&
        !loadError &&
        data?.items.map((campaign) => {
          const enrolled = Boolean(
            campaign.isEnrolled || campaign.assignment || confirmedEnrolments[campaign.campaignId],
          );
          const available = enrolled || canEnrolCampaign(campaign);
          const pending = pendingId === campaign.campaignId;
          const status = pending
            ? enrolled
              ? 'OPENING...'
              : 'ENROLLING...'
            : enrolled
              ? 'ENROLLED'
              : available
                ? 'AVAILABLE'
                : 'UNAVAILABLE';

          return (
            <CampaignAccordion
              key={campaign.campaignId}
              title="Platform campaign"
              subtitle={campaign.name}
              status={status}
              startDate={formatCampaignDate(campaign.startDate, 'No Start Date')}
              deadline={formatCampaignDate(
                campaign.assignment?.dueDate ?? campaign.endDate,
                'No Deadline',
              )}
              nextAction={
                enrolled
                  ? 'Continue Campaign'
                  : available
                    ? 'Enrol in Campaign'
                    : 'No Action Available'
              }
              accentColor={campaign.accentColor ?? '#00FFA6'}
              isOpen={openCampaignId === campaign.campaignId}
              onToggle={() =>
                setOpenCampaignId((previous) =>
                  previous === campaign.campaignId ? null : campaign.campaignId,
                )
              }
            >
              {campaign.description && <p>{campaign.description}</p>}
              <TrainingActionRow
                label={`${enrolled ? 'Continue' : 'Enrol'}: ${campaign.name}`}
                status={status}
                disabled={pendingId !== null || !available}
                showLockIcon={!available}
                onClick={() => void enrolOrOpen(campaign)}
              />
            </CampaignAccordion>
          );
        })}

      {data && !loadError && data.pagination.totalPages > 1 && (
        <CampaignAssignmentPagination
          className="flex justify-end"
          ariaLabel="Platform campaign discovery pages"
          currentPage={page}
          totalPages={data.pagination.totalPages}
          isLoading={loading || pendingId !== null}
          setCurrentPage={setPage}
        />
      )}
    </section>
  );
}

export default PlatformCampaignDiscovery;
