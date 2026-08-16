import { useId, useState, type FormEvent } from 'react';

import CampaignColourField from './CampaignColourField';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';

type CampaignBuilderProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  initialDraft: CampaignDraftFormState;
  onDirtyChange?: (isDirty: boolean) => void;
  onRequestDiscard?: () => void;
  onSave?: (draft: CampaignDraftFormState) => void | Promise<void>;
  saveButtonText?: string;
}>;

function areDraftsEqual(left: CampaignDraftFormState, right: CampaignDraftFormState): boolean {
  return (
    left.name === right.name &&
    left.description === right.description &&
    left.accentColor === right.accentColor &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate
  );
}

function CampaignBuilder({
  contextKind,
  initialDraft,
  onDirtyChange,
  onRequestDiscard,
  onSave,
  saveButtonText = 'Save Draft',
}: CampaignBuilderProps) {
  const nameInputId = useId();
  const nameErrorId = `${nameInputId}-error`;
  const [persistedDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));
  const [draft, setDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const hasScheduleError =
    Boolean(draft.startDate) && Boolean(draft.endDate) && draft.endDate <= draft.startDate;

  const isDirty = !areDraftsEqual(persistedDraft, draft);
  const hasNameError = hasSubmitted && draft.name.trim().length === 0;

  function updateDraft(patch: Partial<CampaignDraftFormState>) {
    const nextDraft: CampaignDraftFormState = {
      ...draft,
      ...patch,
    };

    setDraft(nextDraft);
    onDirtyChange?.(!areDraftsEqual(persistedDraft, nextDraft));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    if (!draft.name.trim() || hasScheduleError) {
      return;
    }

    void onSave?.(draft);
  }

  return (
    <form
      className="campaign-builder"
      aria-label="Campaign details"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="campaign-form-field">
        <label htmlFor={nameInputId}>Campaign name</label>
        <input
          id={nameInputId}
          name="campaign-name"
          type="text"
          required
          maxLength={200}
          value={draft.name}
          aria-invalid={hasNameError}
          aria-describedby={hasNameError ? nameErrorId : undefined}
          onChange={(event) => {
            updateDraft({
              name: event.target.value,
            });
          }}
        />

        {hasNameError && (
          <p id={nameErrorId} className="campaign-form-error" role="alert">
            Please enter a Campaign name.
          </p>
        )}
      </div>

      <div className="campaign-form-field">
        <label htmlFor="campaign-description">Description</label>
        <textarea
          id="campaign-description"
          name="campaign-description"
          maxLength={2000}
          rows={6}
          value={draft.description}
          onChange={(event) => {
            updateDraft({
              description: event.target.value,
            });
          }}
        />
      </div>
      <CampaignColourField
        value={draft.accentColor}
        onChange={(accentColor) => {
          updateDraft({ accentColor });
        }}
      />

      {contextKind === 'organisation' && (
        <fieldset className="campaign-schedule">
          <legend>Organisation schedule</legend>

          <div className="campaign-schedule__fields">
            <div className="campaign-form-field">
              <label htmlFor="campaign-start-date">Start date and time</label>
              <input
                id="campaign-start-date"
                name="campaign-start-date"
                type="datetime-local"
                value={draft.startDate}
                onChange={(event) => {
                  updateDraft({
                    startDate: event.target.value,
                  });
                }}
              />
            </div>

            <div className="campaign-form-field">
              <label htmlFor="campaign-end-date">End date and time</label>
              <input
                id="campaign-end-date"
                name="campaign-end-date"
                type="datetime-local"
                value={draft.endDate}
                aria-invalid={hasScheduleError}
                aria-describedby={hasScheduleError ? 'campaign-end-date-error' : undefined}
                onChange={(event) => {
                  updateDraft({
                    endDate: event.target.value,
                  });
                }}
              />

              {hasScheduleError && (
                <p id="campaign-end-date-error" className="campaign-form-error" role="alert">
                  End date and time must be after the start date and time.
                </p>
              )}
            </div>
          </div>
        </fieldset>
      )}
      <div className="campaign-builder__actions">
        <button
          type="button"
          className="campaign-builder__discard"
          disabled={!isDirty}
          onClick={() => {
            onRequestDiscard?.();
          }}
        >
          Discard
        </button>

        {onSave && (
          <button type="submit" className="campaign-button campaign-button--primary">
            {saveButtonText}
          </button>
        )}
      </div>
    </form>
  );
}

export default CampaignBuilder;
