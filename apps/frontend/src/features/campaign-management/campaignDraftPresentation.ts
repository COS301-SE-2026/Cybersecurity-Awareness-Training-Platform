const COMPONENT_TYPE_LABELS = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
} as const;

const COMPONENT_TYPE_CLASS_NAMES = {
  TRAINING_DOCUMENT: 'campaign-item--training-document',
  QUIZ: 'campaign-item--quiz',
  SIMULATED_INBOX: 'campaign-item--simulated-inbox',
} as const;

const GROUP_TYPE_LABELS = {
  SECTION: 'Section Group',
  MODULE: 'Module Group',
  REVISION_SET: 'Revision Set Group',
  ASSESSMENT_SET: 'Assessment Set Group',
  SIMULATION_SET: 'Simulation Set Group',
} as const;

type CampaignItemTypeSource =
  | {
      itemType: 'GROUP';
      groupType: keyof typeof GROUP_TYPE_LABELS;
    }
  | {
      itemType: 'COMPONENT';
      componentType: keyof typeof COMPONENT_TYPE_LABELS;
    }
  | {
      itemType: 'ADAPTIVE';
      componentType: keyof typeof COMPONENT_TYPE_LABELS;
    };

export function getCampaignDraftItemTypeLabel(item: CampaignItemTypeSource): string {
  if (item.itemType === 'GROUP') {
    return GROUP_TYPE_LABELS[item.groupType];
  }
  const componentLabel = COMPONENT_TYPE_LABELS[item.componentType];
  return item.itemType === 'ADAPTIVE' ? `Adaptive ${componentLabel}` : componentLabel;
}

export function getCampaignDraftItemTypeClassName(item: CampaignItemTypeSource): string {
  return item.itemType === 'GROUP'
    ? 'campaign-item--group'
    : COMPONENT_TYPE_CLASS_NAMES[item.componentType];
}
