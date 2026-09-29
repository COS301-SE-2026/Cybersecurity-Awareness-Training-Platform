import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import CampaignOrder from './CampaignOrder';
import userEvent from '@testing-library/user-event';

it('displays components and preserves existing groups as opaque order entries', () => {
  const onMoveItem = vi.fn();
  const onRemoveItem = vi.fn();
  const onRequiredChange = vi.fn();

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
      onRequiredChange={onRequiredChange}
    />,
  );

  const order = screen.getByRole('region', { name: 'Campaign structure' });

  expect(within(order).getByRole('heading', { name: 'Password quiz' })).toBeInTheDocument();
  expect(within(order).getByRole('heading', { name: 'Existing module' })).toBeInTheDocument();
  expect(within(order).getByText('2 items')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Requirement for Password quiz' })).toHaveValue(
    'required',
  );
  expect(screen.getByRole('button', { name: 'Move Password quiz up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Password quiz down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Existing module down' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Ungroup Existing module' })).toBeEnabled();
  expect(screen.getByRole('combobox', { name: 'Requirement for Existing module' })).toHaveValue(
    'required',
  );
});

it('requests movement and removal using top-level indexes', async () => {
  const user = userEvent.setup();
  const onMoveItem = vi.fn();
  const onRemoveItem = vi.fn();
  const onRequiredChange = vi.fn();

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
      onRequiredChange={onRequiredChange}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Move Password guide up' }));
  await user.click(screen.getByRole('button', { name: 'Remove Password quiz from Campaign' }));

  expect(onMoveItem).toHaveBeenCalledWith(1, -1);
  expect(onRemoveItem).toHaveBeenCalledWith(0);
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Requirement for Password guide' }),
    'optional',
  );
  expect(onRequiredChange).toHaveBeenCalledWith(1, false);
});

it('keeps editable group controls attached to unsaved groups after reordering', () => {
  const groupA = {
    itemType: 'GROUP' as const,
    clientId: 'group-a',
    title: 'Group A',
    description: null,
    groupType: 'MODULE' as const,
    completionRule: 'COMPLETE_ALL' as const,
    isRequired: true,
    children: [],
  };
  const groupB = {
    ...groupA,
    clientId: 'group-b',
    title: 'Group B',
  };
  const props = {
    onMoveItem: vi.fn(),
    onRemoveItem: vi.fn(),
    onRequiredChange: vi.fn(),
    onGroupChange: vi.fn(),
  };
  const { rerender } = render(<CampaignOrder {...props} items={[groupA, groupB]} />);
  const groupAInput = screen.getByRole('textbox', { name: 'Group name for Group A' });

  groupAInput.focus();
  expect(groupAInput).toHaveFocus();

  rerender(<CampaignOrder {...props} items={[groupB, groupA]} />);

  expect(screen.getByRole('textbox', { name: 'Group name for Group A' })).toHaveFocus();
});
