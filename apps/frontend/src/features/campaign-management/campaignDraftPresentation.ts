import type { CampaignDraftItemState } from './campaignManagement.types';

const COMPONENT_TYPE_LABELS = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
} as const;

export function getCampaignDraftItemTypeLabel(item: CampaignDraftItemState): string {
  return item.itemType === 'GROUP' ? 'Group' : COMPONENT_TYPE_LABELS[item.componentType];
}
