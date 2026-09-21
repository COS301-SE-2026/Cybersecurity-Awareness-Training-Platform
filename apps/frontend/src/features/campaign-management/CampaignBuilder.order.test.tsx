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

  const order = screen.getByRole('region', { name: 'Campaign structure' });

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

it('creates and edits a group while preserving child occurrence identities', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const document = {
    itemType: 'COMPONENT' as const,
    campaignItemId: 'item-document',
    componentType: 'TRAINING_DOCUMENT' as const,
    contentId: 'document-one',
    title: 'Password guide',
    description: null,
    isRequired: true,
    sourceAvailable: true,
  };
  const quiz = {
    itemType: 'COMPONENT' as const,
    campaignItemId: 'item-quiz',
    componentType: 'QUIZ' as const,
    contentId: 'quiz-one',
    title: 'Password quiz',
    description: null,
    isRequired: true,
    sourceAvailable: true,
    maxAttempts: 3,
    scorePolicy: 'LATEST' as const,
  };
  const inbox = {
    itemType: 'COMPONENT' as const,
    campaignItemId: 'item-inbox',
    componentType: 'SIMULATED_INBOX' as const,
    contentId: 'inbox-one',
    title: 'Practice inbox',
    description: null,
    isRequired: true,
    sourceAvailable: true,
  };

  render(
    <CampaignBuilder
      contextKind="organisation"
      initialDraft={{
        name: 'Grouped Campaign',
        description: '',
        accentColor: '#8400FF',
        startDate: '',
        endDate: '',
        items: [document, quiz, inbox],
      }}
      onSave={onSave}
    />,
  );

  await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Security module');
  await user.type(screen.getByRole('textbox', { name: 'Description (optional)' }), 'Core training');
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Item 1' }),
    'TRAINING_DOCUMENT:document-one',
  );
  await user.selectOptions(screen.getByRole('combobox', { name: 'Item 2' }), 'QUIZ:quiz-one');
  await user.click(screen.getByRole('button', { name: 'Create a group' }));

  expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveValue('');
  expect(screen.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Item 1' })).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Item 2' })).toHaveValue('');

  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Move Practice inbox to group' }),
    '0',
  );
  await user.click(screen.getByRole('button', { name: 'Move Password quiz up in group' }));
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Scoring for Password quiz' }),
    'AVERAGE',
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Requirement for Practice inbox' }),
    'optional',
  );
  await user.click(screen.getByRole('button', { name: 'Save Draft' }));

  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0]?.[0].items[0]).toMatchObject({
    itemType: 'GROUP',
    title: 'Security module',
    description: 'Core training',
    children: [
      {
        campaignItemId: 'item-quiz',
        contentId: 'quiz-one',
        maxAttempts: 3,
        scorePolicy: 'AVERAGE',
      },
      { campaignItemId: 'item-document', contentId: 'document-one' },
      { campaignItemId: 'item-inbox', contentId: 'inbox-one', isRequired: false },
    ],
  });
});

it.each(['Password quiz', 'Password guide'])(
  'preserves child order when moving %s out dissolves a two-item group',
  async (childTitle) => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignBuilder
        contextKind="platform"
        initialDraft={{
          name: 'Dissolving group',
          description: '',
          accentColor: '#8400FF',
          startDate: '',
          endDate: '',
          items: [
            {
              itemType: 'GROUP',
              clientId: 'group-security',
              title: 'Security module',
              description: null,
              groupType: 'MODULE',
              completionRule: 'COMPLETE_ALL',
              isRequired: true,
              children: [
                {
                  itemType: 'COMPONENT',
                  campaignItemId: 'item-quiz',
                  componentType: 'QUIZ',
                  contentId: 'quiz-one',
                  title: 'Password quiz',
                  description: null,
                  isRequired: false,
                  sourceAvailable: true,
                  maxAttempts: 3,
                  scorePolicy: 'LATEST',
                },
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
              ],
            },
          ],
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: `Move ${childTitle} out of group` }));
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(onSave.mock.calls[0]?.[0].items).toMatchObject([
      {
        campaignItemId: 'item-quiz',
        componentType: 'QUIZ',
        contentId: 'quiz-one',
        isRequired: false,
        maxAttempts: 3,
        scorePolicy: 'LATEST',
      },
      {
        campaignItemId: 'item-document',
        componentType: 'TRAINING_DOCUMENT',
        contentId: 'document-one',
        isRequired: true,
      },
    ]);
  },
);
