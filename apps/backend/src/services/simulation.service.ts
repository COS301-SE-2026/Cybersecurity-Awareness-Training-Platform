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
import { isSimulatedInboxEmailEligibleForManagedPortal } from './email-authoring.service.js';
import { getOrCreateManagedPortalForOccurrence } from './phishing-portal.service.js';
import { resolveCampaignItemRuntime } from './campaign-item-runtime.service.js';

const ACCESSIBLE_ASSIGNMENT_STATUSES = new Set([
  'AVAILABLE',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
]);
const SOURCE_LIFETIME_EXPIRY = new Date('9999-12-31T23:59:59.999Z');

type SimulatedEmailWithAccess = NonNullable<
  Awaited<ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>>
>;
type SimulatedEmailCampaignItem =
  SimulatedEmailWithAccess['inbox']['simulation']['campaignItems'][number];

function getClassificationFeedback(isCorrect: boolean): string {
  return isCorrect === true
    ? 'Great job! You correctly identified the email.'
    : 'Not quite. Take a closer look at the red flags.';
}

export class SimulationService {
  async getTraineeProfile(userId: string) {
    return SimulationRepository.findTraineeProfileByUserId(userId);
  }

  async getSimulatedInbox(
    campaignItemId: string,
    traineeProfileId: string,
  ): Promise<GetSimulatedInboxResponseDto> {
    const runtime = await resolveCampaignItemRuntime(campaignItemId, traineeProfileId);
    if (!runtime || runtime.componentType !== 'SIMULATED_INBOX') throw new Error('NOT_FOUND');
    const campaignItem = await SimulationRepository.findSimulatedInboxCampaignItem(
      campaignItemId,
      traineeProfileId,
      runtime.contentId,
    );

    if (
      !campaignItem ||
      !['COMPONENT', 'ADAPTIVE'].includes(campaignItem.itemType) ||
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

    const classificationResults = await SimulationRepository.findEmailClassificationResults({
      traineeProfileId,
      campaignAssignmentId,
      campaignItemId,
      emailIds,
    });
    let correctlyClassifiedEmails = 0;

    for (const isCorrect of classificationResults.values()) {
      if (isCorrect === true) {
        correctlyClassifiedEmails += 1;
      }
    }

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
        isOpened: classificationResults.has(email.id),
      })),
      statistics: {
        totalEmails: emails.length,
        classifiedEmails: classificationResults.size,
        correctlyClassifiedEmails,
      },
    };
  }

  private async getEmailWithAccess(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
    includeRedFlags = false,
  ) {
    const runtime = await resolveCampaignItemRuntime(campaignItemId, traineeProfileId);
    if (!runtime || runtime.componentType !== 'SIMULATED_INBOX') throw new Error('FORBIDDEN');
    const email = await SimulationRepository.findSimulatedEmailWithAccess(
      emailId,
      traineeProfileId,
      includeRedFlags,
    );
    const campaignItem =
      runtime.itemType === 'COMPONENT'
        ? email?.inbox.simulation.campaignItems.find((item) => item.id === campaignItemId)
        : await SimulationRepository.findSimulatedInboxCampaignItem(
            campaignItemId,
            traineeProfileId,
            runtime.contentId,
          );

    if (!email || !campaignItem || email.inbox.simulation.id !== runtime.contentId) {
      throw new Error('NOT_FOUND');
    }

    const matchedItem = campaignItem;

    if (
      !['COMPONENT', 'ADAPTIVE'].includes(matchedItem.itemType) ||
      matchedItem.componentType !== 'SIMULATED_INBOX' ||
      matchedItem.availabilityStatus !== 'AVAILABLE' ||
      matchedItem.simulation?.safetyStatus !== 'APPROVED' ||
      matchedItem.simulation.simulatedInbox?.status !== 'ACTIVE'
    ) {
      throw new Error('FORBIDDEN');
    }

    const assignmentId = matchedItem.campaign?.assignments?.[0]?.id;
    if (assignmentId === undefined) {
      throw new Error('FORBIDDEN');
    }

    return { email, matchedItem, assignmentId };
  }

  private async getManagedPortalUrl(input: {
    email: SimulatedEmailWithAccess;
    matchedItem: SimulatedEmailCampaignItem;
    assignmentId: string;
    traineeProfileId: string;
    sourceCanProgress: boolean;
    now: Date;
  }): Promise<string | null> {
    const { email, matchedItem, assignmentId, traineeProfileId, sourceCanProgress, now } = input;
    if (
      !sourceCanProgress ||
      email.portalTemplateId === null ||
      !isSimulatedInboxEmailEligibleForManagedPortal({
        channel: 'SIMULATED_INBOX',
        portalTemplateId: email.portalTemplateId,
        expectedClassification: email.expectedClassification,
        bodyHtml: email.bodyHtml,
        linkAnchorText: email.linkAnchorText,
      })
    ) {
      return null;
    }

    const campaign = matchedItem.campaign;
    const assignment = campaign?.assignments.find((candidate) => candidate.id === assignmentId);
    const simulation = email.inbox.simulation;
    const trainee = assignment?.traineeProfile;
    if (
      !campaign ||
      !assignment ||
      !trainee ||
      assignment.traineeProfileId !== traineeProfileId ||
      trainee.id !== traineeProfileId ||
      trainee.traineeStatus !== 'ACTIVE' ||
      trainee.user.authStatus !== 'ACTIVE' ||
      !ACCESSIBLE_ASSIGNMENT_STATUSES.has(assignment.assignmentStatus) ||
      assignment.campaignId !== campaign.id ||
      matchedItem.campaignId !== campaign.id ||
      matchedItem.simulationId !== simulation.id ||
      matchedItem.simulation?.id !== simulation.id ||
      matchedItem.simulation.simulatedInbox?.id !== email.inbox.id ||
      matchedItem.itemType !== 'COMPONENT' ||
      matchedItem.componentType !== 'SIMULATED_INBOX' ||
      matchedItem.availabilityStatus !== 'AVAILABLE' ||
      simulation.simulationType !== 'SIMULATED_INBOX' ||
      simulation.safetyStatus !== 'APPROVED' ||
      email.inbox.status !== 'ACTIVE'
    ) {
      throw new Error('FORBIDDEN');
    }

    const organisationId = simulation.organisationId;
    if (organisationId === null) {
      if (
        simulation.organisation !== null ||
        campaign.organisationId !== null ||
        campaign.campaignType !== 'PREMADE_GENERAL' ||
        assignment.accessType !== 'SELF_SELECTED' ||
        trainee.generalTraineeProfile === null
      ) {
        throw new Error('FORBIDDEN');
      }
    } else if (
      simulation.organisation?.id !== organisationId ||
      simulation.organisation.status !== 'ACTIVE' ||
      campaign.organisationId !== organisationId ||
      campaign.campaignType !== 'ORGANISATION_CUSTOM' ||
      assignment.accessType !== 'ASSIGNED' ||
      trainee.organisationTraineeProfile?.organisationId !== organisationId ||
      trainee.organisationTraineeProfile.membershipStatus !== 'ACTIVE'
    ) {
      throw new Error('FORBIDDEN');
    }

    const result = await getOrCreateManagedPortalForOccurrence(
      {
        portalTemplateId: email.portalTemplateId,
        traineeProfileId,
        organisationId,
        context: {
          channel: 'SIMULATED_INBOX',
          campaignAssignmentId: assignmentId,
          campaignItemId: matchedItem.id,
          simulatedEmailId: email.id,
        },
        expiresAt:
          campaign.endDate &&
          Number.isFinite(campaign.endDate.getTime()) &&
          campaign.endDate.getTime() > now.getTime()
            ? campaign.endDate
            : SOURCE_LIFETIME_EXPIRY,
      },
      now,
    );

    return result.state === 'ACTIVE' ? result.managedPortalUrl : null;
  }

  async getSimulatedEmail(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
  ): Promise<GetSimulatedEmailResponseDto> {
    const { email, matchedItem, assignmentId } = await this.getEmailWithAccess(
      emailId,
      campaignItemId,
      traineeProfileId,
      true,
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

    const managedPortalUrl = await this.getManagedPortalUrl({
      email,
      matchedItem,
      assignmentId,
      traineeProfileId,
      sourceCanProgress: itemEligibility.canProgress,
      now: new Date(),
    });

    const existingResponse = await SimulationRepository.findExistingClassificationResponse({
      traineeProfileId,
      campaignAssignmentId: assignmentId,
      campaignItemId: matchedItem.id,
      simulatedEmailId: email.id,
    });

    const classificationResult: ClassifySimulatedEmailResponseDto | null =
      existingResponse === null || existingResponse === undefined
        ? null
        : {
            success: true,
            responseId: existingResponse.id,
            selectedClassification: existingResponse.selectedClassification,
            expectedClassification: email.expectedClassification,
            selectedRedFlagIds: existingResponse.selectedRedFlags.map(
              (flag) => flag.emailRedFlagId,
            ),
            selectedRedFlagTypes: existingResponse.selectedRedFlagTypes,
            isCorrect: existingResponse.isCorrect,
            feedback: getClassificationFeedback(existingResponse.isCorrect),
            redFlags: email.redFlags.map((flag) => ({
              id: flag.id,
              redFlagType: flag.redFlagType,
              label: flag.label,
              description: flag.description ?? '',
              severity: flag.severity,
            })),
          };

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
      linkAnchorText: email.linkAnchorText,
      simulatedLinkTarget: email.simulatedLinkTarget,
      portalTemplateId: email.portalTemplateId,
      managedPortalUrl,
      hasAttachment: email.hasAttachment,
      receivedAt: email.receivedAt.toISOString(),
      difficultyLevel: email.difficultyLevel,
      classificationResult,
    };
  }

  async recordInteraction(
    emailId: string,
    campaignItemId: string,
    traineeProfileId: string,
    input: RecordSimulatedEmailInteractionRequestDto,
  ): Promise<RecordSimulatedEmailInteractionResponseDto> {
    const { email, matchedItem, assignmentId } = await this.getEmailWithAccess(
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
    const { email, matchedItem, assignmentId } = await this.getEmailWithAccess(
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

    const itemId = matchedItem.id;
    const campaignId = matchedItem.campaignId;

    const existingResponse = await SimulationRepository.findExistingClassificationResponse({
      traineeProfileId,
      campaignAssignmentId: assignmentId,
      campaignItemId: itemId,
      simulatedEmailId: email.id,
    });

    if (existingResponse) {
      throw new Error('ALREADY_CLASSIFIED');
    }

    const selectedRedFlagIds = new Set(input.selectedRedFlagIds ?? []);
    const selectedRedFlagTypes = new Set(input.selectedRedFlagTypes ?? []);
    const validRedFlagIds = new Set(email.redFlags.map((redFlag) => redFlag.id));

    for (const redFlag of email.redFlags) {
      if (selectedRedFlagTypes.has(redFlag.redFlagType) === true) {
        selectedRedFlagIds.add(redFlag.id);
      }
    }

    const invalidFlags = [...selectedRedFlagIds].filter((id) => validRedFlagIds.has(id) !== true);
    if (invalidFlags.length > 0) {
      throw new Error('VALIDATION_ERROR');
    }

    for (const redFlag of email.redFlags) {
      if (selectedRedFlagIds.has(redFlag.id) === true) {
        selectedRedFlagTypes.add(redFlag.redFlagType);
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
      selectedRedFlagIds: [...selectedRedFlagIds],
      selectedRedFlagTypes: [...selectedRedFlagTypes],
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
      expectedClassification: email.expectedClassification,
      selectedRedFlagIds: [...selectedRedFlagIds],
      selectedRedFlagTypes: [...selectedRedFlagTypes],
      isCorrect,
      feedback: getClassificationFeedback(isCorrect),
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
