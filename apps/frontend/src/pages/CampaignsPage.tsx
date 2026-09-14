import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  GetTraineeCampaignDetailResponseDto,
  TraineeCampaignSummaryDto,
} from '@insightful-phish/shared';

import AppLayout from '../components/layout/AppLayout';
import CampaignAccordion from '../components/ui/CampaignAccordion';
import TrainingActionRow from '../components/ui/TrainingActionRow';
import TrainingPartAccordion from '../components/ui/TrainingPartAccordion';
import { useAuth } from '../context/useAuth';
import PlatformCampaignDiscovery from './PlatformCampaignDiscovery';
import './CampaignsPage.css';

import { getTraineeCampaignDetail, getTraineeCampaigns } from '../lib/campaignsApi';
import { toTitleCase } from '../lib/text.utils';

const FALLBACK_ACCENT_COLORS = ['#00FFA6', '#FF00D4', '#00D1FF', '#FF9F1C'];

function getCampaignAccentColor(campaign: TraineeCampaignSummaryDto, index: number): string {
  return campaign.accentColor ?? FALLBACK_ACCENT_COLORS[index % FALLBACK_ACCENT_COLORS.length];
}

function formatCampaignStatus(status: TraineeCampaignSummaryDto['progressStatus']): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';

    case 'SUBMITTED':
      return 'Submitted';

    case 'IN_PROGRESS':
      return 'In Progress';

    case 'VIEWED':
      return 'Viewed';

    case 'INTERACTED':
      return 'Interacted';

    case 'CLASSIFIED':
      return 'Classified';

    case 'NOT_STARTED':
      return 'Not Started';

    default:
      return 'Unknown';
  }
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

function getCampaignDeadline(campaign: TraineeCampaignSummaryDto): string | null {
  return campaign.assignment?.dueDate ?? campaign.endDate ?? null;
}

function getCampaignNextAction(campaign: TraineeCampaignSummaryDto): string {
  switch (campaign.eligibility.reason) {
    case 'NOT_STARTED':
      return 'Wait for Campaign to Start';
    case 'EXPIRED':
    case 'CAMPAIGN_INACTIVE':
      return 'No Action Available';
    case 'COMPLETED':
      return 'No Action Required';
    case 'AVAILABLE':
      break;
  }

  if (campaign.progressStatus === 'COMPLETED' || campaign.progressStatus === 'SUBMITTED') {
    return 'No Action Required';
  }

  if (campaign.nextItem === null || campaign.nextItem === undefined) {
    return 'No Action Available';
  }

  const action = campaign.nextItem.progressStatus === 'NOT_STARTED' ? 'Start' : 'Continue';

  return `${action} ${toTitleCase(campaign.nextItem.title)}`;
}

function getCampaignItemRoute(
  item: GetTraineeCampaignDetailResponseDto['items'][number],
): string | null {
  if (item.itemType !== 'COMPONENT' || !item.activityApiPath) {
    return null;
  }

  switch (item.componentType) {
    case 'TRAINING_DOCUMENT':
      return item.activityApiPath.endsWith('/training-document')
        ? `/training/${item.campaignItemId}`
        : null;
    case 'QUIZ':
      return item.activityApiPath.endsWith('/quiz') ? `/quizzes/${item.campaignItemId}` : null;
    case 'SIMULATED_INBOX':
      return item.activityApiPath.endsWith('/simulated-inbox')
        ? `/trainee/campaign-items/${item.campaignItemId}/simulated-inbox`
        : null;
    default:
      return null;
  }
}

function renderCampaignItems(
  items: GetTraineeCampaignDetailResponseDto['items'],
  navigate: ReturnType<typeof useNavigate>,
) {
  return items.map((item) => {
    if (item.itemType === 'GROUP') {
      return (
        <TrainingPartAccordion
          key={item.campaignItemId}
          title={toTitleCase(item.title)}
          status={formatCampaignStatus(item.progressStatus)}
        >
          {renderCampaignItems(item.children, navigate)}
        </TrainingPartAccordion>
      );
    }

    if (item.componentType === 'TRAINING_DOCUMENT') {
      const actionRoute = getCampaignItemRoute(item);

      if (!actionRoute) {
        return null;
      }

      const disabled = item.availabilityStatus !== 'AVAILABLE' || !item.isOpenable;

      return (
        <TrainingActionRow
          key={item.campaignItemId}
          label={`Learn: "${toTitleCase(item.title)}"`}
          status={formatCampaignStatus(item.progressStatus)}
          disabled={disabled}
          showLockIcon={disabled}
          iconType="learn"
          onClick={disabled ? undefined : () => navigate(actionRoute)}
        />
      );
    }

    if (item.componentType === 'QUIZ') {
      const actionRoute = getCampaignItemRoute(item);

      if (!actionRoute) {
        return null;
      }

      const disabled = item.availabilityStatus !== 'AVAILABLE' || !item.isOpenable;

      return (
        <TrainingActionRow
          key={item.campaignItemId}
          label={`Quiz: "${toTitleCase(item.title)}"`}
          status={formatCampaignStatus(item.progressStatus)}
          disabled={disabled}
          showLockIcon={disabled}
          iconType="quiz"
          onClick={disabled ? undefined : () => navigate(actionRoute)}
        />
      );
    }

    if (item.componentType === 'SIMULATED_INBOX') {
      const actionRoute = getCampaignItemRoute(item);

      if (!actionRoute) {
        return null;
      }

      const disabled = item.availabilityStatus !== 'AVAILABLE' || !item.isOpenable;

      return (
        <TrainingActionRow
          key={item.campaignItemId}
          label={`Simulation: ${toTitleCase(item.title)}`}
          status={formatCampaignStatus(item.progressStatus)}
          disabled={disabled}
          showLockIcon={disabled}
          iconType="simulation"
          onClick={disabled ? undefined : () => navigate(actionRoute)}
        />
      );
    }

    return null;
  });
}

function CampaignsPage() {
  const navigate = useNavigate();
  const { authContext, user } = useAuth();
  const isGeneralTrainee = (authContext?.role ?? user?.userType) === 'GENERAL_TRAINEE';

  const [campaigns, setCampaigns] = useState<TraineeCampaignSummaryDto[]>([]);
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({});
  const [campaignDetails, setCampaignDetails] = useState<
    Record<string, GetTraineeCampaignDetailResponseDto>
  >({});
  const [loadingCampaignDetails, setLoadingCampaignDetails] = useState<Record<string, boolean>>({});
  const [campaignDetailErrors, setCampaignDetailErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getTraineeCampaigns();

      setCampaigns(data.campaigns);
    } catch {
      setError('Campaigns Could Not Be Loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  async function openDiscoveredCampaign(campaignId: string) {
    const [response, detail] = await Promise.all([
      getTraineeCampaigns(),
      getTraineeCampaignDetail(campaignId),
    ]);

    setCampaigns(response.campaigns);
    setCampaignDetails((previous) => ({
      ...previous,
      [campaignId]: detail,
    }));
    setCampaignDetailErrors((previous) => ({
      ...previous,
      [campaignId]: '',
    }));
    setOpenCampaigns((previous) => ({
      ...previous,
      [campaignId]: true,
    }));
    setError('');
    document.getElementById('my-campaigns')?.focus();
  }

  useEffect(() => {
    let isActive = true;

    void getTraineeCampaigns()
      .then((data) => {
        if (isActive === true) {
          setCampaigns(data.campaigns);
        }
      })
      .catch(() => {
        if (isActive === true) {
          setError('Campaigns Could Not Be Loaded');
        }
      })
      .finally(() => {
        if (isActive === true) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function loadCampaignDetail(campaignId: string) {
    setLoadingCampaignDetails((previous) => ({
      ...previous,
      [campaignId]: true,
    }));
    setCampaignDetailErrors((previous) => ({
      ...previous,
      [campaignId]: '',
    }));

    try {
      const detail = await getTraineeCampaignDetail(campaignId);

      setCampaignDetails((previous) => ({
        ...previous,
        [campaignId]: detail,
      }));
    } catch {
      setCampaignDetailErrors((previous) => ({
        ...previous,
        [campaignId]: 'Campaign Details Could Not Be Loaded',
      }));
    } finally {
      setLoadingCampaignDetails((previous) => ({
        ...previous,
        [campaignId]: false,
      }));
    }
  }

  async function toggleCampaign(campaignId: string) {
    const isCurrentlyOpen = Boolean(openCampaigns[campaignId]);

    setOpenCampaigns((previous) => ({
      ...previous,
      [campaignId]: previous[campaignId] !== true,
    }));

    if (
      isCurrentlyOpen ||
      campaignDetails[campaignId] !== undefined ||
      loadingCampaignDetails[campaignId] === true
    ) {
      return;
    }

    await loadCampaignDetail(campaignId);
  }

  return (
    <AppLayout className="campaigns-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
      <div
        className="campaigns-page"
        style={{
          padding: '1.25rem',
          paddingBottom: '1.5rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          userSelect: 'none',
        }}
      >
        <h1
          className="campaigns-page__title"
          style={{
            margin: 0,
            marginBottom: '0.25rem',
            fontSize: '2.5rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'var(--ip-dark-pink)',
            fontFamily: 'Jost',
          }}
        >
          Campaigns
        </h1>

        {isGeneralTrainee && (
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 px-4 bg-white border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2"
            aria-label="Campaign summary statistics"
            aria-busy={loading}
          >
            {[
              { label: 'My campaigns', value: campaigns.length },
              {
                label: 'Not started',
                value: campaigns.filter((campaign) => campaign.progressStatus === 'NOT_STARTED')
                  .length,
              },
              {
                label: 'Started',
                value: campaigns.filter(
                  (campaign) =>
                    campaign.progressStatus != null &&
                    ['VIEWED', 'INTERACTED', 'CLASSIFIED', 'IN_PROGRESS', 'SUBMITTED'].includes(
                      campaign.progressStatus,
                    ),
                ).length,
              },
              {
                label: 'Completed',
                value: campaigns.filter((campaign) => campaign.progressStatus === 'COMPLETED')
                  .length,
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  {label}
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  {loading ? '…' : error ? '-' : value}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading === true && (
          <output className="campaigns-page__state">Loading Campaigns...</output>
        )}

        {loading === false && error.length > 0 && (
          <div className="campaigns-page__state campaigns-page__state--error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void loadCampaigns()}>
              Try Again
            </button>
          </div>
        )}

        {loading === false && error.length === 0 && campaigns.length === 0 && (
          <div className="campaigns-page__state">
            <p>No Campaigns Available</p>
            <span>
              {isGeneralTrainee
                ? 'Discover an available platform campaign below.'
                : 'Your assigned campaigns will appear here.'}
            </span>
          </div>
        )}

        {isGeneralTrainee && (
          <h2 id="my-campaigns" tabIndex={-1} className="font-jost text-2xl text-dark-pink">
            My campaigns
          </h2>
        )}

        {loading === false &&
          error.length === 0 &&
          campaigns.map((campaign, index) => (
            <CampaignAccordion
              key={campaign.campaignId}
              title={`Campaign ${index + 1}`}
              subtitle={campaign.name}
              status={formatCampaignStatus(campaign.progressStatus)}
              startDate={formatCampaignDate(campaign.startDate, 'No Start Date')}
              deadline={formatCampaignDate(getCampaignDeadline(campaign), 'No Deadline')}
              nextAction={getCampaignNextAction(campaign)}
              accentColor={getCampaignAccentColor(campaign, index)}
              isOpen={Boolean(openCampaigns[campaign.campaignId])}
              onToggle={() => void toggleCampaign(campaign.campaignId)}
            >
              {loadingCampaignDetails[campaign.campaignId] === true && (
                <output className="campaigns-page__detail-state">
                  Loading Campaign Details...
                </output>
              )}

              {(campaignDetailErrors[campaign.campaignId] ?? '').length > 0 && (
                <div
                  className="campaigns-page__detail-state campaigns-page__detail-state--error"
                  role="alert"
                >
                  <p>{campaignDetailErrors[campaign.campaignId]}</p>
                  <button
                    type="button"
                    onClick={() => void loadCampaignDetail(campaign.campaignId)}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {loadingCampaignDetails[campaign.campaignId] !== true &&
                (campaignDetailErrors[campaign.campaignId] ?? '').length === 0 &&
                campaignDetails[campaign.campaignId]?.items.length === 0 && (
                  <div className="campaigns-page__detail-state">No Campaign Content Available</div>
                )}

              {loadingCampaignDetails[campaign.campaignId] !== true &&
                (campaignDetailErrors[campaign.campaignId] ?? '').length === 0 &&
                campaignDetails[campaign.campaignId] !== undefined &&
                renderCampaignItems(campaignDetails[campaign.campaignId].items, navigate)}
            </CampaignAccordion>
          ))}

        {isGeneralTrainee && !loading && (
          <PlatformCampaignDiscovery onOpenCampaign={openDiscoveredCampaign} />
        )}
      </div>
    </AppLayout>
  );
}

export default CampaignsPage;
