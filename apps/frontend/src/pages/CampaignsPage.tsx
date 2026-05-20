import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { TraineeCampaignSummaryDto } from '@insightful-phish/shared';

import AppLayout from '../components/layout/AppLayout';
import CampaignAccordion from '../components/ui/CampaignAccordion';

import { useAuth } from '../context/useAuth';
import { getTraineeCampaigns } from '../services/campaigns.service';

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

function CampaignsPage() {
  const navigate = useNavigate();

  const { token } = useAuth();

  const [campaigns, setCampaigns] = useState<TraineeCampaignSummaryDto[]>([]);

  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({});

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

  function toggleCampaign(campaignId: string) {
    setOpenCampaigns((previous) => ({
      ...previous,
      [campaignId]: !previous[campaignId],
    }));
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
              onToggle={() => toggleCampaign(campaign.campaignId)}
            />
          ))}
      </div>
    </AppLayout>
  );
}

export default CampaignsPage;
