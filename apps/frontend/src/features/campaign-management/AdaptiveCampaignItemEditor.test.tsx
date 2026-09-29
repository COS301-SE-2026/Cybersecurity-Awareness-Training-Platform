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

  it('retains off-page alternative metadata for the variant source concept', async () => {
    const onRequestAiVariant = vi.fn();
    const props = {
      initialItem: {
        itemType: 'ADAPTIVE' as const,
        campaignItemId: 'adaptive-item',
        componentType: 'TRAINING_DOCUMENT' as const,
        alternatives: {
          EASY: {
            contentId: '11111111-1111-4111-8111-111111111111',
            title: 'Authoritative phishing basics',
            summary: 'The real persisted content summary.',
            categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
          },
          MEDIUM: {
            contentId: '22222222-2222-4222-8222-222222222222',
            title: 'Authoritative phishing practice',
            summary: 'Practice identifying suspicious messages.',
            categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
          },
          HARD: {
            contentId: '33333333-3333-4333-8333-333333333333',
            title: 'Authoritative phishing analysis',
            summary: 'Analyse sophisticated phishing attempts.',
            categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
          },
        },
        title: 'Adaptive phishing documents',
        description: null,
        isRequired: true,
        sourceAvailable: true,
      },
      onCancel: vi.fn(),
      onSubmit: vi.fn(),
      onRequestAiVariant,
    };
    const firstPage = {
      status: 'loaded' as const,
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 20,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };
    const { rerender } = render(
      <AdaptiveCampaignItemEditor catalogueState={firstPage} {...props} />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('option', { name: 'Authoritative phishing basics' })).toBeVisible();
    await user.selectOptions(screen.getAllByRole('combobox')[2], '');

    rerender(
      <AdaptiveCampaignItemEditor
        catalogueState={{
          ...firstPage,
          pagination: {
            ...firstPage.pagination,
            page: 2,
            hasNextPage: false,
            hasPreviousPage: true,
          },
        }}
        {...props}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Generate Medium with AI' }));

    expect(onRequestAiVariant).toHaveBeenCalledWith(
      'TRAINING_DOCUMENT',
      'MEDIUM',
      ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
      {
        title: 'Authoritative phishing basics',
        summary: 'The real persisted content summary.',
      },
    );
    expect(onRequestAiVariant).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ title: '11111111-1111-4111-8111-111111111111' }),
    );
  });
});
