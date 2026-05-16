import { prisma } from '../lib/prisma.js';
import type {
  GetSimulatedInboxResponseDto,
  GetSimulatedEmailResponseDto,
  RecordSimulatedEmailInteractionResponseDto,
  ClassifySimulatedEmailResponseDto,
  SimulatedEmailInteractionEventTypeDto,
  EmailClassificationDto,
  RecordSimulatedEmailInteractionRequestDto,
  ClassifySimulatedEmailRequestDto,
} from '@insightful-phish/shared';

export class SimulationService {
  async getTraineeProfile(userId: string) {
    return prisma.traineeProfile.findUnique({
      where: { userId },
    });
  }

  async getSimulatedInbox(
    campaignItemId: string,
    traineeProfileId: string,
  ): Promise<GetSimulatedInboxResponseDto> {
    const campaignItem = await prisma.campaignItem.findUnique({
      where: { id: campaignItemId },
      include: {
        simulation: {
          include: {
            simulatedInbox: {
              include: {
                emails: {
                  orderBy: { receivedAt: 'desc' },
                },
              },
            },
          },
        },
        campaign: {
          include: {
            assignments: {
              where: {
                traineeProfileId,
                assignmentStatus: {
                  in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as any,
                },
              },
            },
          },
        },
      },
    });

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

    if (campaignItem.campaign.assignments.length === 0) {
      throw new Error('FORBIDDEN');
    }

    const campaignAssignmentId = campaignItem.campaign.assignments[0].id;

    return {
      emails: campaignItem.simulation.simulatedInbox.emails.map((email: any) => ({
        id: email.id,
        campaignAssignmentId,
        campaignItemId,
        inboxId: email.inboxId,
        senderLabel: email.senderLabel,
        senderAddress: email.senderAddress,
        subject: email.subject,
        preview: email.preview,
        receivedAt: email.receivedAt.toISOString(),
        difficultyLevel: email.difficultyLevel as any,
      })),
    };
  }

  private async getEmailWithAccess(
    emailId: string,
    traineeProfileId: string,
    includeRedFlags = false,
  ) {
    const email = await prisma.simulatedEmail.findUnique({
      where: { id: emailId },
      include: {
        redFlags: includeRedFlags,
        inbox: {
          include: {
            simulation: {
              include: {
                campaignItems: {
                  include: {
                    campaign: {
                      include: {
                        assignments: {
                          where: {
                            traineeProfileId,
                            assignmentStatus: {
                              in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as any,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!email) {
      throw new Error('NOT_FOUND');
    }

    const matchedItem = email.inbox.simulation.campaignItems.find(
      (item: any) =>
        item.campaign.assignments.length > 0 &&
        item.itemType === 'COMPONENT' &&
        item.componentType === 'SIMULATED_INBOX' &&
        item.availabilityStatus === 'AVAILABLE' &&
        item.simulation?.safetyStatus === 'APPROVED',
    );

    if (!matchedItem) {
      throw new Error('FORBIDDEN');
    }

    return { email, matchedItem };
  }

  async getSimulatedEmail(
    emailId: string,
    traineeProfileId: string,
  ): Promise<GetSimulatedEmailResponseDto> {
    const { email, matchedItem } = await this.getEmailWithAccess(emailId, traineeProfileId);
    const campaignAssignmentId = matchedItem.campaign.assignments[0].id;

    return {
      id: email.id,
      campaignAssignmentId,
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
      difficultyLevel: email.difficultyLevel as any,
    };
  }

  async recordInteraction(
    emailId: string,
    traineeProfileId: string,
    input: RecordSimulatedEmailInteractionRequestDto,
  ): Promise<RecordSimulatedEmailInteractionResponseDto> {
    const { email, matchedItem } = await this.getEmailWithAccess(emailId, traineeProfileId);

    const assignmentId = matchedItem.campaign.assignments[0].id;
    const itemId = matchedItem.id;

    await prisma.interactionEvent.create({
      data: {
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId: itemId,
        eventType: input.eventType as any,
        targetType: 'SIMULATED_EMAIL',
        targetId: email.id,
        simulatedEmailId: email.id,
      },
    });

    return {
      success: true,
      eventType: input.eventType as SimulatedEmailInteractionEventTypeDto,
    };
  }

  async classifyEmail(
    emailId: string,
    traineeProfileId: string,
    input: ClassifySimulatedEmailRequestDto,
  ): Promise<ClassifySimulatedEmailResponseDto> {
    const { email, matchedItem } = await this.getEmailWithAccess(emailId, traineeProfileId, true);

    const assignmentId = matchedItem.campaign.assignments[0].id;
    const itemId = matchedItem.id;

    // Prevent duplicate classifications
    const existingResponse = await prisma.emailClassificationResponse.findFirst({
      where: {
        traineeProfileId,
        simulatedEmailId: email.id,
      },
    });

    if (existingResponse) {
      throw new Error('ALREADY_CLASSIFIED');
    }

    // Validate red flags
    if (input.selectedRedFlagIds && input.selectedRedFlagIds.length > 0) {
      const validRedFlagIds = new Set(email.redFlags.map((rf: any) => rf.id));
      const invalidFlags = input.selectedRedFlagIds.filter((id) => !validRedFlagIds.has(id));
      if (invalidFlags.length > 0) {
        throw new Error('VALIDATION_ERROR');
      }
    }

    const isCorrect = email.expectedClassification === input.selectedClassification;

    const classificationResponse = await prisma.emailClassificationResponse.create({
      data: {
        traineeProfileId,
        simulatedEmailId: email.id,
        campaignAssignmentId: assignmentId,
        campaignItemId: itemId,
        selectedClassification: input.selectedClassification as any,
        freeTextReason: input.freeTextReason,
        isCorrect,
        selectedRedFlags: {
          create: input.selectedRedFlagIds?.map((redFlagId: string) => ({
            emailRedFlagId: redFlagId,
          })),
        },
      },
    });

    // Record interaction event
    await prisma.interactionEvent.create({
      data: {
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId: itemId,
        eventType: 'SIMULATED_EMAIL_CLASSIFIED',
        targetType: 'SIMULATED_EMAIL',
        targetId: email.id,
        simulatedEmailId: email.id,
        emailClassificationResponseId: classificationResponse.id,
      },
    });

    return {
      success: true,
      responseId: classificationResponse.id,
      selectedClassification: input.selectedClassification as EmailClassificationDto,
      isCorrect,
      feedback: isCorrect
        ? 'Great job! You correctly identified the email.'
        : 'Not quite. Take a closer look at the red flags.',
      redFlags: email.redFlags.map((rf: any) => ({
        id: rf.id,
        redFlagType: rf.redFlagType as any,
        label: rf.label,
        description: rf.description,
        severity: rf.severity as any,
      })),
    };
  }
}

export const simulationService = new SimulationService();
