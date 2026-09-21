import type { CampaignComponentTypeDto } from '@insightful-phish/shared';
import * as RuntimeRepository from '../repositories/campaign-item-runtime.repository.js';
import { resolveAdaptiveSlot } from './adaptive-slot-resolution.service.js';

export type ResolvedCampaignItemRuntime = {
  campaignId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  componentType: CampaignComponentTypeDto;
  contentId: string;
  itemType: 'COMPONENT' | 'ADAPTIVE';
};

export async function resolveCampaignItemRuntime(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<ResolvedCampaignItemRuntime | null> {
  const item = await RuntimeRepository.findCampaignItemRuntimeContext(
    campaignItemId,
    traineeProfileId,
  );
  const assignmentId = item?.campaign.assignments[0]?.id;
  if (!item || !assignmentId || !item.componentType || item.itemType === 'GROUP') return null;

  if (item.itemType === 'ADAPTIVE') {
    const resolution = await resolveAdaptiveSlot({
      campaignAssignmentId: assignmentId,
      campaignItemId,
      traineeProfileId,
    });
    return {
      campaignId: item.campaignId,
      campaignAssignmentId: assignmentId,
      campaignItemId,
      componentType: item.componentType,
      contentId: resolution.selectedContentId,
      itemType: 'ADAPTIVE',
    };
  }

  const contentId = item.trainingDocumentId ?? item.quizId ?? item.simulationId;
  if (!contentId) return null;
  return {
    campaignId: item.campaignId,
    campaignAssignmentId: assignmentId,
    campaignItemId,
    componentType: item.componentType,
    contentId,
    itemType: 'COMPONENT',
  };
}
