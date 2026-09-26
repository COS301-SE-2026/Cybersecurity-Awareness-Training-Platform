import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  CampaignDetailResponseDto,
  EmailProviderProfileSummaryDto,
  PhishingSimulationDetailResponseDto,
  PhishingSimulationResponseDto,
  UpdatePhishingSimulationDraftRequestDto,
  WeekdayDto,
} from '@insightful-phish/shared';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import AppLayout from '../../components/layout/AppLayout';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../lib/apiClient';
import { getOrganisationCampaignDetail } from '../../lib/campaignsApi';
import { listEmailProviderProfiles } from '../../services/email-provider-profile.service';
import {
  createPhishingSimulationDraft,
  getPhishingSimulation,
  launchPhishingSimulation,
  listPhishingSimulations,
  updatePhishingSimulationDraft,
} from '../../services/phishing-simulation.service';
import { fromDateTimeLocal, toDateTimeLocal } from './campaignDraftDate';
import './campaign-management.css';
import BasicAlert from '../../components/alerts/BasicAlert';
import BackNavigation from '../../components/BackNavigation';

type SimulationLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded';
      simulation: PhishingSimulationDetailResponseDto;
      campaign: CampaignDetailResponseDto;
    };

type ProviderLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; providers: EmailProviderProfileSummaryDto[] };

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
  simulation: PhishingSimulationResponseDto,
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

function toSimulationDraftUpdate(
  form: SimulationSetupFormState,
): UpdatePhishingSimulationDraftRequestDto {
  const emailCount = form.emailCount === '' ? null : Number(form.emailCount);

  if (emailCount !== null && !Number.isFinite(emailCount)) {
    throw new Error('Emails per recipient must be a valid number.');
  }

  return {
    name: form.name.trim() === '' ? null : form.name,
    startAt: fromDateTimeLocal(form.startAt),
    endAt: fromDateTimeLocal(form.endAt),
    sendFrom: form.sendFrom === '' ? null : form.sendFrom,
    sendUntil: form.sendUntil === '' ? null : form.sendUntil,
    weekdays: [...form.weekdays],
    emailCount,
    providerProfileIds: [...form.providerProfileIds],
  };
}

function getSimulationSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return getErrorMessage(error, 'The simulation setup could not be saved. Try again.');
  }

  const body =
    error.body && typeof error.body === 'object'
      ? (error.body as {
          error?: unknown;
          details?: Array<{ message?: unknown }>;
        })
      : null;
  const errorCode = typeof body?.error === 'string' ? body.error : null;

  if (errorCode === 'VALIDATION_ERROR') {
    const validationMessage = body?.details?.find(
      (detail) => typeof detail.message === 'string' && detail.message.trim() !== '',
    )?.message;

    return typeof validationMessage === 'string' ? validationMessage : error.message;
  }

  if (errorCode === 'CAMPAIGN_NOT_ELIGIBLE') {
    return 'This Campaign no longer allows its simulation Draft to be edited.';
  }

  if (errorCode === 'LIFECYCLE_CONFLICT') {
    return 'This simulation is no longer an editable Draft. Reload to view its current state.';
  }

  if (errorCode === 'PHISHING_SIMULATION_NOT_FOUND') {
    return 'This phishing simulation could not be found.';
  }

  return error.message || 'The simulation setup could not be saved. Try again.';
}

function getSimulationLaunchErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return getErrorMessage(error, 'The phishing simulation could not be launched. Try again.');
  }

  const body =
    error.body && typeof error.body === 'object'
      ? (error.body as {
          error?: unknown;
          details?: Array<{ message?: unknown }>;
        })
      : null;
  const errorCode = typeof body?.error === 'string' ? body.error : null;

  if (errorCode === 'VALIDATION_ERROR') {
    const validationMessage = body?.details?.find(
      (detail) => typeof detail.message === 'string' && detail.message.trim() !== '',
    )?.message;

    return typeof validationMessage === 'string' ? validationMessage : error.message;
  }

  const messages: Record<string, string> = {
    CAMPAIGN_NOT_ELIGIBLE:
      'The Campaign is no longer active. Activate it before launching this simulation.',
    LIFECYCLE_CONFLICT:
      'This simulation is no longer an editable Draft. Reload to view its current state.',
    NO_ELIGIBLE_RECIPIENTS:
      'The Campaign does not have any eligible verified recipients for this simulation.',
    PHISHING_SIMULATION_INCOMPLETE:
      'Complete this simulation configuration and save it before launching.',
    PHISHING_SIMULATION_POOL_TOO_SMALL:
      'The email pool must contain at least the configured number of emails per recipient.',
    EMAIL_PROVIDER_PROFILE_NOT_PERMITTED:
      'One or more selected email providers are no longer permitted. Update and save the provider selection.',
    PHISHING_SIMULATION_SCHEDULE_INVALID:
      'The simulation schedule must contain a valid future sending window within the Campaign dates.',
    PHISHING_SIMULATION_NOT_FOUND: 'This phishing simulation could not be found.',
    CAMPAIGN_NOT_FOUND: 'The Campaign could not be found.',
  };

  return errorCode
    ? (messages[errorCode] ?? error.message)
    : error.message || 'The phishing simulation could not be launched. Try again.';
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

  if (existingRequest !== undefined) {
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
        <BackNavigation
          to={`/organisations/${encodeURIComponent(organisationId)}/campaigns/${encodeURIComponent(campaignId)}`}
          label="Back to Campaign"
        />

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

function formatSimulationDateTime(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCampaignReadOnlyMessage(status: CampaignDetailResponseDto['status']): string {
  return `This simulation cannot be edited while the Campaign is ${status.toLowerCase()}.`;
}

function SimulationReadOnlySummary({
  simulation,
  campaignStatus,
}: Readonly<{
  simulation: PhishingSimulationDetailResponseDto;
  campaignStatus: CampaignDetailResponseDto['status'];
}>) {
  const isIneligibleDraft = simulation.status === 'DRAFT';
  const weekdayLabels = simulation.weekdays.map(
    (weekday) => WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? weekday,
  );

  return (
    <section className="simulation-read-only" aria-labelledby="simulation-read-only-heading">
      <header className="simulation-read-only__heading">
        <div>
          <h2 id="simulation-read-only-heading">
            {simulation.name?.trim() || 'Phishing simulation'}
          </h2>
          <p>
            {isIneligibleDraft
              ? getCampaignReadOnlyMessage(campaignStatus)
              : 'This simulation configuration is frozen and can no longer be edited.'}
          </p>
        </div>
        <span className="simulation-read-only__status">{STATUS_LABELS[simulation.status]}</span>
      </header>

      <dl className="campaign-review__metadata simulation-read-only__metadata">
        <div>
          <dt>Start</dt>
          <dd>
            {simulation.startAt ? (
              <time dateTime={simulation.startAt}>
                {formatSimulationDateTime(simulation.startAt)}
              </time>
            ) : (
              'Not set'
            )}
          </dd>
        </div>
        <div>
          <dt>End</dt>
          <dd>
            {simulation.endAt ? (
              <time dateTime={simulation.endAt}>{formatSimulationDateTime(simulation.endAt)}</time>
            ) : (
              'Not set'
            )}
          </dd>
        </div>
        <div>
          <dt>Daily send window</dt>
          <dd>
            {simulation.sendFrom ?? 'Not set'} – {simulation.sendUntil ?? 'Not set'}
          </dd>
        </div>
        <div>
          <dt>Sending weekdays</dt>
          <dd>{weekdayLabels.length > 0 ? weekdayLabels.join(', ') : 'Not set'}</dd>
        </div>
        <div>
          <dt>Emails per recipient</dt>
          <dd>{simulation.emailCount ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Selected providers</dt>
          <dd>
            {simulation.providerProfileIds.length}{' '}
            {simulation.providerProfileIds.length === 1 ? 'provider' : 'providers'}
          </dd>
        </div>
        <div>
          <dt>Email pool</dt>
          <dd>
            {simulation.pool.length} {simulation.pool.length === 1 ? 'email' : 'emails'}
          </dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{simulation.timezone}</dd>
        </div>
      </dl>

      <p className="simulation-setup-helper">
        Start and end are shown in your browser's local timezone. Daily sending times use{' '}
        {simulation.timezone}.
      </p>
    </section>
  );
}

function SimulationSetupForm({
  simulation,
  canLaunch,
  onSaved,
  onLaunched,
}: Readonly<{
  simulation: PhishingSimulationDetailResponseDto;
  canLaunch: boolean;
  onSaved: (simulation: PhishingSimulationResponseDto) => void;
  onLaunched: (simulation: PhishingSimulationResponseDto) => void;
}>) {
  const { token } = useAuth();
  const [form, setForm] = useState<SimulationSetupFormState>(() =>
    toSimulationSetupFormState(simulation),
  );
  const [providerLoadState, setProviderLoadState] = useState<ProviderLoadState>({
    status: 'loading',
  });
  const [providerRetryAttempt, setProviderRetryAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [showLaunchConfirmation, setShowLaunchConfirmation] = useState(false);
  const mutationRef = useRef<'save' | 'launch' | null>(null);
  const isBusy = isSaving || isLaunching;

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCurrent = true;

    void listEmailProviderProfiles(simulation.organisationId, token)
      .then(({ items }) => {
        if (isCurrent) {
          setProviderLoadState({ status: 'loaded', providers: items });
        }
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setProviderLoadState({
            status: 'error',
            message: getErrorMessage(cause, 'Email providers could not be loaded. Try again.'),
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [providerRetryAttempt, simulation.organisationId, token]);

  function markEdited() {
    setIsDirty(true);
    setSaveError(null);
    setSaveSuccess(null);
    setLaunchError(null);
  }

  function updateForm(updates: Partial<SimulationSetupFormState>) {
    markEdited();
    setForm((current) => ({
      ...current,
      ...updates,
    }));
  }

  function toggleWeekday(weekday: WeekdayDto, checked: boolean) {
    markEdited();
    setForm((current) => ({
      ...current,
      weekdays: checked
        ? [...current.weekdays, weekday]
        : current.weekdays.filter((candidate) => candidate !== weekday),
    }));
  }

  function toggleProvider(providerId: string, checked: boolean) {
    markEdited();
    setForm((current) => {
      let providerProfileIds = current.providerProfileIds;

      if (checked && !providerProfileIds.includes(providerId)) {
        providerProfileIds = [...providerProfileIds, providerId];
      } else if (!checked) {
        providerProfileIds = providerProfileIds.filter((candidate) => candidate !== providerId);
      }

      return {
        ...current,
        providerProfileIds,
      };
    });
  }

  const visibleProviders =
    providerLoadState.status === 'loaded'
      ? providerLoadState.providers.filter(
          (provider) =>
            provider.status === 'ACTIVE' || form.providerProfileIds.includes(provider.id),
        )
      : [];
  const hasActiveProviders =
    providerLoadState.status === 'loaded' &&
    providerLoadState.providers.some((provider) => provider.status === 'ACTIVE');
  let poolDescription = 'No emails are currently included in this simulation.';

  if (simulation.pool.length > 0) {
    const emailCountLabel = simulation.pool.length === 1 ? 'email is' : 'emails are';
    poolDescription = `${simulation.pool.length} ${emailCountLabel} currently included in this simulation.`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mutationRef.current) {
      return;
    }

    mutationRef.current = 'save';
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    setLaunchError(null);

    try {
      const input = toSimulationDraftUpdate(form);
      const savedSimulation = await updatePhishingSimulationDraft(
        simulation.organisationId,
        simulation.campaignId,
        simulation.id,
        input,
      );

      setForm(toSimulationSetupFormState(savedSimulation));
      setIsDirty(false);
      onSaved(savedSimulation);
      setSaveSuccess('Simulation setup saved.');
    } catch (error: unknown) {
      setSaveError(getSimulationSaveErrorMessage(error));
    } finally {
      mutationRef.current = null;
      setIsSaving(false);
    }
  }

  function openLaunchConfirmation() {
    if (!canLaunch || isDirty || mutationRef.current) {
      return;
    }

    setLaunchError(null);
    setShowLaunchConfirmation(true);
  }

  async function handleLaunch() {
    if (!canLaunch || isDirty || mutationRef.current) {
      return;
    }

    mutationRef.current = 'launch';
    setIsLaunching(true);
    setLaunchError(null);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const launchedSimulation = await launchPhishingSimulation(
        simulation.organisationId,
        simulation.campaignId,
        simulation.id,
      );

      setShowLaunchConfirmation(false);
      onLaunched(launchedSimulation);
    } catch (error: unknown) {
      setLaunchError(getSimulationLaunchErrorMessage(error));
    } finally {
      mutationRef.current = null;
      setIsLaunching(false);
    }
  }

  return (
    <form
      className="simulation-setup-form"
      aria-label="Phishing simulation setup fields"
      aria-busy={isBusy}
      onSubmit={(event) => handleSubmit(event)}
    >
      {saveError !== null ? (
        <BasicAlert variant="danger" onClose={() => setSaveError(null)}>
          {saveError}
        </BasicAlert>
      ) : null}
      {saveSuccess !== null ? (
        <BasicAlert variant="success" onClose={() => setSaveSuccess(null)}>
          {saveSuccess}
        </BasicAlert>
      ) : null}
      {launchError !== null && showLaunchConfirmation === false ? (
        <BasicAlert variant="danger" onClose={() => setLaunchError(null)}>
          {launchError}
        </BasicAlert>
      ) : null}
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
            disabled={isBusy}
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
            Start and end date are shown in your browser's local timezone.
          </p>
        </div>

        <div className="simulation-setup-grid">
          <div className="campaign-form-field">
            <label htmlFor="simulation-start-at">Start date and time</label>
            <input
              id="simulation-start-at"
              name="simulation-start-at"
              disabled={isBusy}
              type="datetime-local"
              value={form.startAt}
              aria-describedby="simulation-timezone-helper"
              onChange={(event) => updateForm({ startAt: event.target.value })}
            />
          </div>

          <div className="campaign-form-field">
            <label htmlFor="simulation-end-at">End date and time</label>
            <input
              id="simulation-end-at"
              name="simulation-end-at"
              disabled={isBusy}
              type="datetime-local"
              value={form.endAt}
              aria-describedby="simulation-timezone-helper"
              onChange={(event) => updateForm({ endAt: event.target.value })}
            />
          </div>
        </div>
      </section>

      <fieldset
        className="simulation-setup-section simulation-setup-weekdays"
        aria-labelledby="simulation-weekdays-heading"
      >
        <div className="simulation-setup-section__heading">
          <h2 id="simulation-weekdays-heading">Sending weekdays</h2>
          <p id="simulation-send-window-helper" className="simulation-setup-helper">
            Choose the weekdays on which simulation emails may be sent. Daily sending times use{' '}
            {simulation.timezone}.
          </p>
        </div>

        <div className="simulation-weekday-options">
          {WEEKDAY_OPTIONS.map((option) => (
            <label className="simulation-weekday-option" key={option.value}>
              <input
                type="checkbox"
                name="simulation-weekdays"
                value={option.value}
                checked={form.weekdays.includes(option.value)}
                disabled={isBusy}
                onChange={(event) => toggleWeekday(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <div className="simulation-setup-grid">
          <div className="campaign-form-field">
            <label htmlFor="simulation-send-from">Send from</label>
            <input
              id="simulation-send-from"
              name="simulation-send-from"
              disabled={isBusy}
              type="time"
              value={form.sendFrom}
              aria-describedby="simulation-send-window-helper"
              onChange={(event) => updateForm({ sendFrom: event.target.value })}
            />
          </div>

          <div className="campaign-form-field">
            <label htmlFor="simulation-send-until">Send until</label>
            <input
              id="simulation-send-until"
              name="simulation-send-until"
              disabled={isBusy}
              type="time"
              value={form.sendUntil}
              aria-describedby="simulation-timezone-helper"
              onChange={(event) => updateForm({ sendUntil: event.target.value })}
            />
          </div>
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
            disabled={isBusy}
            type="number"
            min={1}
            step={1}
            value={form.emailCount}
            onChange={(event) => updateForm({ emailCount: event.target.value })}
          />
        </div>
      </section>

      <fieldset
        className="simulation-setup-section simulation-setup-providers"
        aria-labelledby="simulation-providers-heading"
      >
        <div className="simulation-setup-section__heading">
          <h2 id="simulation-providers-heading">Permitted email providers</h2>
          <p>Select the active providers that may send emails for this simulation.</p>
          <Link
            className="simulation-setup-settings-link"
            to="/organisation-information?tab=smtp-details"
          >
            Manage provider settings
          </Link>
        </div>

        {!token && (
          <div
            className="simulation-provider-message simulation-provider-message--error"
            role="alert"
          >
            Your session is unavailable. Email providers cannot be loaded.
          </div>
        )}

        {token && providerLoadState.status === 'loading' && (
          <p className="simulation-provider-message" aria-live="polite">
            Loading email providers…
          </p>
        )}

        {token && providerLoadState.status === 'error' && (
          <div
            className="simulation-provider-message simulation-provider-message--error"
            role="alert"
          >
            <p>{providerLoadState.message}</p>
            <button
              type="button"
              onClick={() => {
                setProviderLoadState({ status: 'loading' });
                setProviderRetryAttempt((current) => current + 1);
              }}
            >
              Retry
            </button>
          </div>
        )}

        {providerLoadState.status === 'loaded' && (
          <>
            {!hasActiveProviders && (
              <p className="simulation-provider-message">
                No active email providers are available. Configure an email provider before
                launching this simulation.
              </p>
            )}

            {visibleProviders.length > 0 && (
              <div className="simulation-provider-options">
                {visibleProviders.map((provider) => {
                  const isAvailable = provider.status === 'ACTIVE';

                  return (
                    <label
                      className={`simulation-provider-option${
                        isAvailable ? '' : ' simulation-provider-option--disabled'
                      }`}
                      key={provider.id}
                    >
                      <input
                        type="checkbox"
                        name="simulation-provider-profiles"
                        value={provider.id}
                        checked={form.providerProfileIds.includes(provider.id)}
                        disabled={isBusy || !isAvailable}
                        onChange={(event) => toggleProvider(provider.id, event.target.checked)}
                      />
                      <span>
                        <strong>{provider.displayName}</strong>
                        <span>{provider.fromAddress}</span>
                        {!isAvailable && <span>Unavailable</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
      </fieldset>

      <section className="simulation-setup-section" aria-labelledby="simulation-pool-heading">
        <div className="simulation-setup-section__heading">
          <h2 id="simulation-pool-heading">Email pool</h2>
          <p>{poolDescription}</p>
        </div>
        <p className="simulation-setup-helper">
          {simulation.pool.length === 0
            ? 'Emails must be added before the simulation can be launched. Email pool management will be available here.'
            : 'Email pool management will be available here.'}
        </p>
      </section>

      <div className="simulation-save-actions">
        <button
          className="campaign-button campaign-button--primary"
          type="submit"
          disabled={isBusy}
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <section className="simulation-launch" aria-labelledby="simulation-launch-heading">
        <div>
          <h2 id="simulation-launch-heading">Launch simulation</h2>
          {canLaunch ? (
            <p>
              {isDirty
                ? 'Save your changes before launching.'
                : 'Launching schedules this simulation and freezes its configuration.'}
            </p>
          ) : (
            <p>The Campaign must be active before this simulation can be launched.</p>
          )}
        </div>

        {canLaunch && (
          <button
            className="campaign-button simulation-launch__button"
            type="button"
            disabled={isBusy || isDirty}
            onClick={openLaunchConfirmation}
          >
            {isLaunching ? 'Launching…' : 'Launch simulation'}
          </button>
        )}
      </section>

      {showLaunchConfirmation && (
        <BasicConfirmationModal
          title="Launch phishing simulation"
          message="Launching schedules this simulation and freezes its configuration. You will no longer be able to edit these settings."
          confirmButtonText="Launch simulation"
          confirmButtonVariant="default"
          isConfirming={isLaunching}
          isConfirmDisabled={isBusy || isDirty || !canLaunch}
          isDismissDisabled={isLaunching}
          errorMessage={launchError}
          onCancel={() => {
            if (!isLaunching) {
              setShowLaunchConfirmation(false);
            }
          }}
          onConfirm={() => void handleLaunch()}
        />
      )}
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

    void Promise.all([
      getPhishingSimulation(organisationId, campaignId, simulationId),
      getOrganisationCampaignDetail(organisationId, campaignId),
    ])
      .then(([simulation, campaign]) => {
        if (isCurrent) {
          setLoadState({ status: 'loaded', simulation, campaign });
        }
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setLoadState({
            status: 'error',
            message: getErrorMessage(
              cause,
              'The phishing simulation and Campaign could not be loaded. Try again.',
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

  const loadedRouteMatches =
    loadState.status === 'loaded' &&
    loadState.simulation.organisationId === organisationId &&
    loadState.simulation.campaignId === campaignId &&
    loadState.simulation.id === simulationId;
  const isLoadingCurrentRoute =
    loadState.status === 'loading' || (loadState.status === 'loaded' && !loadedRouteMatches);

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <main className="campaign-detail-shell" aria-busy={isLoadingCurrentRoute}>
        <BackNavigation to={campaignPath} label="Back to Campaign" />

        <header className="campaign-page__header">
          <div>
            <h1 className="campaign-page__title">Phishing Simulation Setup</h1>
            <p className="campaign-page__helper">
              Configure the phishing simulation for this Campaign.
            </p>
          </div>
        </header>

        {isLoadingCurrentRoute && (
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
          loadedRouteMatches &&
          (loadState.simulation.status === 'DRAFT' &&
          (loadState.campaign.status === 'DRAFT' || loadState.campaign.status === 'ACTIVE') ? (
            <SimulationSetupForm
              key={loadState.simulation.id}
              simulation={loadState.simulation}
              canLaunch={loadState.campaign.status === 'ACTIVE'}
              onSaved={(savedSimulation) => {
                setLoadState((current) =>
                  current.status === 'loaded' && current.simulation.id === savedSimulation.id
                    ? {
                        ...current,
                        simulation: {
                          ...current.simulation,
                          ...savedSimulation,
                        },
                      }
                    : current,
                );
              }}
              onLaunched={(launchedSimulation) => {
                setLoadState((current) =>
                  current.status === 'loaded' && current.simulation.id === launchedSimulation.id
                    ? {
                        ...current,
                        simulation: {
                          ...current.simulation,
                          ...launchedSimulation,
                        },
                      }
                    : current,
                );
              }}
            />
          ) : (
            <SimulationReadOnlySummary
              simulation={loadState.simulation}
              campaignStatus={loadState.campaign.status}
            />
          ))}
      </main>
    </AppLayout>
  );
}

export default PhishingSimulationSetupPage;
