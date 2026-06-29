import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/lib/prisma.js';
import {
  UserType,
  AuthStatus,
  TraineeStatus,
  GeneralTraineeAccessSource,
  OrganisationUserStatus,
  OrganisationStatus,
  CampaignType,
  DifficultyLevel,
  CampaignStatus,
  CampaignItemType,
  CampaignItemAvailabilityStatus,
  AssignmentStatus,
  CampaignAccessType,
  TrainingContentType,
  TrainingDocumentStatus,
  QuizStatus,
  SimulationType,
  SafetyStatus,
  InboxStatus,
  EmailClassification,
  EmailRedFlagType,
  RedFlagSeverity,
  QuestionType,
} from '../../src/generated/prisma/enums.js';
import type {
  CampaignComponentType,
  CampaignGroupType,
  CompletionRule,
} from '../../src/generated/prisma/enums.js';

// Pre-hashed scrypt password hash for speed (corresponds to "password")
const precalculatedHash = [
  'scrypt$16384$8$1$fe5b63f10eb85027cc0bb85210efc592$',
  '2b8c42c34456dc85c1cb018557067b2b1ea06e5a39e9a9a3a5892cc3e67899c34e7cf0ff478844589efff6c517d8fc08ca9f4ef12caf413b799d15978b0ce3ba',
].join('');

let emailCounter = 0;
let orgCounter = 0;
let campaignCounter = 0;
let itemCounter = 0;

/**
 * Generates a unique email address for testing.
 */
export function generateTestEmail(prefix = 'test-user'): string {
  emailCounter += 1;
  return `${prefix}-${emailCounter}-${randomUUID().slice(0, 8)}@example.com`.toLowerCase();
}

/**
 * Creates a new Organisation record.
 */
export async function createOrganisation(
  overrides: {
    id?: string;
    name?: string;
    status?: OrganisationStatus;
  } = {},
) {
  orgCounter += 1;
  const id = overrides.id ?? randomUUID();
  const name = overrides.name ?? `Test Organisation ${orgCounter} ${randomUUID().slice(0, 8)}`;

  return prisma.organisation.create({
    data: {
      id,
      name,
      status: overrides.status ?? OrganisationStatus.ACTIVE,
    },
  });
}

/**
 * Creates a Trainee (User and associated TraineeProfile, plus GeneralTraineeProfile or OrganisationTraineeProfile).
 */
export async function createTrainee(
  overrides: {
    user?: Partial<Parameters<typeof prisma.user.create>[0]['data']>;
    profile?: Partial<Parameters<typeof prisma.traineeProfile.create>[0]['data']>;
    generalProfile?: Partial<Parameters<typeof prisma.generalTraineeProfile.create>[0]['data']>;
    organisationProfile?: {
      organisationId: string;
      employeeLabel?: string;
      joinedAt?: Date;
      membershipStatus?: OrganisationUserStatus;
    };
  } = {},
) {
  const userId = overrides.user?.id ?? randomUUID();
  const email = overrides.user?.email ?? generateTestEmail('trainee');
  const userType = overrides.organisationProfile
    ? UserType.ORGANISATION_TRAINEE
    : UserType.GENERAL_TRAINEE;

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName: overrides.user?.firstName ?? 'Test',
      lastName: overrides.user?.lastName ?? 'Trainee',
      email,
      passwordHash: overrides.user?.passwordHash ?? precalculatedHash,
      userType,
      authStatus: overrides.user?.authStatus ?? AuthStatus.ACTIVE,
    },
  });

  const profileId = overrides.profile?.id ?? randomUUID();
  const traineeProfile = await prisma.traineeProfile.create({
    data: {
      id: profileId,
      userId,
      traineeStatus: overrides.profile?.traineeStatus ?? TraineeStatus.ACTIVE,
    },
  });

  if (overrides.organisationProfile) {
    const organisationTraineeProfile = await prisma.organisationTraineeProfile.create({
      data: {
        id: randomUUID(),
        traineeProfileId: profileId,
        organisationId: overrides.organisationProfile.organisationId,
        employeeLabel: overrides.organisationProfile.employeeLabel ?? null,
        joinedAt: overrides.organisationProfile.joinedAt ?? new Date(),
        membershipStatus:
          overrides.organisationProfile.membershipStatus ?? OrganisationUserStatus.ACTIVE,
      },
    });

    return {
      user,
      traineeProfile,
      organisationTraineeProfile,
    };
  } else {
    const generalTraineeProfile = await prisma.generalTraineeProfile.create({
      data: {
        id: overrides.generalProfile?.id ?? randomUUID(),
        traineeProfileId: profileId,
        accessSource:
          overrides.generalProfile?.accessSource ?? GeneralTraineeAccessSource.SELF_SIGNUP,
      },
    });

    return {
      user,
      traineeProfile,
      generalTraineeProfile,
    };
  }
}

/**
 * Creates a Campaign.
 */
export async function createCampaign(
  overrides: {
    id?: string;
    organisationId?: string;
    createdByUserId?: string;
    name?: string;
    description?: string;
    campaignType?: CampaignType;
    difficultyLevel?: DifficultyLevel;
    status?: CampaignStatus;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  campaignCounter += 1;
  const id = overrides.id ?? randomUUID();
  const name = overrides.name ?? `Test Campaign ${campaignCounter} ${randomUUID().slice(0, 8)}`;

  return prisma.campaign.create({
    data: {
      id,
      organisationId: overrides.organisationId ?? null,
      createdByUserId: overrides.createdByUserId ?? null,
      name,
      description: overrides.description ?? 'Test campaign description',
      campaignType: overrides.campaignType ?? CampaignType.PREMADE_GENERAL,
      difficultyLevel: overrides.difficultyLevel ?? DifficultyLevel.BEGINNER,
      status: overrides.status ?? CampaignStatus.DRAFT,
      startDate: overrides.startDate ?? null,
      endDate: overrides.endDate ?? null,
    },
  });
}

/**
 * Creates a CampaignItem.
 */
export async function createCampaignItem(overrides: {
  id?: string;
  campaignId: string;
  parentGroupId?: string;
  itemType?: CampaignItemType;
  componentType?: CampaignComponentType;
  groupType?: CampaignGroupType;
  completionRule?: CompletionRule;
  title?: string;
  description?: string;
  position?: number;
  difficultyLevel?: DifficultyLevel;
  isRequired?: boolean;
  availabilityStatus?: CampaignItemAvailabilityStatus;
  trainingDocumentId?: string;
  quizId?: string;
  simulationId?: string;
}) {
  itemCounter += 1;
  const id = overrides.id ?? randomUUID();
  const title = overrides.title ?? `Test Campaign Item ${itemCounter} ${randomUUID().slice(0, 8)}`;

  return prisma.campaignItem.create({
    data: {
      id,
      campaignId: overrides.campaignId,
      parentGroupId: overrides.parentGroupId ?? null,
      itemType: overrides.itemType ?? CampaignItemType.COMPONENT,
      componentType: overrides.componentType ?? null,
      groupType: overrides.groupType ?? null,
      completionRule: overrides.completionRule ?? null,
      title,
      description: overrides.description ?? 'Test campaign item description',
      position: overrides.position ?? itemCounter * 10,
      difficultyLevel: overrides.difficultyLevel ?? null,
      isRequired: overrides.isRequired ?? true,
      availabilityStatus: overrides.availabilityStatus ?? CampaignItemAvailabilityStatus.AVAILABLE,
      trainingDocumentId: overrides.trainingDocumentId ?? null,
      quizId: overrides.quizId ?? null,
      simulationId: overrides.simulationId ?? null,
    },
  });
}

/**
 * Creates a CampaignAssignment.
 */
export async function createCampaignAssignment(overrides: {
  id?: string;
  campaignId: string;
  traineeProfileId: string;
  assignedByUserId?: string;
  currentCampaignItemId?: string;
  assignedAt?: Date;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  assignmentStatus?: AssignmentStatus;
  accessType?: CampaignAccessType;
}) {
  const id = overrides.id ?? randomUUID();

  return prisma.campaignAssignment.create({
    data: {
      id,
      campaignId: overrides.campaignId,
      traineeProfileId: overrides.traineeProfileId,
      assignedByUserId: overrides.assignedByUserId ?? null,
      currentCampaignItemId: overrides.currentCampaignItemId ?? null,
      assignedAt: overrides.assignedAt ?? new Date(),
      dueDate: overrides.dueDate ?? null,
      startedAt: overrides.startedAt ?? null,
      completedAt: overrides.completedAt ?? null,
      assignmentStatus: overrides.assignmentStatus ?? AssignmentStatus.ASSIGNED,
      accessType: overrides.accessType ?? CampaignAccessType.ASSIGNED,
    },
  });
}

/**
 * Creates a TrainingDocument.
 */
export async function createTrainingDocument(
  overrides: {
    id?: string;
    createdByUserId?: string;
    title?: string;
    contentType?: TrainingContentType;
    contentRef?: string;
    contentSummary?: string;
    estimatedReadTimeMinutes?: number;
    difficultyLevel?: DifficultyLevel;
    status?: TrainingDocumentStatus;
  } = {},
) {
  const id = overrides.id ?? randomUUID();
  const title = overrides.title ?? `Test Training Document ${randomUUID().slice(0, 8)}`;

  return prisma.trainingDocument.create({
    data: {
      id,
      createdByUserId: overrides.createdByUserId ?? null,
      title,
      contentType: overrides.contentType ?? TrainingContentType.HTML,
      contentRef: overrides.contentRef ?? `test://training/${id}`,
      contentSummary: overrides.contentSummary ?? 'Test content summary',
      estimatedReadTimeMinutes: overrides.estimatedReadTimeMinutes ?? 5,
      difficultyLevel: overrides.difficultyLevel ?? DifficultyLevel.BEGINNER,
      status: overrides.status ?? TrainingDocumentStatus.AVAILABLE,
    },
  });
}

/**
 * Creates a Quiz.
 */
export async function createQuiz(
  overrides: {
    id?: string;
    createdByUserId?: string;
    title?: string;
    description?: string;
    passThresholdPercentage?: number;
    difficultyLevel?: DifficultyLevel;
    status?: QuizStatus;
  } = {},
) {
  const id = overrides.id ?? randomUUID();
  const title = overrides.title ?? `Test Quiz ${randomUUID().slice(0, 8)}`;

  return prisma.quiz.create({
    data: {
      id,
      createdByUserId: overrides.createdByUserId ?? null,
      title,
      description: overrides.description ?? 'Test quiz description',
      passThresholdPercentage: overrides.passThresholdPercentage ?? 80,
      difficultyLevel: overrides.difficultyLevel ?? DifficultyLevel.BEGINNER,
      status: overrides.status ?? QuizStatus.PUBLISHED,
    },
  });
}

/**
 * Creates a Simulation.
 */
export async function createSimulation(
  overrides: {
    id?: string;
    createdByUserId?: string;
    simulationType?: SimulationType;
    title?: string;
    description?: string;
    objective?: string;
    safetyStatus?: SafetyStatus;
    difficultyLevel?: DifficultyLevel;
  } = {},
) {
  const id = overrides.id ?? randomUUID();
  const title = overrides.title ?? `Test Simulation ${randomUUID().slice(0, 8)}`;

  return prisma.simulation.create({
    data: {
      id,
      createdByUserId: overrides.createdByUserId ?? null,
      simulationType: overrides.simulationType ?? SimulationType.SIMULATED_INBOX,
      title,
      description: overrides.description ?? 'Test simulation description',
      objective: overrides.objective ?? 'Test simulation objective',
      safetyStatus: overrides.safetyStatus ?? SafetyStatus.APPROVED,
      difficultyLevel: overrides.difficultyLevel ?? DifficultyLevel.BEGINNER,
    },
  });
}

/**
 * Creates a SimulatedInbox.
 */
export async function createSimulatedInbox(overrides: {
  id?: string;
  simulationId: string;
  title?: string;
  description?: string;
  status?: InboxStatus;
}) {
  const id = overrides.id ?? randomUUID();
  const title = overrides.title ?? `Test Simulated Inbox ${randomUUID().slice(0, 8)}`;

  return prisma.simulatedInbox.create({
    data: {
      id,
      simulationId: overrides.simulationId,
      title,
      description: overrides.description ?? 'Test simulated inbox description',
      status: overrides.status ?? InboxStatus.ACTIVE,
    },
  });
}

/**
 * Creates a SimulatedEmail.
 */
export async function createSimulatedEmail(overrides: {
  id?: string;
  inboxId: string;
  senderLabel?: string;
  senderAddress?: string;
  subject?: string;
  preview?: string;
  bodyHtml?: string;
  simulatedLinkTarget?: string;
  hasAttachment?: boolean;
  receivedAt?: Date;
  expectedClassification?: EmailClassification;
  difficultyLevel?: DifficultyLevel;
}) {
  const id = overrides.id ?? randomUUID();

  return prisma.simulatedEmail.create({
    data: {
      id,
      inboxId: overrides.inboxId,
      senderLabel: overrides.senderLabel ?? 'Test Sender',
      senderAddress: overrides.senderAddress ?? 'sender@test.com',
      subject: overrides.subject ?? 'Test Subject',
      preview: overrides.preview ?? 'Test Preview',
      bodyHtml: overrides.bodyHtml ?? '<p>Test Body</p>',
      simulatedLinkTarget: overrides.simulatedLinkTarget ?? null,
      hasAttachment: overrides.hasAttachment ?? false,
      receivedAt: overrides.receivedAt ?? new Date(),
      expectedClassification: overrides.expectedClassification ?? EmailClassification.SAFE,
      difficultyLevel: overrides.difficultyLevel ?? DifficultyLevel.BEGINNER,
    },
  });
}

/**
 * Creates an EmailRedFlag.
 */
export async function createEmailRedFlag(overrides: {
  id?: string;
  simulatedEmailId: string;
  redFlagType?: EmailRedFlagType;
  label?: string;
  description?: string;
  severity?: RedFlagSeverity;
}) {
  const id = overrides.id ?? randomUUID();

  return prisma.emailRedFlag.create({
    data: {
      id,
      simulatedEmailId: overrides.simulatedEmailId,
      redFlagType: overrides.redFlagType ?? EmailRedFlagType.LANGUAGE,
      label: overrides.label ?? 'Test Red Flag',
      description: overrides.description ?? 'Test red flag description',
      severity: overrides.severity ?? RedFlagSeverity.MEDIUM,
    },
  });
}

/**
 * Creates a QuizQuestion.
 */
export async function createQuizQuestion(overrides: {
  id?: string;
  quizId: string;
  prompt?: string;
  questionType?: QuestionType;
  position: number;
  points?: number;
  shuffleOptions?: boolean;
}) {
  const id = overrides.id ?? randomUUID();

  return prisma.quizQuestion.create({
    data: {
      id,
      quizId: overrides.quizId,
      prompt: overrides.prompt ?? 'Test prompt',
      questionType: overrides.questionType ?? QuestionType.SINGLE_CHOICE,
      position: overrides.position,
      points: overrides.points ?? 1,
      shuffleOptions: overrides.shuffleOptions ?? false,
    },
  });
}

/**
 * Creates an AnswerOption.
 */
export async function createAnswerOption(overrides: {
  id?: string;
  questionId: string;
  label?: string;
  text?: string;
  isCorrect?: boolean;
  position: number;
  feedbackText?: string;
}) {
  const id = overrides.id ?? randomUUID();

  return prisma.answerOption.create({
    data: {
      id,
      questionId: overrides.questionId,
      label: overrides.label ?? 'A',
      text: overrides.text ?? 'Test option text',
      isCorrect: overrides.isCorrect ?? false,
      position: overrides.position,
      feedbackText: overrides.feedbackText ?? 'Feedback text',
    },
  });
}
