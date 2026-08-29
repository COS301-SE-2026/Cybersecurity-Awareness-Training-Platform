import type {
  GetSimulatedInboxResponseDto,
  GetSimulatedEmailResponseDto,
  RecordSimulatedEmailInteractionResponseDto,
  ClassifySimulatedEmailResponseDto,
  SimulatedEmailInteractionEventTypeDto,
  RecordSimulatedEmailInteractionRequestDto,
  ClassifySimulatedEmailRequestDto,
} from '@insightful-phish/shared';
import * as SimulationRepository from '../repositories/simulation.repository.js';
import { defaultCampaignEligibilityService } from './campaign-eligibility.service.js';

export class SimulationService {
  async getTraineeProfile(userId: string) {
    return SimulationRepository.findTraineeProfileByUserId(userId);
  }

  async getSimulatedInbox(
    campaignItemId: string,
    traineeProfileId: string,
  ): Promise<GetSimulatedInboxResponseDto> {
    const campaignItem = await SimulationRepository.findSimulatedInboxCampaignItem(
      campaignItemId,
      traineeProfileId,
    );

    if (
      !campaignItem ||
      campaignItem.itemType !== 'COMPONENT' ||
      campaignItem.componentType !== 'SIMULATED_INBOX' ||
      campaignItem.availabilityStatus !== 'AVAILABLE' ||
      !campaignItem.simulation ||
      campaignItem.simulation.safetyStatus !== 'APPROVED' ||
      campaignItem.simulation.simulatedInbox?.status !== 'ACTIVE'
    ) {
      throw new Error('NOT_FOUND');
    }

    if (campaignItem.campaign?.assignments?.length === 0) {
      throw new Error('FORBIDDEN');
    }

    const campaign = campaignItem.campaign ?? { status: 'ACTIVE', campaignType: 'PREMADE_GENERAL' };
    const campaignEligibility =
      defaultCampaignEligibilityService.evaluateCampaignEligibility(campaign);
    const itemEligibility = defaultCampaignEligibilityService.evaluateItemEligibility(
      campaignEligibility,
      'SIMULATED_INBOX',
    );

    if (!itemEligibility.canView) {
      throw new Error('FORBIDDEN');
    }

    const campaignAssignmentId = campaignItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';
    const emails = campaignItem.simulation.simulatedInbox.emails;
    const emailIds = emails.map((email) => email.id);

    const openedEmailIds = await SimulationRepository.findOpenedEmailIds({
      traineeProfileId,
      campaignAssignmentId,
      campaignItemId,
      emailIds,
    });

    return {
      emails: emails.map((email) => ({
        id: email.id,
        campaignAssignmentId,
        campaignItemId,
        inboxId: email.inboxId,
        senderLabel: email.senderLabel,
        senderAddress: email.senderAddress,
        subject: email.subject,
        preview: email.preview ?? '',
        receivedAt: email.receivedAt.toISOString(),
        difficultyLevel: email.difficultyLevel,
        isOpened: openedEmailIds.has(email.id),
      })),
    };
  }

  private async getEmailWithAccess(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
    includeRedFlags = false,
  ) {
    const email = await SimulationRepository.findSimulatedEmailWithAccess(
      emailId,
      traineeProfileId,
      includeRedFlags,
    );

    if (!email) {
      throw new Error('NOT_FOUND');
    }

    const matchedItem = email.inbox.simulation.campaignItems.find(
      (item) =>
        item.id === campaignItemId &&
        (!item.campaign?.assignments || item.campaign.assignments.length > 0) &&
        item.itemType === 'COMPONENT' &&
        item.componentType === 'SIMULATED_INBOX' &&
        item.availabilityStatus === 'AVAILABLE' &&
        item.simulation?.safetyStatus === 'APPROVED' &&
        item.simulation?.simulatedInbox?.status === 'ACTIVE',
    );

    if (!matchedItem) {
      throw new Error('FORBIDDEN');
    }

    return { email, matchedItem };
  }

  async getSimulatedEmail(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
  ): Promise<GetSimulatedEmailResponseDto> {
    const { email, matchedItem } = await this.getEmailWithAccess(
      emailId,
      campaignItemId,
      traineeProfileId,
    );

    const campaign = matchedItem.campaign ?? { status: 'ACTIVE', campaignType: 'PREMADE_GENERAL' };
    const campaignEligibility =
      defaultCampaignEligibilityService.evaluateCampaignEligibility(campaign);
    const itemEligibility = defaultCampaignEligibilityService.evaluateItemEligibility(
      campaignEligibility,
      'SIMULATED_INBOX',
    );

    if (!itemEligibility.canView) {
      throw new Error('FORBIDDEN');
    }

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';

    if (
      itemEligibility.canView &&
      !itemEligibility.canProgress &&
      campaignEligibility.reason !== 'COMPLETED'
    ) {
      const history = await SimulationRepository.hasExistingSimulationEmailHistory({
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId: matchedItem.id,
        simulatedEmailId: email.id,
      });
      if (!history) {
        throw new Error('FORBIDDEN');
      }
    }

    return {
      id: email.id,
      campaignAssignmentId: assignmentId,
      campaignItemId: matchedItem.id,
      inboxId: email.inboxId,
      senderLabel: email.senderLabel,
      senderAddress: email.senderAddress,
      subject: email.subject,
      preview: email.preview,
      bodyHtml: email.bodyHtml,
      simulatedLinkTarget: email.simulatedLinkTarget,
      hasAttachment: email.hasAttachment,
      receivedAt: email.receivedAt.toISOString(),
      difficultyLevel: email.difficultyLevel,
    };
  }

  async recordInteraction(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
    input: RecordSimulatedEmailInteractionRequestDto,
  ): Promise<RecordSimulatedEmailInteractionResponseDto> {
    const { email, matchedItem } = await this.getEmailWithAccess(
      emailId,
      campaignItemId,
      traineeProfileId,
    );

    const checkedAt = new Date();
    const campaign = matchedItem.campaign ?? { status: 'ACTIVE', campaignType: 'PREMADE_GENERAL' };
    const campaignEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
      campaign,
      checkedAt,
    );
    const itemEligibility = defaultCampaignEligibilityService.evaluateItemEligibility(
      campaignEligibility,
      'SIMULATED_INBOX',
    );
    defaultCampaignEligibilityService.assertCanProgress(itemEligibility);

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';
    const itemId = matchedItem.id;
    const campaignId = matchedItem.campaignId;

    if (input.eventType === 'SIMULATED_EMAIL_OPENED') {
      const result = await SimulationRepository.recordEmailOpenedEventTx({
        campaignId,
        traineeProfileId,
        assignmentId,
        itemId,
        emailId: email.id,
        checkedAt,
      });

      if (!result.allowed) {
        if (result.reason === 'NOT_FOUND' || !result.campaign) {
          throw new Error('NOT_FOUND');
        }
        const guardEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
          result.campaign,
          checkedAt,
        );
        defaultCampaignEligibilityService.assertCanProgress(guardEligibility);
      }

      return {
        success: true,
        eventType: input.eventType as SimulatedEmailInteractionEventTypeDto,
      };
    }

    const result = await SimulationRepository.createSimulationInteractionEventGuarded({
      campaignId,
      traineeProfileId,
      campaignAssignmentId: assignmentId,
      campaignItemId: itemId,
      eventType: input.eventType,
      simulatedEmailId: email.id,
      checkedAt,
    });

    if (!result.allowed) {
      if (result.reason === 'NOT_FOUND' || !result.campaign) {
        throw new Error('NOT_FOUND');
      }
      const guardEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
        result.campaign,
        checkedAt,
      );
      defaultCampaignEligibilityService.assertCanProgress(guardEligibility);
    }

    return {
      success: true,
      eventType: input.eventType as SimulatedEmailInteractionEventTypeDto,
    };
  }

  async classifyEmail(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
    input: ClassifySimulatedEmailRequestDto,
  ): Promise<ClassifySimulatedEmailResponseDto> {
    const { email, matchedItem } = await this.getEmailWithAccess(
      emailId,
      campaignItemId,
      traineeProfileId,
      true,
    );

    const checkedAt = new Date();
    const campaign = matchedItem.campaign ?? { status: 'ACTIVE', campaignType: 'PREMADE_GENERAL' };
    const campaignEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
      campaign,
      checkedAt,
    );
    const itemEligibility = defaultCampaignEligibilityService.evaluateItemEligibility(
      campaignEligibility,
      'SIMULATED_INBOX',
    );
    defaultCampaignEligibilityService.assertCanProgress(itemEligibility);

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';
    const itemId = matchedItem.id;
    const campaignId = matchedItem.campaignId;

    const existingResponse = await SimulationRepository.findExistingClassificationResponse(
      traineeProfileId,
      email.id,
    );

    if (existingResponse) {
      throw new Error('ALREADY_CLASSIFIED');
    }

    if (input.selectedRedFlagIds?.length) {
      const validRedFlagIds = new Set(email.redFlags.map((rf) => rf.id));
      const invalidFlags = input.selectedRedFlagIds.filter((id) => !validRedFlagIds.has(id));
      if (invalidFlags.length > 0) {
        throw new Error('VALIDATION_ERROR');
      }
    }

    const isCorrect = email.expectedClassification === input.selectedClassification;

    const classificationResult = await SimulationRepository.createClassificationResponseTx({
      campaignId,
      traineeProfileId,
      simulatedEmailId: email.id,
      assignmentId,
      itemId,
      selectedClassification: input.selectedClassification,
      freeTextReason: input.freeTextReason,
      isCorrect,
      selectedRedFlagIds: input.selectedRedFlagIds,
      checkedAt,
    });

    if (!classificationResult.allowed) {
      if (classificationResult.reason === 'ALREADY_CLASSIFIED') {
        throw new Error('ALREADY_CLASSIFIED');
      }
      if (classificationResult.reason === 'NOT_FOUND' || !classificationResult.campaign) {
        throw new Error('NOT_FOUND');
      }
      const guardEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
        classificationResult.campaign,
        checkedAt,
      );
      defaultCampaignEligibilityService.assertCanProgress(guardEligibility);
      throw new Error('FORBIDDEN');
    }

    const classificationResponse = classificationResult.value;

    return {
      success: true,
      responseId: classificationResponse.id,
      selectedClassification: input.selectedClassification,
      isCorrect,
      feedback: isCorrect
        ? 'Great job! You correctly identified the email.'
        : 'Not quite. Take a closer look at the red flags.',
      redFlags: email.redFlags.map((rf) => ({
        id: rf.id,
        redFlagType: rf.redFlagType,
        label: rf.label,
        description: rf.description ?? '',
        severity: rf.severity,
      })),
    };
  }
}

export const simulationService = new SimulationService();
