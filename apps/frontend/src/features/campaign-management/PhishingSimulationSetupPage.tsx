import { useEffect, useState } from 'react';
import type { PhishingSimulationDetailResponseDto, WeekdayDto } from '@insightful-phish/shared';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import { getOrganisationCampaignDetail } from '../../lib/campaignsApi';
import {
  createPhishingSimulationDraft,
  getPhishingSimulation,
  listPhishingSimulations,
} from '../../services/phishing-simulation.service';
import { toDateTimeLocal } from './campaignDraftDate';
import './campaign-management.css';

type SimulationLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; simulation: PhishingSimulationDetailResponseDto };

type SimulationSetupFormState = {
  name: string;
  startAt: string;
  endAt: string;
  sendFrom: string;
  sendUntil: string;
  weekdays: WeekdayDto[];
  emailCount: string;
  providerProfileIds: string[];
};

const WEEKDAY_OPTIONS: ReadonlyArray<{
  value: WeekdayDto;
  label: string;
}> = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const STATUS_LABELS: Record<PhishingSimulationDetailResponseDto['status'], string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  STOPPED: 'Stopped',
};

function toSimulationSetupFormState(
  simulation: PhishingSimulationDetailResponseDto,
): SimulationSetupFormState {
  return {
    name: simulation.name ?? '',
    startAt: toDateTimeLocal(simulation.startAt),
    endAt: toDateTimeLocal(simulation.endAt),
    sendFrom: simulation.sendFrom ?? '',
    sendUntil: simulation.sendUntil ?? '',
    weekdays: [...simulation.weekdays],
    emailCount: simulation.emailCount === null ? '' : String(simulation.emailCount),
    providerProfileIds: [...simulation.providerProfileIds],
  };
}

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

function SimulationSetupForm({
  simulation,
}: Readonly<{ simulation: PhishingSimulationDetailResponseDto }>) {
  const [form, setForm] = useState<SimulationSetupFormState>(() =>
    toSimulationSetupFormState(simulation),
  );

  function updateForm(updates: Partial<SimulationSetupFormState>) {
    setForm((current) => ({
      ...current,
      ...updates,
    }));
  }

  function toggleWeekday(weekday: WeekdayDto, checked: boolean) {
    setForm((current) => ({
      ...current,
      weekdays: checked
        ? [...current.weekdays, weekday]
        : current.weekdays.filter((candidate) => candidate !== weekday),
    }));
  }

  return (
    <form
      className="simulation-setup-form"
      aria-label="Phishing simulation setup fields"
      onSubmit={(event) => event.preventDefault()}
    >
      <section className="simulation-setup-section" aria-labelledby="simulation-details-heading">
        <header className="simulation-setup-section__heading">
          <div>
            <h2 id="simulation-details-heading">Simulation details</h2>
            <p>Configure the identity and delivery schedule for this simulation.</p>
          </div>
          <dl className="campaign-review__metadata">
            <div>
              <dt>Status</dt>
              <dd>{STATUS_LABELS[simulation.status]}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{simulation.timezone}</dd>
            </div>
          </dl>
        </header>

        <div className="campaign-form-field">
          <label htmlFor="simulation-name">Simulation name</label>
          <input
            id="simulation-name"
            name="simulation-name"
            type="text"
            maxLength={200}
            value={form.name}
            onChange={(event) => updateForm({ name: event.target.value })}
          />
        </div>
      </section>

      <section className="simulation-setup-section" aria-labelledby="simulation-schedule-heading">
        <div className="simulation-setup-section__heading">
          <h2 id="simulation-schedule-heading">Schedule</h2>
          <p id="simulation-timezone-helper">
            Start and end date are shown in your browser's local timezone. Daily sending times use{' '}
            {simulation.timezone}.
          </p>
        </div>

        <div className="simulation-setup-grid">
          <div className="campaign-form-field">
            <label htmlFor="simulation-start-at">Start date and time</label>
            <input
              id="simulation-start-at"
              name="simulation-start-at"
              type="datetime-local"
              value={form.startAt}
              aria-describedby="simulation-timezone-helper"
              onChange={(event) => updateForm({ startAt: event.target.value })}
            />
          </div>

          <div className="simulation-setup-grid">
            <div className="campaign-form-field">
              <label htmlFor="simulation-end-at">End date and time</label>
              <input
                id="simulation-end-at"
                name="simulation-end-at"
                type="datetime-local"
                value={form.endAt}
                aria-describedby="simulation-timezone-helper"
                onChange={(event) => updateForm({ endAt: event.target.value })}
              />
            </div>
          </div>

          <div className="simulation-setup-grid">
            <div className="campaign-form-field">
              <label htmlFor="simulation-send-from">Send from</label>
              <input
                id="simulation-send-from"
                name="simulation-send-from"
                type="time"
                value={form.sendFrom}
                aria-describedby="simulation-timezone-helper"
                onChange={(event) => updateForm({ sendFrom: event.target.value })}
              />
            </div>

            <div className="campaign-form-field">
              <label htmlFor="simulation-send-until">Send until</label>
              <input
                id="simulation-send-until"
                name="simulation-send-until"
                type="time"
                value={form.sendUntil}
                aria-describedby="simulation-timezone-helper"
                onChange={(event) => updateForm({ sendUntil: event.target.value })}
              />
            </div>
          </div>
        </div>
      </section>

      <fieldset className="simulation-setup-section simulation-setup-weekdays">
        <legend>Sending weekdays</legend>
        <p className="simulation-setup-helper">
          Choose the weekdays on which simulation emails may be sent.
        </p>
        <div className="simulation-weekday-options">
          {WEEKDAY_OPTIONS.map((option) => (
            <label className="simulation-weekday-option" key={option.value}>
              <input
                type="checkbox"
                name="simulation-weekdays"
                value={option.value}
                checked={form.weekdays.includes(option.value)}
                onChange={(event) => toggleWeekday(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="simulation-setup-section" aria-labelledby="simulation-volume-heading">
        <div className="simulation-setup-section__heading">
          <h2 id="simulation-volume-heading">Volume</h2>
          <p>Set the number of emails sent to each eligible recipient.</p>
        </div>

        <div className="campaign-form-field">
          <label htmlFor="simulation-email-count">Number of emails per recipient</label>
          <input
            id="simulation-email-count"
            name="simulation-email-count"
            type="number"
            min={1}
            step={1}
            value={form.emailCount}
            onChange={(event) => updateForm({ emailCount: event.target.value })}
          />
        </div>
      </section>
    </form>
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

        {loadState.status === 'loaded' &&
          (loadState.simulation.status === 'DRAFT' ? (
            <SimulationSetupForm key={loadState.simulation.id} simulation={loadState.simulation} />
          ) : (
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
          ))}
      </main>
    </AppLayout>
  );
}

export default PhishingSimulationSetupPage;
