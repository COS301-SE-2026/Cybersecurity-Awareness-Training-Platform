import { prisma } from '../../src/lib/prisma.js';
import type { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';
import {
  DEMO_SEED_CAMPAIGN,
  DEMO_SEED_CAMPAIGN_ASSIGNMENT,
  DEMO_SEED_CAMPAIGN_ITEMS,
  DEMO_SEED_CREDENTIALS,
  DEMO_SEED_IDS,
  DEMO_SEED_QUIZZES,
  DEMO_SEED_SIMULATED_EMAILS,
  DEMO_SEED_SIMULATED_INBOX,
  DEMO_SEED_SIMULATION,
  DEMO_SEED_TRAINEE_PROFILES,
  DEMO_SEED_TRAINING_DOCUMENTS,
  DEMO_SEED_USERS,
  getDemoSeedPassword,
} from './demoSeedConfig.js';
import { hashDemoPassword } from './demoSeedHelpers.js';

type DemoSeedTransaction = Prisma.TransactionClient;

export type DemoSeedSummary = {
  readonly version: string;
  readonly users: ReadonlyArray<{
    readonly label: string;
    readonly email: string;
    readonly role: string;
  }>;
  readonly campaign: {
    readonly name: string;
    readonly itemCount: number;
    readonly assignedTraineeEmail: string;
  };
  readonly content: {
    readonly trainingDocumentCount: number;
    readonly quizCount: number;
    readonly quizQuestionCount: number;
    readonly answerOptionCount: number;
    readonly simulatedEmailCount: number;
    readonly redFlagCount: number;
  };
};

const DEMO_USER_IDS = Object.values(DEMO_SEED_IDS.users);
const DEMO_USER_EMAILS = Object.values(DEMO_SEED_CREDENTIALS).map(
  (credentials) => credentials.email,
);
const DEMO_TRAINEE_PROFILE_IDS = Object.values(DEMO_SEED_IDS.traineeProfiles);
const DEMO_GENERAL_TRAINEE_PROFILE_IDS = Object.values(DEMO_SEED_IDS.generalTraineeProfiles);
const DEMO_CAMPAIGN_ITEM_IDS = Object.values(DEMO_SEED_IDS.campaignItems);
const DEMO_TRAINING_DOCUMENT_IDS = Object.values(DEMO_SEED_IDS.trainingDocuments);
const DEMO_QUIZ_IDS = Object.values(DEMO_SEED_IDS.quizzes);
const DEMO_QUIZ_QUESTION_IDS = Object.values(DEMO_SEED_IDS.quizQuestions);
const DEMO_ANSWER_OPTION_IDS = Object.values(DEMO_SEED_IDS.answerOptions);
const DEMO_SIMULATED_EMAIL_IDS = Object.values(DEMO_SEED_IDS.simulatedEmails);
const DEMO_RED_FLAG_IDS = Object.values(DEMO_SEED_IDS.redFlags);

export async function seedDemoCore(client: PrismaClient = prisma): Promise<DemoSeedSummary> {
  const passwordHash = await hashDemoPassword(getDemoSeedPassword());

  await client.$transaction(async (tx) => {
    await deleteDemoCore(tx);
    await createDemoCore(tx, passwordHash);
  });

  return buildDemoSeedSummary();
}

export function buildDemoSeedSummary(): DemoSeedSummary {
  return {
    version: 'Demo 1',
    users: [
      {
        label: 'Populated trainee',
        email: DEMO_SEED_CREDENTIALS.populatedTrainee.email,
        role: DEMO_SEED_USERS.populatedTrainee.userType,
      },
      {
        label: 'Empty-state trainee',
        email: DEMO_SEED_CREDENTIALS.emptyStateTrainee.email,
        role: DEMO_SEED_USERS.emptyStateTrainee.userType,
      },
      {
        label: 'Demo admin',
        email: DEMO_SEED_CREDENTIALS.admin.email,
        role: DEMO_SEED_USERS.admin.userType,
      },
    ],
    campaign: {
      name: DEMO_SEED_CAMPAIGN.name,
      itemCount: DEMO_SEED_CAMPAIGN_ITEMS.length,
      assignedTraineeEmail: DEMO_SEED_CREDENTIALS.populatedTrainee.email,
    },
    content: {
      trainingDocumentCount: DEMO_SEED_TRAINING_DOCUMENTS.length,
      quizCount: DEMO_SEED_QUIZZES.length,
      quizQuestionCount: DEMO_SEED_QUIZZES.reduce(
        (count, quiz) => count + quiz.questions.length,
        0,
      ),
      answerOptionCount: DEMO_SEED_QUIZZES.reduce(
        (count, quiz) =>
          count +
          quiz.questions.reduce(
            (questionCount, question) => questionCount + question.answerOptions.length,
            0,
          ),
        0,
      ),
      simulatedEmailCount: DEMO_SEED_SIMULATED_EMAILS.length,
      redFlagCount: DEMO_SEED_SIMULATED_EMAILS.reduce(
        (count, email) => count + email.redFlags.length,
        0,
      ),
    },
  };
}

async function deleteDemoCore(tx: DemoSeedTransaction): Promise<void> {
  await tx.campaignAssignment.deleteMany({
    where: {
      OR: [
        { id: DEMO_SEED_IDS.campaignAssignments.populatedTrainee },
        { campaignId: DEMO_SEED_IDS.campaign },
        {
          traineeProfileId: {
            in: DEMO_TRAINEE_PROFILE_IDS,
          },
        },
      ],
    },
  });

  await tx.campaignItem.deleteMany({
    where: {
      OR: [{ id: { in: DEMO_CAMPAIGN_ITEM_IDS } }, { campaignId: DEMO_SEED_IDS.campaign }],
    },
  });

  await tx.campaign.deleteMany({
    where: {
      id: DEMO_SEED_IDS.campaign,
    },
  });

  await tx.emailRedFlag.deleteMany({
    where: {
      id: {
        in: DEMO_RED_FLAG_IDS,
      },
    },
  });

  await tx.simulatedEmail.deleteMany({
    where: {
      id: {
        in: DEMO_SIMULATED_EMAIL_IDS,
      },
    },
  });

  await tx.simulatedInbox.deleteMany({
    where: {
      id: DEMO_SEED_IDS.simulatedInbox,
    },
  });

  await tx.simulation.deleteMany({
    where: {
      id: DEMO_SEED_IDS.simulation,
    },
  });

  await tx.answerOption.deleteMany({
    where: {
      id: {
        in: DEMO_ANSWER_OPTION_IDS,
      },
    },
  });

  await tx.quizQuestion.deleteMany({
    where: {
      id: {
        in: DEMO_QUIZ_QUESTION_IDS,
      },
    },
  });

  await tx.quiz.deleteMany({
    where: {
      id: {
        in: DEMO_QUIZ_IDS,
      },
    },
  });

  await tx.trainingDocument.deleteMany({
    where: {
      id: {
        in: DEMO_TRAINING_DOCUMENT_IDS,
      },
    },
  });

  await tx.generalTraineeProfile.deleteMany({
    where: {
      id: {
        in: DEMO_GENERAL_TRAINEE_PROFILE_IDS,
      },
    },
  });

  await tx.traineeProfile.deleteMany({
    where: {
      id: {
        in: DEMO_TRAINEE_PROFILE_IDS,
      },
    },
  });

  await tx.ipAdminProfile.deleteMany({
    where: {
      id: DEMO_SEED_IDS.ipAdminProfile,
    },
  });

  await tx.user.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: DEMO_USER_IDS,
          },
        },
        {
          email: {
            in: DEMO_USER_EMAILS,
          },
        },
      ],
    },
  });
}

async function createDemoCore(tx: DemoSeedTransaction, passwordHash: string): Promise<void> {
  await createDemoUsers(tx, passwordHash);
  await createDemoProfiles(tx);
  await createDemoContent(tx);
  await createDemoCampaign(tx);
  await createDemoCampaignItems(tx);
  await createDemoCampaignAssignment(tx);
}

async function createDemoUsers(tx: DemoSeedTransaction, passwordHash: string): Promise<void> {
  for (const user of Object.values(DEMO_SEED_USERS)) {
    await tx.user.create({
      data: {
        ...user,
        passwordHash,
      },
    });
  }
}

async function createDemoProfiles(tx: DemoSeedTransaction): Promise<void> {
  await tx.traineeProfile.create({
    data: {
      id: DEMO_SEED_TRAINEE_PROFILES.populated.id,
      userId: DEMO_SEED_TRAINEE_PROFILES.populated.userId,
      traineeStatus: DEMO_SEED_TRAINEE_PROFILES.populated.traineeStatus,
    },
  });

  await tx.generalTraineeProfile.create({
    data: {
      id: DEMO_SEED_IDS.generalTraineeProfiles.populated,
      traineeProfileId: DEMO_SEED_TRAINEE_PROFILES.populated.id,
      accessSource: DEMO_SEED_TRAINEE_PROFILES.populated.accessSource,
    },
  });

  await tx.traineeProfile.create({
    data: {
      id: DEMO_SEED_TRAINEE_PROFILES.emptyState.id,
      userId: DEMO_SEED_TRAINEE_PROFILES.emptyState.userId,
      traineeStatus: DEMO_SEED_TRAINEE_PROFILES.emptyState.traineeStatus,
    },
  });

  await tx.generalTraineeProfile.create({
    data: {
      id: DEMO_SEED_IDS.generalTraineeProfiles.emptyState,
      traineeProfileId: DEMO_SEED_TRAINEE_PROFILES.emptyState.id,
      accessSource: DEMO_SEED_TRAINEE_PROFILES.emptyState.accessSource,
    },
  });

  await tx.ipAdminProfile.create({
    data: {
      id: DEMO_SEED_IDS.ipAdminProfile,
      userId: DEMO_SEED_IDS.users.admin,
    },
  });
}

async function createDemoCampaign(tx: DemoSeedTransaction): Promise<void> {
  await tx.campaign.create({
    data: DEMO_SEED_CAMPAIGN,
  });
}

async function createDemoContent(tx: DemoSeedTransaction): Promise<void> {
  await createDemoTrainingDocuments(tx);
  await createDemoQuizzes(tx);
  await createDemoSimulation(tx);
}

async function createDemoTrainingDocuments(tx: DemoSeedTransaction): Promise<void> {
  for (const document of DEMO_SEED_TRAINING_DOCUMENTS) {
    await tx.trainingDocument.create({
      data: document,
    });
  }
}

async function createDemoQuizzes(tx: DemoSeedTransaction): Promise<void> {
  for (const quiz of DEMO_SEED_QUIZZES) {
    const { questions, ...quizData } = quiz;

    await tx.quiz.create({
      data: quizData,
    });

    for (const question of questions) {
      const { answerOptions, ...questionData } = question;

      await tx.quizQuestion.create({
        data: {
          ...questionData,
          quizId: quiz.id,
        },
      });

      for (const answerOption of answerOptions) {
        await tx.answerOption.create({
          data: {
            ...answerOption,
            questionId: question.id,
          },
        });
      }
    }
  }
}

async function createDemoSimulation(tx: DemoSeedTransaction): Promise<void> {
  await tx.simulation.create({
    data: DEMO_SEED_SIMULATION,
  });

  await tx.simulatedInbox.create({
    data: DEMO_SEED_SIMULATED_INBOX,
  });

  for (const email of DEMO_SEED_SIMULATED_EMAILS) {
    const { redFlags, ...emailData } = email;

    await tx.simulatedEmail.create({
      data: emailData,
    });

    for (const redFlag of redFlags) {
      await tx.emailRedFlag.create({
        data: {
          ...redFlag,
          simulatedEmailId: email.id,
        },
      });
    }
  }
}

async function createDemoCampaignItems(tx: DemoSeedTransaction): Promise<void> {
  for (const item of DEMO_SEED_CAMPAIGN_ITEMS) {
    await tx.campaignItem.create({
      data: {
        id: item.id,
        campaignId: item.campaignId,
        itemType: item.itemType,
        componentType: item.componentType,
        title: item.title,
        description: item.description,
        position: item.position,
        isRequired: item.isRequired,
        availabilityStatus: item.availabilityStatus,
        trainingDocumentId: 'trainingDocumentId' in item ? item.trainingDocumentId : undefined,
        quizId: 'quizId' in item ? item.quizId : undefined,
        simulationId: 'simulationId' in item ? item.simulationId : undefined,
      },
    });
  }
}

async function createDemoCampaignAssignment(tx: DemoSeedTransaction): Promise<void> {
  await tx.campaignAssignment.create({
    data: DEMO_SEED_CAMPAIGN_ASSIGNMENT,
  });
}
