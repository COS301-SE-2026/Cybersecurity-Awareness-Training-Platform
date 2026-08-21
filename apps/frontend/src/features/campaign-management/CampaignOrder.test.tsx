import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import CampaignOrder from './CampaignOrder';
import userEvent from '@testing-library/user-event';

it('displays components and preserves existing groups as opaque order entries', () => {
  const onMoveItem = vi.fn();
  const onRemoveItem = vi.fn();

  render(
    <CampaignOrder
      items={[
        {
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          contentId: 'quiz-one',
          title: 'Password quiz',
          description: null,
          isRequired: true,
          sourceAvailable: true,
        },
        {
          itemType: 'GROUP',
          campaignItemId: 'group-one',
          title: 'Existing module',
          description: 'Authoritative grouped content',
          groupType: 'MODULE',
          completionRule: 'COMPLETE_REQUIRED_ONLY',
          isRequired: true,
          children: [
            {
              itemType: 'COMPONENT',
              campaignItemId: 'child-one',
              componentType: 'TRAINING_DOCUMENT',
              contentId: 'document-one',
              title: 'Document one',
              description: null,
              isRequired: true,
              sourceAvailable: true,
            },
            {
              itemType: 'COMPONENT',
              campaignItemId: 'child-two',
              componentType: 'QUIZ',
              contentId: 'quiz-two',
              title: 'Quiz two',
              description: null,
              isRequired: true,
              sourceAvailable: true,
            },
          ],
        },
      ]}
      onMoveItem={onMoveItem}
      onRemoveItem={onRemoveItem}
    />,
  );

  const order = screen.getByRole('region', { name: 'Campaign Order' });

  expect(within(order).getByRole('heading', { name: 'Password quiz' })).toBeInTheDocument();
  expect(within(order).getByRole('heading', { name: 'Existing module' })).toBeInTheDocument();
  expect(within(order).getByText('2 grouped items')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Move Password quiz up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Password quiz down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Existing module down' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Remove Existing module from Campaign' }),
  ).toBeEnabled();
});

it('requests movement and removal using top-level indexes', async () => {
  const user = userEvent.setup();
  const onMoveItem = vi.fn();
  const onRemoveItem = vi.fn();

  render(
    <CampaignOrder
      items={[
        {
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          contentId: 'quiz-one',
          title: 'Password quiz',
          description: null,
          isRequired: true,
          sourceAvailable: true,
        },
        {
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          contentId: 'document-one',
          title: 'Password guide',
          description: null,
          isRequired: true,
          sourceAvailable: true,
        },
      ]}
      onMoveItem={onMoveItem}
      onRemoveItem={onRemoveItem}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Move Password guide up' }));
  await user.click(screen.getByRole('button', { name: 'Remove Password quiz from Campaign' }));

  expect(onMoveItem).toHaveBeenCalledWith(1, -1);
  expect(onRemoveItem).toHaveBeenCalledWith(0);
});
