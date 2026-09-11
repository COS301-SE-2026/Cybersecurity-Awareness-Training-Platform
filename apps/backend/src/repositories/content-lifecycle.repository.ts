import { prisma } from '../lib/prisma.js';
import type {
  ContentCategory,
  DifficultyLevel,
  EmailClassification,
  EmailRedFlagType,
  QuestionType,
  RedFlagSeverity,
  TrainingContentType,
} from '../generated/prisma/client.js';

export interface UpdateTrainingDocumentDraftInput {
  title?: string;
  contentType?: TrainingContentType;
  contentRef?: string;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  categories?: ContentCategory[];
  difficultyLevel?: DifficultyLevel;
}

export interface QuizQuestionInput {
  prompt: string;
  questionType?: QuestionType;
  position: number;
  points?: number;
  shuffleOptions?: boolean;
  minSelections?: number | null;
  maxSelections?: number | null;
  categories?: ContentCategory[];
  answerOptions: Array<{
    label: string;
    text: string;
    isCorrect: boolean;
    position: number;
    feedbackText?: string | null;
  }>;
}

export interface UpdateQuizDraftInput {
  title?: string;
  description?: string | null;
  passThresholdPercentage?: number;
  difficultyLevel?: DifficultyLevel;
  questions?: QuizQuestionInput[];
}

export interface SimulationEmailInput {
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview?: string | null;
  bodyHtml: string;
  simulatedLinkTarget?: string | null;
  hasAttachment?: boolean;
  receivedAt?: Date;
  expectedClassification: EmailClassification;
  categories?: ContentCategory[];
  difficultyLevel?: DifficultyLevel;
  redFlags: Array<{
    redFlagType: EmailRedFlagType;
    label: string;
    description?: string | null;
    severity?: RedFlagSeverity;
  }>;
}

export interface UpdateSimulationDraftInput {
  title?: string;
  description?: string | null;
  objective?: string | null;
  difficultyLevel?: DifficultyLevel;
  emails?: SimulationEmailInput[];
}

function isRecordNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}

async function runGuardedMutation<T>(mutation: () => Promise<T>): Promise<T | null> {
  try {
    return await mutation();
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

function copySourceOwnershipWhere(targetOrganisationId: string | null) {
  return targetOrganisationId === null
    ? { organisationId: null }
    : { OR: [{ organisationId: null }, { organisationId: targetOrganisationId }] };
}

export async function findTrainingDocumentById(id: string) {
  return prisma.trainingDocument.findUnique({
    where: { id },
  });
}

export async function updateTrainingDocumentDraft(
  id: string,
  organisationId: string | null,
  input: UpdateTrainingDocumentDraftInput,
) {
  return runGuardedMutation(() =>
    prisma.trainingDocument.update({
      where: { id, organisationId, status: 'DRAFT' },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
        ...(input.contentRef !== undefined ? { contentRef: input.contentRef } : {}),
        ...(input.contentSummary !== undefined ? { contentSummary: input.contentSummary } : {}),
        ...(input.estimatedReadTimeMinutes !== undefined
          ? { estimatedReadTimeMinutes: input.estimatedReadTimeMinutes }
          : {}),
        ...(input.categories !== undefined ? { categories: input.categories } : {}),
        ...(input.difficultyLevel !== undefined ? { difficultyLevel: input.difficultyLevel } : {}),
      },
    }),
  );
}

export async function activateTrainingDocument(id: string, organisationId: string | null) {
  return runGuardedMutation(() =>
    prisma.trainingDocument.update({
      where: { id, organisationId, status: 'DRAFT' },
      data: { status: 'AVAILABLE' },
    }),
  );
}

export async function copyTrainingDocument(
  id: string,
  targetOrganisationId: string | null,
  createdByUserId?: string | null,
) {
  const source = await prisma.trainingDocument.findFirst({
    where: {
      id,
      status: 'AVAILABLE',
      ...copySourceOwnershipWhere(targetOrganisationId),
    },
  });

  if (!source) {
    return null;
  }

  return prisma.trainingDocument.create({
    data: {
      organisationId: targetOrganisationId,
      createdByUserId: createdByUserId ?? null,
      title: `${source.title} (Copy)`,
      contentType: source.contentType,
      contentRef: source.contentRef,
      contentSummary: source.contentSummary,
      estimatedReadTimeMinutes: source.estimatedReadTimeMinutes,
      categories: source.categories,
      difficultyLevel: source.difficultyLevel,
      status: 'DRAFT',
    },
  });
}

export async function findQuizById(id: string) {
  return prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: {
          answerOptions: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });
}

export async function updateQuizDraft(
  id: string,
  organisationId: string | null,
  input: UpdateQuizDraftInput,
) {
  return runGuardedMutation(() =>
    prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id, organisationId, status: 'DRAFT' },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.passThresholdPercentage !== undefined
            ? { passThresholdPercentage: input.passThresholdPercentage }
            : {}),
          ...(input.difficultyLevel !== undefined
            ? { difficultyLevel: input.difficultyLevel }
            : {}),
        },
      });

      if (input.questions !== undefined) {
        await tx.quizQuestion.deleteMany({
          where: { quizId: id },
        });

        for (const question of input.questions) {
          await tx.quizQuestion.create({
            data: {
              quizId: id,
              prompt: question.prompt,
              questionType: question.questionType ?? 'SINGLE_CHOICE',
              position: question.position,
              points: question.points ?? 1,
              shuffleOptions: question.shuffleOptions ?? false,
              minSelections: question.minSelections ?? null,
              maxSelections: question.maxSelections ?? null,
              categories: question.categories ?? [],
              answerOptions: {
                create: question.answerOptions.map((opt) => ({
                  label: opt.label,
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  position: opt.position,
                  feedbackText: opt.feedbackText ?? null,
                })),
              },
            },
          });
        }
      }

      return tx.quiz.findUniqueOrThrow({
        where: { id },
        include: {
          questions: {
            orderBy: { position: 'asc' },
            include: {
              answerOptions: {
                orderBy: { position: 'asc' },
              },
            },
          },
        },
      });
    }),
  );
}

export async function activateQuiz(id: string, organisationId: string | null) {
  return runGuardedMutation(() =>
    prisma.quiz.update({
      where: { id, organisationId, status: 'DRAFT' },
      data: { status: 'PUBLISHED' },
    }),
  );
}

export async function copyQuiz(
  id: string,
  targetOrganisationId: string | null,
  createdByUserId?: string | null,
) {
  const source = await prisma.quiz.findFirst({
    where: {
      id,
      status: 'PUBLISHED',
      ...copySourceOwnershipWhere(targetOrganisationId),
    },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: {
          answerOptions: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  if (!source) {
    return null;
  }

  return prisma.quiz.create({
    data: {
      organisationId: targetOrganisationId,
      createdByUserId: createdByUserId ?? null,
      title: `${source.title} (Copy)`,
      description: source.description,
      passThresholdPercentage: source.passThresholdPercentage,
      difficultyLevel: source.difficultyLevel,
      status: 'DRAFT',
      questions: {
        create: source.questions.map((q) => ({
          prompt: q.prompt,
          questionType: q.questionType,
          position: q.position,
          points: q.points,
          shuffleOptions: q.shuffleOptions,
          minSelections: q.minSelections,
          maxSelections: q.maxSelections,
          categories: q.categories,
          answerOptions: {
            create: q.answerOptions.map((opt) => ({
              label: opt.label,
              text: opt.text,
              isCorrect: opt.isCorrect,
              position: opt.position,
              feedbackText: opt.feedbackText,
            })),
          },
        })),
      },
    },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: {
          answerOptions: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });
}

export async function findSimulationById(id: string) {
  return prisma.simulation.findUnique({
    where: { id },
    include: {
      simulatedInbox: {
        include: {
          emails: {
            orderBy: { receivedAt: 'asc' },
            include: {
              redFlags: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  });
}

export async function updateSimulationDraft(
  id: string,
  organisationId: string | null,
  input: UpdateSimulationDraftInput,
) {
  return runGuardedMutation(() =>
    prisma.$transaction(async (tx) => {
      const simulation = await tx.simulation.update({
        where: { id, organisationId, safetyStatus: 'DRAFT' },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.objective !== undefined ? { objective: input.objective } : {}),
          ...(input.difficultyLevel !== undefined
            ? { difficultyLevel: input.difficultyLevel }
            : {}),
        },
        include: { simulatedInbox: true },
      });

      if (input.emails !== undefined && simulation.simulatedInbox) {
        await tx.simulatedEmail.deleteMany({
          where: { inboxId: simulation.simulatedInbox.id },
        });

        for (const email of input.emails) {
          await tx.simulatedEmail.create({
            data: {
              inboxId: simulation.simulatedInbox.id,
              senderLabel: email.senderLabel,
              senderAddress: email.senderAddress,
              subject: email.subject,
              preview: email.preview ?? null,
              bodyHtml: email.bodyHtml,
              simulatedLinkTarget: email.simulatedLinkTarget ?? null,
              hasAttachment: email.hasAttachment ?? false,
              ...(email.receivedAt !== undefined ? { receivedAt: email.receivedAt } : {}),
              expectedClassification: email.expectedClassification,
              categories: email.categories ?? [],
              difficultyLevel:
                email.difficultyLevel ?? input.difficultyLevel ?? simulation.difficultyLevel,
              redFlags: {
                create: email.redFlags.map((rf) => ({
                  redFlagType: rf.redFlagType,
                  label: rf.label,
                  description: rf.description ?? null,
                  severity: rf.severity ?? 'MEDIUM',
                })),
              },
            },
          });
        }
      }

      return tx.simulation.findUniqueOrThrow({
        where: { id },
        include: {
          simulatedInbox: {
            include: {
              emails: {
                orderBy: { receivedAt: 'asc' },
                include: {
                  redFlags: true,
                },
              },
            },
          },
        },
      });
    }),
  );
}

export async function activateSimulation(id: string, organisationId: string | null) {
  return runGuardedMutation(() =>
    prisma.$transaction(async (tx) => {
      const simulation = await tx.simulation.update({
        where: { id, organisationId, safetyStatus: 'DRAFT' },
        data: { safetyStatus: 'APPROVED' },
      });

      await tx.simulatedInbox.update({
        where: { simulationId: id },
        data: { status: 'ACTIVE' },
      });

      return simulation;
    }),
  );
}

export async function copySimulation(
  id: string,
  targetOrganisationId: string | null,
  createdByUserId?: string | null,
) {
  const source = await prisma.simulation.findFirst({
    where: {
      id,
      safetyStatus: 'APPROVED',
      simulatedInbox: {
        status: 'ACTIVE',
      },
      ...copySourceOwnershipWhere(targetOrganisationId),
    },
    include: {
      simulatedInbox: {
        include: {
          emails: {
            orderBy: { receivedAt: 'asc' },
            include: {
              redFlags: true,
            },
          },
        },
      },
    },
  });

  if (!source) {
    return null;
  }

  return prisma.simulation.create({
    data: {
      organisationId: targetOrganisationId,
      createdByUserId: createdByUserId ?? null,
      simulationType: source.simulationType,
      title: `${source.title} (Copy)`,
      description: source.description,
      objective: source.objective,
      difficultyLevel: source.difficultyLevel,
      safetyStatus: 'DRAFT',
      simulatedInbox: source.simulatedInbox
        ? {
            create: {
              title: source.simulatedInbox.title,
              description: source.simulatedInbox.description,
              status: 'ARCHIVED',
              emails: {
                create: source.simulatedInbox.emails.map((email) => ({
                  senderLabel: email.senderLabel,
                  senderAddress: email.senderAddress,
                  subject: email.subject,
                  preview: email.preview,
                  bodyHtml: email.bodyHtml,
                  simulatedLinkTarget: email.simulatedLinkTarget,
                  hasAttachment: email.hasAttachment,
                  receivedAt: email.receivedAt,
                  expectedClassification: email.expectedClassification,
                  categories: email.categories,
                  difficultyLevel: email.difficultyLevel,
                  redFlags: {
                    create: email.redFlags.map((rf) => ({
                      redFlagType: rf.redFlagType,
                      label: rf.label,
                      description: rf.description,
                      severity: rf.severity,
                    })),
                  },
                })),
              },
            },
          }
        : undefined,
    },
    include: {
      simulatedInbox: {
        include: {
          emails: {
            include: {
              redFlags: true,
            },
          },
        },
      },
    },
  });
}
