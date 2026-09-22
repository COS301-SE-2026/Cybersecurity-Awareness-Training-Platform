import {
  campaignProposalResponseSchema,
  campaignProposalTraineeOptionsResponseSchema,
  type CampaignProposalTraineeOptionsResponseDto,
  followUpCampaignProposalResponseSchema,
  type CampaignProposalRequestDto,
  type CampaignProposalResponseDto,
  type FollowUpCampaignProposalRequestDto,
  type FollowUpCampaignProposalResponseDto,
} from '@insightful-phish/shared';
import {
  findActiveOrganisationTraineesForCampaignProposal,
  findEligibleOrganisationTraineeForCampaignProposal,
} from '../repositories/organisation-trainee.repository.js';
import {
  CampaignProposalOutputError,
  createAiCampaignProposalService,
} from './ai-campaign-proposal.service.js';
import { getAdaptiveCategoryStates } from './adaptive-category-state.service.js';
import {
  type UserActorContext,
  requireOrganisationCampaignManagementAccess,
} from './campaign-management.service.js';
import { createAiFollowUpCampaignProposalService } from './ai-follow-up-campaign-proposal.service.js';
import { translateAiBuilderGenerationError } from './ai-builder-generation.service.js';

export class AiCampaignProposalApiError extends Error {
  constructor(
    readonly statusCode: 404 | 422 | 502,
    readonly error: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AiCampaignProposalApiError';
  }
}

function translateProposalError(error: unknown): never {
  if (error instanceof AiCampaignProposalApiError) throw error;
  if (error instanceof CampaignProposalOutputError) {
    throw new AiCampaignProposalApiError(
      502,
      'AI_GENERATION_INVALID_RESPONSE',
      'AI generation returned an invalid Campaign proposal',
      true,
    );
  }
  return translateAiBuilderGenerationError(error);
}

export async function listOrganisationCampaignProposalTrainees(input: {
  actor: UserActorContext;
  organisationId: string;
}): Promise<CampaignProposalTraineeOptionsResponseDto> {
  await requireOrganisationCampaignManagementAccess(input.actor, input.organisationId);
  const trainees = await findActiveOrganisationTraineesForCampaignProposal(input.organisationId);

  return campaignProposalTraineeOptionsResponseSchema.parse({
    trainees: trainees.map(({ traineeProfileId, traineeProfile }) => {
      const { user } = traineeProfile;
      const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      return {
        traineeProfileId,
        displayName: displayName || user.email,
      };
    }),
  });
}

export async function generateOrganisationCampaignProposal(input: {
  actor: UserActorContext;
  organisationId: string;
  request: CampaignProposalRequestDto;
}): Promise<CampaignProposalResponseDto> {
  await requireOrganisationCampaignManagementAccess(input.actor, input.organisationId);
  try {
    const result = await createAiCampaignProposalService().generateEditableProposal({
      actorUserId: input.actor.userId,
      organisationId: input.organisationId,
      ...input.request,
    });
    return campaignProposalResponseSchema.parse(result);
  } catch (error) {
    return translateProposalError(error);
  }
}

export async function generateOrganisationFollowUpCampaignProposal(input: {
  actor: UserActorContext;
  organisationId: string;
  request: FollowUpCampaignProposalRequestDto;
}): Promise<FollowUpCampaignProposalResponseDto> {
  await requireOrganisationCampaignManagementAccess(input.actor, input.organisationId);
  const trainee = await findEligibleOrganisationTraineeForCampaignProposal(
    input.organisationId,
    input.request.traineeProfileId,
  );
  if (!trainee) {
    throw new AiCampaignProposalApiError(
      404,
      'TRAINEE_NOT_FOUND',
      'Active organisation trainee not found',
      false,
    );
  }

  try {
    const categoryStates = await getAdaptiveCategoryStates(trainee.traineeProfileId);
    const result = await createAiFollowUpCampaignProposalService().generateFollowUpProposal({
      actorUserId: input.actor.userId,
      organisationId: input.organisationId,
      objective: input.request.objective,
      categoryStates,
      ...(input.request.administratorGuidance
        ? { administratorGuidance: input.request.administratorGuidance }
        : {}),
    });
    return followUpCampaignProposalResponseSchema.parse(result);
  } catch (error) {
    return translateProposalError(error);
  }
}
