import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { CampaignCatalogueItemDto } from '@insightful-phish/shared';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../../context/auth-context';
import { createAuthContextValue } from '../../testing/render';
import AiCampaignProposalPanel from './AiCampaignProposalPanel';
import type { CampaignSelectionCatalogueState } from './campaignSelectionCatalogue';

const eligible: CampaignCatalogueItemDto = {
  id: 'eligible',
  type: 'TRAINING_DOCUMENT',
  title: 'Eligible training',
  description: 'Summary',
  contentType: 'MARKDOWN',
  estimatedReadTimeMinutes: 5,
  difficultyLevel: 'EASY',
  categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
  status: 'AVAILABLE',
  organisationId: 'org',
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={createAuthContextValue()}>
    <MemoryRouter>{children}</MemoryRouter>
  </AuthContext.Provider>
);

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(
    'ai-campaign-proposal:org:/',
    JSON.stringify({
      content: {
        name: 'Proposal',
        description: 'Description',
        rationale: 'Rationale',
        items: [
          {
            proposalKey: 'suggestion',
            suggestion: {
              contentType: 'TRAINING_DOCUMENT',
              difficultyLevel: 'EASY',
              title: 'Suggested training',
              learningObjective: 'Identify phishing',
            },
            draft: {},
          },
        ],
      },
      findings: [],
      semanticReviewStatus: 'COMPLETE',
    }),
  );
});

it('resolves Add from complete choices and disables a missing, mismatched, loading, or locked selection', () => {
  const onAddEligibleContent = vi.fn();
  const page = (catalogueState: CampaignSelectionCatalogueState, disabled = false) => (
    <AiCampaignProposalPanel
      organisationId="org"
      catalogueState={catalogueState}
      disabled={disabled}
      onAddEligibleContent={onAddEligibleContent}
      onOpenGeneratedDraft={vi.fn()}
    />
  );
  const { rerender } = render(page({ status: 'loaded', items: [eligible] }), { wrapper });
  const add = screen.getByRole('button', { name: 'Add eligible content' });
  expect(add).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Eligible content to add' }), {
    target: { value: eligible.id },
  });
  fireEvent.click(add);
  expect(onAddEligibleContent).toHaveBeenCalledWith(eligible);

  rerender(page({ status: 'loaded', items: [eligible] }, true));
  expect(add).toBeDisabled();
  rerender(page({ status: 'loading' }));
  expect(add).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Loading eligible');
  rerender(page({ status: 'loaded', items: [] }));
  expect(add).toBeDisabled();
  rerender(page({ status: 'loaded', items: [{ ...eligible, difficultyLevel: 'HARD' }] }));
  expect(add).toBeDisabled();
  rerender(page({ status: 'loaded', items: [eligible] }));
  expect(add).toBeEnabled();
  fireEvent.click(add);
  expect(onAddEligibleContent).toHaveBeenCalledTimes(2);
});

it('shows selection-load failure and retry instead of an empty eligible collection', () => {
  const onRetryCatalogue = vi.fn();
  render(
    <AiCampaignProposalPanel
      organisationId="org"
      catalogueState={{ status: 'error', message: 'Eligible content unavailable' }}
      onRetryCatalogue={onRetryCatalogue}
      onAddEligibleContent={vi.fn()}
      onOpenGeneratedDraft={vi.fn()}
    />,
    { wrapper },
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Eligible content unavailable');
  expect(screen.getByRole('button', { name: 'Add eligible content' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry eligible content' }));
  expect(onRetryCatalogue).toHaveBeenCalledOnce();
});
