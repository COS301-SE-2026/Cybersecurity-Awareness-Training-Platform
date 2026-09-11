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
import { useAuth } from '../context/useAuth';
import PlatformCampaignDiscovery from './PlatformCampaignDiscovery';
import './CampaignsPage.css';

import { getTraineeCampaignDetail, getTraineeCampaigns } from '../lib/campaignsApi';
import { toTitleCase } from '../lib/text.utils';

const FALLBACK_ACCENT_COLORS = ['#00FFA6', '#FF00D4', '#00D1FF', '#FF9F1C'];

function getCampaignAccentColor(campaign: TraineeCampaignSummaryDto, index: number): string {
  return campaign.accentColor ?? FALLBACK_ACCENT_COLORS[index % FALLBACK_ACCENT_COLORS.length];
}

function formatCampaignStatus(status?: string | null): string {
  switch (status) {
    case 'COMPLETED':
      return 'COMPLETED';

    case 'SUBMITTED':
      return 'SUBMITTED';

    case 'IN_PROGRESS':
    case 'VIEWED':
    case 'INTERACTED':
    case 'CLASSIFIED':
      return 'STARTED';

    case 'NOT_STARTED':
      return 'NOT STARTED';

    default:
      return 'UNKNOWN';
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
  const { authContext, user } = useAuth();
  const isGeneralTrainee = (authContext?.role ?? user?.userType) === 'GENERAL_TRAINEE';

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
    setOpenCampaigns((previous) => ({
      ...previous,
      [campaignId]: true,
    }));
    setError('');
    document.getElementById('my-campaigns')?.focus();
  }

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

        {isGeneralTrainee && (
          <h2 id="my-campaigns" tabIndex={-1} className="font-jost text-2xl text-dark-pink">
            My campaigns
          </h2>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <p className="font-jost text-dark-pink">
            {isGeneralTrainee
              ? 'YOU HAVE NOT JOINED ANY CAMPAIGNS YET. DISCOVER ONE BELOW.'
              : 'NO CAMPAIGNS ARE ASSIGNED TO YOU.'}
          </p>
        )}
        {!loading &&
          campaigns.map((campaign, index) => (
            <CampaignAccordion
              key={campaign.campaignId}
              title={`Campaign ${index + 1}`}
              subtitle={campaign.name}
              status={formatCampaignStatus(campaign.progressStatus)}
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

        {isGeneralTrainee && !loading && (
          <PlatformCampaignDiscovery onOpenCampaign={openDiscoveredCampaign} />
        )}
      </div>
    </AppLayout>
  );
}

export default CampaignsPage;
