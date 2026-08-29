import type { CampaignDetailItemDto } from '@insightful-phish/shared';
import { expect, it } from 'vitest';

import { toCampaignDraftItems } from './campaignDraftItems';

it('maps ordered Campaign items without mutating authoritative arrays', () => {
  const laterComponent = {
    itemType: 'COMPONENT',
    campaignItemId: 'component-later',
    componentType: 'QUIZ',
    contentId: 'quiz-later',
    title: 'Later quiz',
    description: null,
    position: 20,
    isRequired: false,
    sourceAvailable: true,
  } satisfies CampaignDetailItemDto;

  const earlierGroup = {
    itemType: 'GROUP',
    campaignItemId: 'group-earlier',
    title: 'Security module',
    description: 'Complete this module.',
    groupType: 'MODULE',
    completionRule: 'COMPLETE_REQUIRED_ONLY',
    position: 10,
    isRequired: true,
    children: [
      {
        itemType: 'COMPONENT',
        campaignItemId: 'child-later',
        componentType: 'TRAINING_DOCUMENT',
        contentId: 'document-later',
        title: 'Later document',
        description: null,
        position: 20,
        isRequired: true,
        sourceAvailable: false,
      },
      {
        itemType: 'COMPONENT',
        campaignItemId: 'child-earlier',
        componentType: 'SIMULATED_INBOX',
        contentId: 'inbox-earlier',
        title: 'Earlier simulation',
        description: 'Identify the suspicious message.',
        position: 10,
        isRequired: false,
        sourceAvailable: true,
      },
    ],
  } satisfies CampaignDetailItemDto;

  const items: CampaignDetailItemDto[] = [laterComponent, earlierGroup];
  const originalTopLevelOrder = items.map((item) => item.campaignItemId);
  const originalChildOrder = earlierGroup.children.map((item) => item.campaignItemId);
  const result = toCampaignDraftItems(items);

  expect(result.map((item) => item.campaignItemId)).toEqual(['group-earlier', 'component-later']);

  const mappedGroup = result[0];
  expect(mappedGroup?.itemType).toBe('GROUP');

  if (mappedGroup?.itemType !== 'GROUP') {
    throw new Error('Expected the first mapped item to be a group.');
  }

  expect(mappedGroup).toMatchObject({
    campaignItemId: 'group-earlier',
    title: 'Security module',
    description: 'Complete this module.',
    groupType: 'MODULE',
    completionRule: 'COMPLETE_REQUIRED_ONLY',
    isRequired: true,
  });

  expect(mappedGroup.children.map((item) => item.campaignItemId)).toEqual([
    'child-earlier',
    'child-later',
  ]);

  expect(mappedGroup.children[0]).toMatchObject({
    campaignItemId: 'child-earlier',
    componentType: 'SIMULATED_INBOX',
    contentId: 'inbox-earlier',
    title: 'Earlier simulation',
    description: 'Identify the suspicious message.',
    isRequired: false,
    sourceAvailable: true,
  });

  expect(mappedGroup.children[1]).toMatchObject({
    componentType: 'TRAINING_DOCUMENT',
    contentId: 'document-later',
    sourceAvailable: false,
  });

  expect(items.map((item) => item.campaignItemId)).toEqual(originalTopLevelOrder);
  expect(earlierGroup.children.map((item) => item.campaignItemId)).toEqual(originalChildOrder);
});
