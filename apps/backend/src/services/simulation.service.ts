import { createHash } from 'node:crypto';
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

function advisoryLockKey(parts: string[]): [number, number] {
  const hash = createHash('sha256').update(parts.join('\0')).digest();
  return [hash.readInt32BE(0), hash.readInt32BE(4)];
}

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
      !campaignItem.simulation.simulatedInbox ||
      campaignItem.simulation.simulatedInbox.status !== 'ACTIVE'
    ) {
      throw new Error('NOT_FOUND');
    }

    if (campaignItem.campaign?.assignments && campaignItem.campaign.assignments.length === 0) {
      throw new Error('FORBIDDEN');
    }

    const campaign = campaignItem.campaign
      ? (campaignItem.campaign as any)
      : { status: 'ACTIVE' as const, campaignType: 'PREMADE_GENERAL' as const };
    const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
      campaign as any,
    );
    if (!eligibility.canView) {
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
      emails: emails.map((email: (typeof emails)[0]) => ({
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
      (item: (typeof email.inbox.simulation.campaignItems)[0]) =>
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

    const campaign = (matchedItem.campaign as any) ?? {
      status: 'ACTIVE' as const,
      campaignType: 'PREMADE_GENERAL' as const,
    };
    const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
      campaign as any,
    );
    if (!eligibility.canView) {
      throw new Error('FORBIDDEN');
    }

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';

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

    const campaign = (matchedItem.campaign as any) ?? {
      status: 'ACTIVE' as const,
      campaignType: 'PREMADE_GENERAL' as const,
    };
    const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
      campaign as any,
    );
    defaultCampaignEligibilityService.assertCanProgress(eligibility);

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';
    const itemId = matchedItem.id;

    if (input.eventType === 'SIMULATED_EMAIL_OPENED') {
      const [lockKeyA, lockKeyB] = advisoryLockKey([
        'SIMULATED_EMAIL_OPENED',
        traineeProfileId,
        assignmentId,
        itemId,
        email.id,
      ]);

      await SimulationRepository.recordEmailOpenedEventTx({
        traineeProfileId,
        assignmentId,
        itemId,
        emailId: email.id,
        lockKeyA,
        lockKeyB,
      });

      return {
        success: true,
        eventType: input.eventType as SimulatedEmailInteractionEventTypeDto,
      };
    }

    await SimulationRepository.createSimulationInteractionEvent({
      traineeProfileId,
      assignmentId,
      itemId,
      eventType: input.eventType,
      emailId: email.id,
    });

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

    const campaign = (matchedItem.campaign as any) ?? {
      status: 'ACTIVE' as const,
      campaignType: 'PREMADE_GENERAL' as const,
    };
    const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
      campaign as any,
    );
    defaultCampaignEligibilityService.assertCanProgress(eligibility);

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';
    const itemId = matchedItem.id;

    const existingResponse = await SimulationRepository.findExistingClassificationResponse(
      traineeProfileId,
      email.id,
    );

    if (existingResponse) {
      throw new Error('ALREADY_CLASSIFIED');
    }

    if (input.selectedRedFlagIds?.length) {
      const validRedFlagIds = new Set(email.redFlags.map((rf: { id: string }) => rf.id));
      const invalidFlags = input.selectedRedFlagIds.filter((id) => !validRedFlagIds.has(id));
      if (invalidFlags.length > 0) {
        throw new Error('VALIDATION_ERROR');
      }
    }

    const isCorrect = email.expectedClassification === input.selectedClassification;

    const classificationResponse = await SimulationRepository.createClassificationResponseTx({
      traineeProfileId,
      simulatedEmailId: email.id,
      assignmentId,
      itemId,
      selectedClassification: input.selectedClassification,
      freeTextReason: input.freeTextReason,
      isCorrect,
      selectedRedFlagIds: input.selectedRedFlagIds,
    });

    return {
      success: true,
      responseId: classificationResponse.id,
      selectedClassification: input.selectedClassification,
      isCorrect,
      feedback: isCorrect
        ? 'Great job! You correctly identified the email.'
        : 'Not quite. Take a closer look at the red flags.',
      redFlags: email.redFlags.map((rf: (typeof email.redFlags)[0]) => ({
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
