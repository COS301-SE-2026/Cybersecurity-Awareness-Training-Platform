const COMPONENT_TYPE_LABELS = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
} as const;

type CampaignItemTypeSource =
  | { itemType: 'GROUP' }
  | {
      itemType: 'COMPONENT';
      componentType: keyof typeof COMPONENT_TYPE_LABELS;
    };

export function getCampaignDraftItemTypeLabel(item: CampaignItemTypeSource): string {
  return item.itemType === 'GROUP' ? 'Group' : COMPONENT_TYPE_LABELS[item.componentType];
}
