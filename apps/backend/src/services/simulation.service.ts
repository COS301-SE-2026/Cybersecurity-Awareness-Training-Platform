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

  async getSimulatedInbox(campaignItemId: string, traineeProfileId: string): Promise<GetSimulatedInboxResponseDto> {
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
              where: { traineeProfileId },
            },
          },
        },
      },
    });

    if (!campaignItem || !campaignItem.simulation || !campaignItem.simulation.simulatedInbox) {
      throw new Error('NOT_FOUND');
    }

    if (campaignItem.campaign.assignments.length === 0) {
      throw new Error('FORBIDDEN');
    }

    const campaignAssignmentId = campaignItem.campaign.assignments[0].id;

    return {
      emails: campaignItem.simulation.simulatedInbox.emails.map((email) => ({
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

  async getSimulatedEmail(emailId: string, traineeProfileId: string): Promise<GetSimulatedEmailResponseDto> {
    const email = await prisma.simulatedEmail.findUnique({
      where: { id: emailId },
      include: {
        inbox: {
          include: {
            simulation: {
              include: {
                campaignItems: {
                  include: {
                    campaign: {
                      include: {
                        assignments: {
                          where: { traineeProfileId },
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

    const campaignItem = email.inbox.simulation.campaignItems.find(
      (item) => item.campaign.assignments.length > 0
    );

    if (!campaignItem) {
      throw new Error('FORBIDDEN');
    }

    const campaignAssignmentId = campaignItem.campaign.assignments[0].id;

    return {
      id: email.id,
      campaignAssignmentId,
      campaignItemId: campaignItem.id,
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
    input: RecordSimulatedEmailInteractionRequestDto
  ): Promise<RecordSimulatedEmailInteractionResponseDto> {
    const email = await prisma.simulatedEmail.findUnique({
      where: { id: emailId },
      include: {
        inbox: {
          include: {
            simulation: {
              include: {
                campaignItems: {
                  include: {
                    campaign: {
                      include: {
                        assignments: {
                          where: { traineeProfileId },
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
      (item) => item.campaign.assignments.length > 0
    );

    if (!matchedItem) {
      throw new Error('FORBIDDEN');
    }

    const assignmentId = input.campaignAssignmentId || matchedItem.campaign.assignments[0].id;
    const itemId = input.campaignItemId || matchedItem.id;

    await prisma.interactionEvent.create({
      data: {
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId: itemId,
        eventType: input.eventType as any,
        targetType: 'SIMULATED_EMAIL',
        targetId: emailId,
        simulatedEmailId: emailId,
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
    input: ClassifySimulatedEmailRequestDto
  ): Promise<ClassifySimulatedEmailResponseDto> {
    const email = await prisma.simulatedEmail.findUnique({
      where: { id: emailId },
      include: {
        redFlags: true,
        inbox: {
          include: {
            simulation: {
              include: {
                campaignItems: {
                  include: {
                    campaign: {
                      include: {
                        assignments: {
                          where: { traineeProfileId },
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
      (item) => item.campaign.assignments.length > 0
    );

    if (!matchedItem) {
      throw new Error('FORBIDDEN');
    }

    const assignmentId = input.campaignAssignmentId || matchedItem.campaign.assignments[0].id;
    const itemId = input.campaignItemId || matchedItem.id;

    const isCorrect = email.expectedClassification === input.selectedClassification;

    const classificationResponse = await prisma.emailClassificationResponse.create({
      data: {
        traineeProfileId,
        simulatedEmailId: emailId,
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
        targetId: emailId,
        simulatedEmailId: emailId,
        emailClassificationResponseId: classificationResponse.id,
      },
    });

    return {
      success: true,
      responseId: classificationResponse.id,
      selectedClassification: input.selectedClassification as EmailClassificationDto,
      isCorrect,
      feedback: isCorrect ? 'Great job! You correctly identified the email.' : 'Not quite. Take a closer look at the red flags.',
      redFlags: email.redFlags.map((rf) => ({
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
