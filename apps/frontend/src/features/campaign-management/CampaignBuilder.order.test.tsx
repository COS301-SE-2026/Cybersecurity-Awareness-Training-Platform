import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import CampaignBuilder from './CampaignBuilder';

it('reorders and removes the latest Draft items before saving', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onDirtyChange = vi.fn();

  render(
    <CampaignBuilder
      contextKind="platform"
      initialDraft={{
        name: 'Ordered Campaign',
        description: '',
        accentColor: '#8400FF',
        startDate: '',
        endDate: '',
        items: [
          {
            itemType: 'COMPONENT',
            campaignItemId: 'item-document',
            componentType: 'TRAINING_DOCUMENT',
            contentId: 'document-one',
            title: 'Password guide',
            description: null,
            isRequired: true,
            sourceAvailable: true,
          },
          {
            itemType: 'COMPONENT',
            campaignItemId: 'item-quiz',
            componentType: 'QUIZ',
            contentId: 'quiz-one',
            title: 'Password quiz',
            description: null,
            isRequired: true,
            sourceAvailable: true,
          },
          {
            itemType: 'COMPONENT',
            campaignItemId: 'item-simulation',
            componentType: 'SIMULATED_INBOX',
            contentId: 'simulation-one',
            title: 'Inbox simulation',
            description: null,
            isRequired: true,
            sourceAvailable: true,
          },
        ],
      }}
      onDirtyChange={onDirtyChange}
      onSave={onSave}
    />,
  );

  const order = screen.getByRole('region', { name: 'Campaign Order' });

  await user.click(screen.getByRole('button', { name: 'Move Inbox simulation up' }));

  expect(
    within(order)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent),
  ).toEqual(['Password guide', 'Inbox simulation', 'Password quiz']);

  await user.click(screen.getByRole('button', { name: 'Remove Password guide from Campaign' }));

  expect(
    within(order)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent),
  ).toEqual(['Inbox simulation', 'Password quiz']);

  expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeEnabled();

  await user.click(screen.getByRole('button', { name: 'Save Draft' }));

  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          campaignItemId: 'item-simulation',
          componentType: 'SIMULATED_INBOX',
        }),
        expect.objectContaining({
          campaignItemId: 'item-quiz',
          componentType: 'QUIZ',
        }),
      ],
    }),
  );
});
