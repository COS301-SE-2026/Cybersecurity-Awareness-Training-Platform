import type { CampaignComponentTypeDto } from '@insightful-phish/shared';
import * as ResolutionRepository from '../repositories/adaptive-campaign-resolution.repository.js';
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

async function loadCampaignItemRuntimeContext(
  campaignItemId: string,
  traineeProfileId: string,
  campaignAssignmentId?: string,
) {
  const item = await RuntimeRepository.findCampaignItemRuntimeContext(
    campaignItemId,
    traineeProfileId,
    campaignAssignmentId,
  );
  const assignmentId = item?.campaign.assignments[0]?.id;
  if (!item || !assignmentId || !item.componentType || item.itemType === 'GROUP') return null;
  return { item, assignmentId, componentType: item.componentType };
}

function componentRuntime(
  context: NonNullable<Awaited<ReturnType<typeof loadCampaignItemRuntimeContext>>>,
): ResolvedCampaignItemRuntime | null {
  const { item, assignmentId, componentType } = context;
  const contentId = item.trainingDocumentId ?? item.quizId ?? item.simulationId;
  if (!contentId) return null;
  return {
    campaignId: item.campaignId,
    campaignAssignmentId: assignmentId,
    campaignItemId: item.id,
    componentType,
    contentId,
    itemType: 'COMPONENT',
  };
}

export async function resolveCampaignItemRuntime(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<ResolvedCampaignItemRuntime | null> {
  const context = await loadCampaignItemRuntimeContext(campaignItemId, traineeProfileId);
  if (!context) return null;
  const { item, assignmentId, componentType } = context;

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
      componentType,
      contentId: resolution.selectedContentId,
      itemType: 'ADAPTIVE',
    };
  }

  return componentRuntime(context);
}

export async function resolvePersistedCampaignItemRuntime(
  campaignItemId: string,
  traineeProfileId: string,
  campaignAssignmentId: string,
): Promise<ResolvedCampaignItemRuntime | null> {
  const context = await loadCampaignItemRuntimeContext(
    campaignItemId,
    traineeProfileId,
    campaignAssignmentId,
  );
  if (!context) return null;
  const { item, assignmentId, componentType } = context;

  if (item.itemType === 'ADAPTIVE') {
    const resolution = await ResolutionRepository.findAdaptiveResolutionForTrainee(
      assignmentId,
      item.id,
      traineeProfileId,
    );
    if (!resolution || resolution.campaignId !== item.campaignId) return null;
    return {
      campaignId: item.campaignId,
      campaignAssignmentId: assignmentId,
      campaignItemId: item.id,
      componentType,
      contentId: resolution.selectedContentId,
      itemType: 'ADAPTIVE',
    };
  }

  return componentRuntime(context);
}
