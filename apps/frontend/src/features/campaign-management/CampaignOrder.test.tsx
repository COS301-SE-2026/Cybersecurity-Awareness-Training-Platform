import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';

import CampaignOrder from './CampaignOrder';

it('displays components and preserves existing groups as opaque order entries', () => {
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
    />,
  );

  const order = screen.getByRole('region', { name: 'Campaign Order' });

  expect(within(order).getByRole('heading', { name: 'Password quiz' })).toBeInTheDocument();
  expect(within(order).getByText('Quiz')).toBeInTheDocument();
  expect(within(order).getByRole('heading', { name: 'Existing module' })).toBeInTheDocument();
  expect(within(order).getByText('Group')).toBeInTheDocument();
  expect(within(order).getByText('2 grouped items')).toBeInTheDocument();
});
