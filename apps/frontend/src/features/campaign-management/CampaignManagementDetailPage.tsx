import { Link, Navigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import type { CampaignManagementContext } from './campaignManagement.types';
import './campaign-management.css';

type CampaignManagementDetailPageProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
}>;

function CampaignManagementDetailPage({ contextKind }: CampaignManagementDetailPageProps) {
  const { organisationId, campaignId } = useParams<{
    organisationId: string;
    campaignId: string;
  }>();

  if (contextKind === 'organisation' && !organisationId) {
    return <Navigate to="/" replace />;
  }

  const campaignListPath =
    contextKind === 'organisation'
      ? `/organisations/${organisationId}/campaigns`
      : '/platform/campaigns';

  const isNew = campaignId === undefined;

  return (
    <AppLayout>
      <main className="campaign-detail-shell">
        <Link className="campaign-back-link" to={campaignListPath}>
          <span aria-hidden="true">←</span>
          <span>Back to Campaigns</span>
        </Link>

        <header className="campaign-page__header">
          <div>
            <h1 className="campaign-page__title">{isNew ? 'Create Campaign' : 'Campaign'}</h1>
            <p className="campaign-page__helper">
              Build a campaign by selecting and organising campaign items.
            </p>
          </div>
        </header>

        <section className="campaign-state">
          {isNew
            ? 'Campaign Draft details will be configured here.'
            : 'Campaign details will load here.'}
        </section>
      </main>
    </AppLayout>
  );
}

export default CampaignManagementDetailPage;
