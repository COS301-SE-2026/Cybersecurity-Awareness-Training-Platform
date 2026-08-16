import { useState } from 'react';

import type { CampaignDraftFormState } from './campaignManagement.types';

type CampaignBuilderProps = Readonly<{ initialDraft: CampaignDraftFormState }>;

function CampaignBuilder({ initialDraft }: CampaignBuilderProps) {
  const [draft, setDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));

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
    </section>
  );
}

export default CampaignBuilder;
