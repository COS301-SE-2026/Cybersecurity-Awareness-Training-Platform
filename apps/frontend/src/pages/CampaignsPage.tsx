import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  GetTraineeCampaignDetailResponseDto,
  TraineeCampaignSummaryDto,
} from '@insightful-phish/shared';

import AppLayout from '../components/layout/AppLayout';
import CampaignAccordion from '../components/ui/CampaignAccordion';
import TrainingActionRow from '../components/ui/TrainingActionRow';
import CampaignActionRow from '../components/ui/CampaignActionRow';
import TrainingPartAccordion from '../components/ui/TrainingPartAccordion';

import { useAuth } from '../context/useAuth';
import { getTraineeCampaign, getTraineeCampaigns } from '../services/campaigns.service';

const ACCENT_COLORS = ['#00FFA6', '#FF00D4', '#00D1FF', '#FF9F1C'];

function formatCampaignStatus(status?: string | null): string {
  switch (status) {
    case 'COMPLETED':
      return 'COMPLETED';

    case 'IN_PROGRESS':
    case 'VIEWED':
    case 'INTERACTED':
      return 'STARTED';

    case 'NOT_STARTED':
    default:
      return 'NOT STARTED';
  }
}

function isCampaignItemDisabled(availabilityStatus: string): boolean {
  return availabilityStatus !== 'AVAILABLE';
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
          title={item.title}
          status={formatCampaignStatus(item.progressStatus)}
        >
          {renderCampaignItems(item.children, navigate)}
        </TrainingPartAccordion>
      );
    }

    if (item.itemType !== 'COMPONENT') {
      return null;
    }

    const disabled = isCampaignItemDisabled(item.availabilityStatus);

    if (item.componentType === 'TRAINING_DOCUMENT') {
      return (
        <TrainingActionRow
          key={item.campaignItemId}
          label="Learn"
          status={formatCampaignStatus(item.progressStatus)}
          disabled={disabled}
          onClick={disabled ? undefined : () => navigate(item.activityApiPath)}
        />
      );
    }

    if (item.componentType === 'QUIZ') {
      return (
        <TrainingActionRow
          key={item.campaignItemId}
          label="Quiz"
          status={formatCampaignStatus(item.progressStatus)}
          disabled={disabled}
          onClick={disabled ? undefined : () => navigate(item.activityApiPath)}
        />
      );
    }

    if (item.componentType === 'SIMULATED_INBOX') {
      return (
        <CampaignActionRow
          key={item.campaignItemId}
          title={item.title}
          status={formatCampaignStatus(item.progressStatus)}
          disabled={disabled}
          onClick={disabled ? undefined : () => navigate(item.activityApiPath)}
        />
      );
    }

    return null;
  });
}

function CampaignsPage() {
  const navigate = useNavigate();

  const { token } = useAuth();

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
      if (!token) {
        setError('NOT AUTHENTICATED');

        setLoading(false);

        return;
      }

      try {
        const data = await getTraineeCampaigns(token);

        setCampaigns(data.campaigns);
      } catch {
        setError('FAILED TO LOAD CAMPAIGNS');
      } finally {
        setLoading(false);
      }
    }

    void loadCampaigns();
  }, [token]);

  async function toggleCampaign(campaignId: string) {
    const isCurrentlyOpen = Boolean(openCampaigns[campaignId]);

    setOpenCampaigns((previous) => ({
      ...previous,
      [campaignId]: !previous[campaignId],
    }));

    if (isCurrentlyOpen || campaignDetails[campaignId] || !token) {
      return;
    }

    try {
      setLoadingCampaignDetails((previous) => ({
        ...previous,
        [campaignId]: true,
      }));

      const detail = await getTraineeCampaign(campaignId, token);
      console.log('CAMPAIGN DETAIL:', detail);

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
    <AppLayout>
      <div
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
          style={{
            margin: 0,
            marginBottom: '0.5rem',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'white',
            fontFamily: 'Jost',
          }}
        >
          Campaigns
        </h1>

        {loading && (
          <div
            style={{
              color: '#C98FFF',
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
              accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
              isOpen={Boolean(openCampaigns[campaign.campaignId])}
              onToggle={() => void toggleCampaign(campaign.campaignId)}
            >
              {loadingCampaignDetails[campaign.campaignId] && (
                <div
                  style={{
                    color: '#C98FFF',
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
