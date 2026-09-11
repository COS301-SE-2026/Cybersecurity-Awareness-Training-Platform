import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  GetTraineeCampaignDetailResponseDto,
  TraineeCampaignSummaryDto,
} from '@insightful-phish/shared';

import AppLayout from '../components/layout/AppLayout';
import CampaignAccordion from '../components/ui/CampaignAccordion';
import TrainingActionRow from '../components/ui/TrainingActionRow';
import TrainingPartAccordion from '../components/ui/TrainingPartAccordion';
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
      return 'Review Campaign';
    case 'AVAILABLE':
      break;
  }

  switch (campaign.progressStatus) {
    case 'NOT_STARTED':
      return 'Start Campaign';
    case 'COMPLETED':
    case 'SUBMITTED':
      return 'Review Campaign';
    case 'VIEWED':
    case 'INTERACTED':
    case 'CLASSIFIED':
    case 'IN_PROGRESS':
      return 'Continue Campaign';
    default:
      return 'No Action Available';
  }
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

  const [campaigns, setCampaigns] = useState<TraineeCampaignSummaryDto[]>([]);
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({});
  const [campaignDetails, setCampaignDetails] = useState<
    Record<string, GetTraineeCampaignDetailResponseDto>
  >({});
  const [loadingCampaignDetails, setLoadingCampaignDetails] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const data = await getTraineeCampaigns();

        setCampaigns(data.campaigns);
      } catch {
        setError('FAILED TO LOAD CAMPAIGNS');
      } finally {
        setLoading(false);
      }
    }

    void loadCampaigns();
  }, []);

  async function toggleCampaign(campaignId: string) {
    const isCurrentlyOpen = Boolean(openCampaigns[campaignId]);

    setOpenCampaigns((previous) => ({
      ...previous,
      [campaignId]: !previous[campaignId],
    }));

    if (isCurrentlyOpen || campaignDetails[campaignId]) {
      return;
    }

    try {
      setLoadingCampaignDetails((previous) => ({
        ...previous,
        [campaignId]: true,
      }));

      const detail = await getTraineeCampaignDetail(campaignId);

      setCampaignDetails((previous) => ({
        ...previous,
        [campaignId]: detail,
      }));
    } catch {
      setError('FAILED TO LOAD CAMPAIGN DETAILS');
    } finally {
      setLoadingCampaignDetails((previous) => ({
        ...previous,
        [campaignId]: false,
      }));
    }
  }

  return (
    <AppLayout className="campaigns-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
      <div
        className="campaigns-page"
        style={{
          padding: '1.4rem',
          paddingBottom: '2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          userSelect: 'none',
        }}
      >
        <h1
          className="campaigns-page__title"
          style={{
            margin: 0,
            marginBottom: '0.5rem',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'var(--ip-dark-pink)',
            fontFamily: 'Jost',
          }}
        >
          Campaigns
        </h1>

        {loading && (
          <div
            style={{
              color: 'var(--ip-dark-pink)',
              fontFamily: 'Jost',
              fontSize: '1.2rem',
            }}
          >
            LOADING CAMPAIGNS...
          </div>
        )}

        {error && (
          <div
            style={{
              color: '#FF7A7A',
              fontFamily: 'Jost',
              fontSize: '1.2rem',
            }}
          >
            {error}
          </div>
        )}

        {!loading &&
          !error &&
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
              {loadingCampaignDetails[campaign.campaignId] && (
                <div
                  style={{
                    color: 'var(--ip-dark-pink)',
                    fontFamily: 'Jost',
                    padding: '1rem',
                  }}
                >
                  LOADING CAMPAIGN...
                </div>
              )}

              {campaignDetails[campaign.campaignId] &&
                renderCampaignItems(campaignDetails[campaign.campaignId].items, navigate)}
            </CampaignAccordion>
          ))}
      </div>
    </AppLayout>
  );
}

export default CampaignsPage;
