import { useEffect, useState } from 'react';
import type { PhishingSimulationDetailResponseDto } from '@insightful-phish/shared';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import { getOrganisationCampaignDetail } from '../../lib/campaignsApi';
import {
  createPhishingSimulationDraft,
  getPhishingSimulation,
  listPhishingSimulations,
} from '../../services/phishing-simulation.service';
import './campaign-management.css';

type SimulationLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; simulation: PhishingSimulationDetailResponseDto };

const STATUS_LABELS: Record<PhishingSimulationDetailResponseDto['status'], string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  STOPPED: 'Stopped',
};

const draftResolutionRequests = new Map<string, Promise<string>>();

function simulationPath(organisationId: string, campaignId: string, simulationId: string): string {
  return `/organisations/${encodeURIComponent(organisationId)}/campaigns/${encodeURIComponent(
    campaignId,
  )}/phishing-simulations/${encodeURIComponent(simulationId)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function resolveSimulationDraft(organisationId: string, campaignId: string): Promise<string> {
  const requestKey = `${organisationId}:${campaignId}`;
  const existingRequest = draftResolutionRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = getOrganisationCampaignDetail(organisationId, campaignId).then(
    async (campaign) => {
      if (campaign.status !== 'DRAFT' && campaign.status !== 'ACTIVE') {
        throw new Error(
          'Phishing simulation setup is available only for Draft or Active Campaigns.',
        );
      }

      const { items } = await listPhishingSimulations(organisationId, campaignId);
      const existingDraft = items.find((simulation) => simulation.status === 'DRAFT');

      if (existingDraft) {
        return existingDraft.id;
      }

      const created = await createPhishingSimulationDraft(organisationId, campaignId, {});
      return created.id;
    },
  );

  draftResolutionRequests.set(requestKey, request);

  const clearRequest = () => {
    if (draftResolutionRequests.get(requestKey) === request) {
      draftResolutionRequests.delete(requestKey);
    }
  };

  void request.then(clearRequest, clearRequest);

  return request;
}

export function PhishingSimulationSetupResolver() {
  const { organisationId, campaignId } = useParams<{
    organisationId: string;
    campaignId: string;
  }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    if (!organisationId || !campaignId) {
      return;
    }

    let isCurrent = true;

    void resolveSimulationDraft(organisationId, campaignId)
      .then((simulationId) => {
        if (isCurrent) {
          navigate(simulationPath(organisationId, campaignId, simulationId), { replace: true });
        }
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setError(
            getErrorMessage(cause, 'The phishing simulation Draft could not be opened. Try again.'),
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [campaignId, navigate, organisationId, retryAttempt]);

  if (!organisationId || !campaignId) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <main className="campaign-detail-shell">
        <Link
          className="campaign-back-link"
          to={`/organisations/${encodeURIComponent(organisationId)}/campaigns/${encodeURIComponent(campaignId)}`}
        >
          <span aria-hidden="true">←</span>
          <span>Back to Campaign</span>
        </Link>

        <header className="campaign-page__header">
          <div>
            <h1 className="campaign-page__title">Phishing Simulation Setup</h1>
            <p className="campaign-page__helper">
              Opening the latest simulation Draft for this Campaign.
            </p>
          </div>
        </header>

        {error ? (
          <section className="campaign-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRetryAttempt((current) => current + 1);
              }}
            >
              Retry
            </button>
          </section>
        ) : (
          <section className="campaign-state" aria-live="polite">
            <span className="campaign-state__spinner">
              <LoadingSpinnerSVG />
            </span>
            <span>Opening simulation setup…</span>
          </section>
        )}
      </main>
    </AppLayout>
  );
}

function PhishingSimulationSetupPage() {
  const { organisationId, campaignId, simulationId } = useParams<{
    organisationId: string;
    campaignId: string;
    simulationId: string;
  }>();
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [loadState, setLoadState] = useState<SimulationLoadState>({ status: 'loading' });

  useEffect(() => {
    if (!organisationId || !campaignId || !simulationId) {
      return;
    }

    let isCurrent = true;

    void getPhishingSimulation(organisationId, campaignId, simulationId)
      .then((simulation) => {
        if (isCurrent) {
          setLoadState({ status: 'loaded', simulation });
        }
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setLoadState({
            status: 'error',
            message: getErrorMessage(
              cause,
              'The phishing simulation could not be loaded. Try again.',
            ),
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [campaignId, organisationId, retryAttempt, simulationId]);

  if (!organisationId || !campaignId || !simulationId) {
    return <Navigate to="/" replace />;
  }

  const campaignPath = `/organisations/${encodeURIComponent(
    organisationId,
  )}/campaigns/${encodeURIComponent(campaignId)}`;

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <main className="campaign-detail-shell" aria-busy={loadState.status === 'loading'}>
        <Link className="campaign-back-link" to={campaignPath}>
          <span aria-hidden="true">←</span>
          <span>Back to Campaign</span>
        </Link>

        <header className="campaign-page__header">
          <div>
            <h1 className="campaign-page__title">Phishing Simulation Setup</h1>
            <p className="campaign-page__helper">
              Configure the phishing simulation for this Campaign.
            </p>
          </div>
        </header>

        {loadState.status === 'loading' && (
          <section className="campaign-state" aria-live="polite">
            <span className="campaign-state__spinner">
              <LoadingSpinnerSVG />
            </span>
            <span>Loading simulation setup…</span>
          </section>
        )}

        {loadState.status === 'error' && (
          <section className="campaign-error" role="alert">
            <p>{loadState.message}</p>
            <button
              type="button"
              onClick={() => {
                setLoadState({ status: 'loading' });
                setRetryAttempt((current) => current + 1);
              }}
            >
              Retry
            </button>
          </section>
        )}

        {loadState.status === 'loaded' && (
          <section className="campaign-lifecycle" aria-labelledby="simulation-setup-heading">
            <h2 id="simulation-setup-heading">Simulation setup</h2>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{STATUS_LABELS[loadState.simulation.status]}</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>{loadState.simulation.timezone}</dd>
              </div>
            </dl>
            <p>Simulation setup will be configured here.</p>
          </section>
        )}
      </main>
    </AppLayout>
  );
}

export default PhishingSimulationSetupPage;
