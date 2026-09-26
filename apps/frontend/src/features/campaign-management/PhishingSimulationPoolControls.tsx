import { useEffect, useRef, useState } from 'react';
import type {
  EmbeddedEmailSnapshot,
  OrganisationEmailListResponse,
} from '@insightful-phish/shared';
import { useNavigate } from 'react-router-dom';

import { getOrganisationEmails } from '../../lib/campaignsApi';
import {
  addPhishingSimulationPoolEmail,
  getPhishingSimulationPool,
  removePhishingSimulationPoolEmail,
} from '../../services/phishing-simulation.service';
import { createEmptyOrganisationEmailDraft } from '../email-authoring/emailDraft';

const LIBRARY_PAGE_SIZE = 10;

type PoolMutation = { type: 'add' } | { type: 'remove'; poolEmailId: string } | null;

type PoolFeedback = {
  tone: 'success' | 'error';
  message: string;
} | null;

type SimulationPoolListProps = Readonly<{
  pool: EmbeddedEmailSnapshot[];
  disabled?: boolean;
  removingPoolEmailId?: string | null;
  onRemove?: (poolEmailId: string) => void;
}>;

type PhishingSimulationPoolControlsProps = Readonly<{
  organisationId: string;
  campaignId: string;
  simulationId: string;
  pool: EmbeddedEmailSnapshot[];
  emailCount: number | null;
  disabled: boolean;
  authoringDisabled: boolean;
  onPoolChanged: (pool: EmbeddedEmailSnapshot[]) => void;
  onMutationStateChange: (isMutating: boolean) => void;
  tryAcquireMutation: () => boolean;
  releaseMutation: () => void;
}>;

const CLASSIFICATION_LABELS: Record<EmbeddedEmailSnapshot['expectedClassification'], string> = {
  SAFE: 'Safe',
  SUSPICIOUS: 'Suspicious',
  PHISHING: 'Phishing',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return fallback;
}

function emailCountLabel(count: number): string {
  return count === 1 ? 'email' : 'emails';
}

function getReadinessMessage(poolSize: number, emailCount: number | null): string {
  if (emailCount === null) {
    return 'Set a valid number of emails per recipient.';
  }

  if (poolSize >= emailCount) {
    return 'Ready';
  }

  const required = emailCount - poolSize;
  return `${required} more ${emailCountLabel(required)} required`;
}

export function SimulationPoolList({
  pool,
  disabled = false,
  removingPoolEmailId = null,
  onRemove,
}: SimulationPoolListProps) {
  if (pool.length === 0) {
    return <p className="simulation-pool-empty">No emails are currently in this simulation.</p>;
  }

  return (
    <ul className="simulation-pool-list" aria-label="Simulation email pool">
      {pool.map((email) => {
        const classification = CLASSIFICATION_LABELS[email.expectedClassification];
        const isRemoving = removingPoolEmailId === email.id;

        return (
          <li className="simulation-pool-item" key={email.id}>
            <div className="simulation-pool-item__heading">
              <div>
                <strong>{email.subject.trim() || 'Untitled email'}</strong>
                <span
                  className={`simulation-pool-classification simulation-pool-classification--${email.expectedClassification.toLowerCase()}`}
                >
                  {classification}
                </span>
              </div>

              {onRemove && (
                <button
                  className="campaign-button campaign-button--secondary"
                  type="button"
                  disabled={disabled || removingPoolEmailId !== null}
                  onClick={() => onRemove(email.id)}
                >
                  {isRemoving ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>

            {email.redFlags.length > 0 ? (
              <div className="simulation-pool-red-flags">
                <span>Red flags</span>
                <ul>
                  {email.redFlags.map((redFlag, index) => (
                    <li key={`${email.id}-${redFlag.redFlagType}-${redFlag.label}-${index}`}>
                      <strong>{redFlag.label}</strong>
                      {redFlag.description && <span>{redFlag.description}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="simulation-pool-red-flags">No red flags recorded.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PhishingSimulationPoolControls({
  organisationId,
  campaignId,
  simulationId,
  pool,
  emailCount,
  disabled,
  authoringDisabled,
  onPoolChanged,
  onMutationStateChange,
  tryAcquireMutation,
  releaseMutation,
}: PhishingSimulationPoolControlsProps) {
  const navigate = useNavigate();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [libraryResult, setLibraryResult] = useState<OrganisationEmailListResponse | null>(null);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryReloadAttempt, setLibraryReloadAttempt] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mutation, setMutation] = useState<PoolMutation>(null);
  const [feedback, setFeedback] = useState<PoolFeedback>(null);
  const libraryRequestRef = useRef(0);

  const existingSourceIds = new Set(
    pool.flatMap((email) =>
      email.sourceOrganisationEmailId === null ? [] : [email.sourceOrganisationEmailId],
    ),
  );
  const selectedIdsToAdd = selectedIds.filter((emailId) => !existingSourceIds.has(emailId));
  const readinessMessage = getReadinessMessage(pool.length, emailCount);
  const isReady = emailCount !== null && pool.length >= emailCount;
  const isMutating = mutation !== null;
  const controlsDisabled = disabled || isMutating;

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const requestId = ++libraryRequestRef.current;
    const timeoutId = globalThis.setTimeout(() => {
      setIsLibraryLoading(true);
      setLibraryError(null);

      void getOrganisationEmails(organisationId, {
        page,
        limit: LIBRARY_PAGE_SIZE,
        search: submittedSearch || undefined,
        status: 'ACTIVE',
      })
        .then((response) => {
          if (requestId === libraryRequestRef.current) {
            setLibraryResult(response);
          }
        })
        .catch((error: unknown) => {
          if (requestId === libraryRequestRef.current) {
            setLibraryError(
              getErrorMessage(error, 'Active library emails could not be loaded. Try again.'),
            );
          }
        })
        .finally(() => {
          if (requestId === libraryRequestRef.current) {
            setIsLibraryLoading(false);
          }
        });
    }, 0);

    return () => {
      globalThis.clearTimeout(timeoutId);

      if (requestId === libraryRequestRef.current) {
        libraryRequestRef.current += 1;
      }
    };
  }, [isPickerOpen, libraryReloadAttempt, organisationId, page, submittedSearch]);

  async function refreshPool(): Promise<void> {
    const response = await getPhishingSimulationPool(organisationId, campaignId, simulationId);
    onPoolChanged(response.items);
  }

  function openEmailAuthoring() {
    if (controlsDisabled || authoringDisabled) {
      return;
    }

    const returnTo = `/organisations/${encodeURIComponent(
      organisationId,
    )}/campaigns/${encodeURIComponent(campaignId)}/phishing-simulations/${encodeURIComponent(
      simulationId,
    )}`;

    navigate(`/organisations/${encodeURIComponent(organisationId)}/content/email-library`, {
      state: {
        aiBuilderPrefill: {
          contentType: 'ORGANISATION_EMAIL',
          draft: createEmptyOrganisationEmailDraft(),
          returnTo,
        },
      },
    });
  }

  function togglePicker() {
    setFeedback(null);

    if (isPickerOpen) {
      libraryRequestRef.current += 1;
      setIsPickerOpen(false);
      setSelectedIds([]);
      return;
    }

    setPage(1);
    setIsPickerOpen(true);
  }

  function submitSearch() {
    setPage(1);
    setSubmittedSearch(searchInput.trim());
  }

  function toggleSelectedEmail(emailId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked && !current.includes(emailId)) {
        return [...current, emailId];
      }

      if (!checked) {
        return current.filter((candidate) => candidate !== emailId);
      }

      return current;
    });
  }

  async function handleAddSelected() {
    if (controlsDisabled || selectedIdsToAdd.length === 0 || !tryAcquireMutation()) {
      return;
    }

    setMutation({ type: 'add' });
    setFeedback(null);
    onMutationStateChange(true);

    let addedCount = 0;
    let failedCount = 0;
    let lastFailure: unknown = null;
    let refreshFailure: unknown = null;

    try {
      for (const organisationEmailId of selectedIdsToAdd) {
        try {
          await addPhishingSimulationPoolEmail(
            organisationId,
            campaignId,
            simulationId,
            organisationEmailId,
          );
          addedCount += 1;
        } catch (error: unknown) {
          failedCount += 1;
          lastFailure = error;
        }
      }

      try {
        await refreshPool();
      } catch (error: unknown) {
        refreshFailure = error;
      }

      const resultMessages: string[] = [];

      if (addedCount > 0) {
        resultMessages.push(`${addedCount} ${emailCountLabel(addedCount)} added.`);
      }

      if (failedCount > 0) {
        resultMessages.push(`${failedCount} ${emailCountLabel(failedCount)} could not be added.`);
      }

      if (lastFailure !== null) {
        resultMessages.push(
          getErrorMessage(lastFailure, 'One or more selected emails could not be added.'),
        );
      }

      if (refreshFailure !== null) {
        resultMessages.push(
          addedCount > 0
            ? 'Emails were added, but the pool could not be refreshed. Reload this page before trying to add them again.'
            : 'The pool could not be refreshed. Reload this page to see its current contents.',
        );
      }

      setFeedback({
        tone: failedCount > 0 || refreshFailure !== null ? 'error' : 'success',
        message: resultMessages.join(' '),
      });
    } finally {
      setSelectedIds([]);
      setMutation(null);
      onMutationStateChange(false);
      releaseMutation();
    }
  }

  async function handleRemove(poolEmailId: string) {
    if (controlsDisabled || !tryAcquireMutation()) {
      return;
    }

    setMutation({ type: 'remove', poolEmailId });
    setFeedback(null);
    onMutationStateChange(true);

    try {
      await removePhishingSimulationPoolEmail(
        organisationId,
        campaignId,
        simulationId,
        poolEmailId,
      );

      try {
        await refreshPool();
        setFeedback({
          tone: 'success',
          message: 'Email removed from the simulation pool.',
        });
      } catch (error: unknown) {
        setFeedback({
          tone: 'error',
          message: `The email was removed, but the pool could not be refreshed. ${getErrorMessage(
            error,
            'Reload this page to see its current contents.',
          )}`,
        });
      }
    } catch (error: unknown) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(
          error,
          'The email could not be removed from the simulation pool. Try again.',
        ),
      });
    } finally {
      setMutation(null);
      onMutationStateChange(false);
      releaseMutation();
    }
  }

  const removingPoolEmailId = mutation?.type === 'remove' ? mutation.poolEmailId : null;

  return (
    <div className="simulation-pool-controls" aria-busy={isMutating || isLibraryLoading}>
      <div className="simulation-pool-summary">
        <div>
          <strong>
            Pool: {pool.length} / {emailCount ?? 'Not set'}
          </strong>
          <span
            className={`simulation-pool-readiness ${
              isReady ? 'simulation-pool-readiness--ready' : 'simulation-pool-readiness--incomplete'
            }`}
          >
            {readinessMessage}
          </span>
        </div>

        <button
          className="campaign-button campaign-button--secondary"
          type="button"
          aria-expanded={isPickerOpen}
          aria-controls="simulation-pool-picker"
          disabled={controlsDisabled}
          onClick={togglePicker}
        >
          {isPickerOpen ? 'Close email library' : 'Add emails'}
        </button>
      </div>

      <p className="simulation-setup-helper">
        Emails are selected randomly when the simulation runs. This list does not represent sending
        order.
      </p>

      <SimulationPoolList
        pool={pool}
        disabled={controlsDisabled}
        removingPoolEmailId={removingPoolEmailId}
        onRemove={(poolEmailId) => void handleRemove(poolEmailId)}
      />

      {feedback && (
        <p
          className={`simulation-pool-state ${
            feedback.tone === 'error'
              ? 'simulation-pool-state--error'
              : 'simulation-pool-state--success'
          }`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}

      {isPickerOpen && (
        <section
          id="simulation-pool-picker"
          className="simulation-pool-picker"
          aria-labelledby="simulation-pool-picker-heading"
        >
          <div className="simulation-pool-picker__heading">
            <div>
              <h3 id="simulation-pool-picker-heading">Active Organisation Email Library</h3>
              <p>Select one or more active emails to copy into this simulation.</p>
              <button
                className="campaign-button campaign-button--secondary"
                type="button"
                disabled={controlsDisabled || authoringDisabled}
                onClick={openEmailAuthoring}
              >
                Create new email
              </button>
              {authoringDisabled && (
                <p>Save your simulation configuration changes before creating a new email.</p>
              )}
              {!authoringDisabled && (
                <p>Create, save, and activate the email before returning to select it.</p>
              )}
            </div>

            <div
              className="simulation-pool-picker__search"
              role="search"
              aria-label="Search active library emails"
            >
              <label htmlFor="simulation-pool-library-search">Search emails</label>
              <div>
                <input
                  id="simulation-pool-library-search"
                  type="search"
                  value={searchInput}
                  disabled={controlsDisabled}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button
                  className="campaign-button campaign-button--secondary"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={submitSearch}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {isLibraryLoading && (
            <p className="simulation-pool-state" aria-live="polite">
              Loading active library emails…
            </p>
          )}

          {!isLibraryLoading && libraryError && (
            <div className="simulation-pool-state simulation-pool-state--error" role="alert">
              <p>{libraryError}</p>
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => setLibraryReloadAttempt((current) => current + 1)}
              >
                Retry
              </button>
            </div>
          )}

          {!isLibraryLoading && !libraryError && libraryResult?.items.length === 0 && (
            <p className="simulation-pool-state">No active library emails match this search.</p>
          )}

          {!isLibraryLoading &&
            !libraryError &&
            libraryResult &&
            libraryResult.items.length > 0 && (
              <div className="simulation-pool-picker__items" aria-label="Active library emails">
                {libraryResult.items.map((email) => {
                  const isAlreadyAdded = existingSourceIds.has(email.id);
                  const isSelected = selectedIds.includes(email.id);
                  const itemDisabled = controlsDisabled || isAlreadyAdded;

                  return (
                    <label
                      className={`simulation-pool-picker-item ${
                        isAlreadyAdded ? 'simulation-pool-picker-item--disabled' : ''
                      }`}
                      key={email.id}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={itemDisabled}
                        onChange={(event) => toggleSelectedEmail(email.id, event.target.checked)}
                      />
                      <span>
                        <strong>{email.subject.trim() || 'Untitled email'}</strong>
                        <span>
                          {email.senderLabel || 'No sender label'} ·{' '}
                          {email.senderAddress || 'No sender address'}
                        </span>
                        <span>
                          {CLASSIFICATION_LABELS[email.expectedClassification]}
                          {isAlreadyAdded ? ' · Already added' : ''}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

          {!isLibraryLoading &&
            !libraryError &&
            libraryResult &&
            libraryResult.pagination.totalPages > 0 && (
              <nav className="simulation-pool-pagination" aria-label="Email library pagination">
                <button
                  className="campaign-button campaign-button--secondary"
                  type="button"
                  disabled={controlsDisabled || libraryResult.pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {libraryResult.pagination.page} of {libraryResult.pagination.totalPages}
                </span>
                <button
                  className="campaign-button campaign-button--secondary"
                  type="button"
                  disabled={
                    controlsDisabled ||
                    libraryResult.pagination.page >= libraryResult.pagination.totalPages
                  }
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </nav>
            )}

          <div className="simulation-pool-picker__actions">
            <span>
              {selectedIdsToAdd.length} {emailCountLabel(selectedIdsToAdd.length)} selected
            </span>
            <button
              className="campaign-button campaign-button--primary"
              type="button"
              disabled={controlsDisabled || selectedIdsToAdd.length === 0}
              onClick={() => void handleAddSelected()}
            >
              {mutation?.type === 'add'
                ? 'Adding…'
                : `Add selected ${emailCountLabel(selectedIdsToAdd.length)}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
