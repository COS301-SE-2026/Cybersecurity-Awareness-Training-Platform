import { useState } from 'react';

import CampaignColourField from './CampaignColourField';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';

type CampaignBuilderProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  initialDraft: CampaignDraftFormState;
}>;

function CampaignBuilder({ contextKind, initialDraft }: CampaignBuilderProps) {
  const [draft, setDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));

  const hasScheduleError =
    Boolean(draft.startDate) && Boolean(draft.endDate) && draft.endDate <= draft.startDate;

  return (
    <section className="campaign-builder" aria-label="Campaign details">
      <div className="campaign-form-field">
        <label htmlFor="campaign-name">Campaign name</label>
        <input
          id="campaign-name"
          name="campaign-name"
          type="text"
          required
          maxLength={200}
          value={draft.name}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              name: event.target.value,
            }));
          }}
        />
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
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }));
          }}
        />
      </div>
      <CampaignColourField
        value={draft.accentColor}
        onChange={(accentColor) => {
          setDraft((current) => ({
            ...current,
            accentColor,
          }));
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
                  setDraft((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }));
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
                  setDraft((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }));
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
    </section>
  );
}

export default CampaignBuilder;
