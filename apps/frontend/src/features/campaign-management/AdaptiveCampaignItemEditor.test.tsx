import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdaptiveCampaignItemEditor from './AdaptiveCampaignItemEditor';

describe('AdaptiveCampaignItemEditor AI variant handoff', () => {
  it('uses a selected matching alternative as the bounded source concept', async () => {
    const onRequestAiVariant = vi.fn();
    render(
      <AdaptiveCampaignItemEditor
        catalogueState={{
          status: 'loaded',
          items: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              organisationId: '22222222-2222-4222-8222-222222222222',
              type: 'TRAINING_DOCUMENT',
              title: 'Easy phishing basics',
              description: 'How to recognise common phishing messages.',
              contentType: 'MARKDOWN',
              estimatedReadTimeMinutes: 5,
              categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
              difficultyLevel: 'EASY',
              status: 'AVAILABLE',
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            totalItems: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        onRequestAiVariant={onRequestAiVariant}
      />,
    );
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getAllByRole('combobox')[1],
      '11111111-1111-4111-8111-111111111111',
    );
    await user.click(screen.getByRole('button', { name: 'Generate Medium with AI' }));

    expect(onRequestAiVariant).toHaveBeenCalledWith(
      'TRAINING_DOCUMENT',
      'MEDIUM',
      ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
      {
        title: 'Easy phishing basics',
        summary: 'How to recognise common phishing messages.',
      },
    );
  });
});
