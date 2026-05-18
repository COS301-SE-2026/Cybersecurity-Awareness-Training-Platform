import type {
  GetQuizResponseDto,
  QuizAnswerInputDto,
  GetQuizResultResponseDto,
  StartQuizAttemptResponseDto,
  SubmitQuizAttemptResponseDto,
} from '@insightful-phish/shared';
import { prisma } from '../lib/prisma.js';
import { toGetQuizResponseDto } from '../mappers/quiz.mapper.js';

export class QuizNotFoundError extends Error {
  constructor(message = 'Quiz or associated campaign item not found') {
    super(message);
    this.name = 'QuizNotFoundError';
  }
}

export class QuizForbiddenError extends Error {
  constructor(message = 'You do not have access to this quiz') {
    super(message);
    this.name = 'QuizForbiddenError';
  }
}

export class QuizAttemptConflictError extends Error {
  constructor(message = 'A submitted attempt already exists or is in invalid state') {
    super(message);
    this.name = 'QuizAttemptConflictError';
  }
}

export class QuizValidationError extends Error {
  constructor(message = 'Invalid quiz submission data') {
    super(message);
    this.name = 'QuizValidationError';
  }
}

async function getValidatedCampaignItem(
  campaignItemId: string,
  traineeProfileId: string,
  includeQuizQuestions = false,
) {
  const campaignItem = await prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
      itemType: 'COMPONENT',
      componentType: 'QUIZ',
      availabilityStatus: 'AVAILABLE',
      quizId: { not: null },
      campaign: {
        status: 'ACTIVE',
        assignments: {
          some: {
            traineeProfileId,
            assignmentStatus: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
          },
        },
      },
    },
    include: {
      campaign: {
        include: {
          assignments: {
            where: {
              traineeProfileId,
              assignmentStatus: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
            },
          },
        },
      },
      quiz: includeQuizQuestions
        ? {
            include: {
              questions: {
                include: { answerOptions: true },
              },
            },
          }
        : true,
    },
  });

  if (!campaignItem?.quiz) {
    throw new QuizNotFoundError();
  }

  if (campaignItem.campaign.assignments.length === 0) {
    throw new QuizForbiddenError();
  }

  if (campaignItem.quiz.status !== 'PUBLISHED') {
    throw new QuizForbiddenError('Quiz is not published');
  }

  return campaignItem;
}

export async function getQuizByCampaignItemId(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<GetQuizResponseDto> {
  const campaignItem = await getValidatedCampaignItem(campaignItemId, traineeProfileId, true);

  return {
    ...toGetQuizResponseDto(campaignItem.quiz as any),
    campaignItemId: campaignItem.id,
    campaignAssignmentId: campaignItem.campaign.assignments[0].id,
  };
}

export async function startQuizAttempt(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<StartQuizAttemptResponseDto> {
  const campaignItem = await getValidatedCampaignItem(campaignItemId, traineeProfileId, false);
  const assignment = campaignItem.campaign.assignments[0];

  let attempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId: campaignItem.quizId!,
      traineeProfileId,
      campaignItemId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (attempt?.status !== 'IN_PROGRESS') {
    attempt = await prisma.quizAttempt.create({
      data: {
        quizId: campaignItem.quizId!,
        traineeProfileId,
        campaignItemId,
        campaignAssignmentId: assignment.id,
        status: 'IN_PROGRESS',
      },
    });
  }

  return {
    attemptId: attempt.id,
    traineeProfileId,
    quizId: attempt.quizId,
    campaignAssignmentId: attempt.campaignAssignmentId,
    campaignItemId: attempt.campaignItemId,
    status: attempt.status as 'IN_PROGRESS',
    startedAt: attempt.startedAt.toISOString(),
  };
}

export async function submitQuizAttempt(
  attemptId: string,
  traineeProfileId: string,
  answersInput: QuizAnswerInputDto[],
): Promise<SubmitQuizAttemptResponseDto> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, traineeProfileId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { answerOptions: true },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new QuizNotFoundError('Quiz attempt not found');
  }

  if (attempt.status === 'SUBMITTED') {
    throw new QuizAttemptConflictError('This attempt has already been submitted');
  }

  const quiz = attempt.quiz;
  
  // Validate submitted question IDs (no duplicates, no unknown, no missing)
  const quizQuestionIds = new Set(quiz.questions.map((q) => q.id));
  const submittedQuestionIds = answersInput.map((a) => a.questionId);
  const uniqueSubmittedQuestionIds = new Set(submittedQuestionIds);

  if (uniqueSubmittedQuestionIds.size !== submittedQuestionIds.length) {
    throw new QuizValidationError('Duplicate question answers submitted');
  }

  for (const questionId of submittedQuestionIds) {
    if (!quizQuestionIds.has(questionId)) {
      throw new QuizValidationError(`Submitted answer for unknown question ID: ${questionId}`);
    }
  }

  if (submittedQuestionIds.length < quiz.questions.length) {
    throw new QuizValidationError('Missing answers for some quiz questions');
  }

  let totalScore = 0;
  let maxPossibleScore = 0;
  const createdAnswers: {
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    awardedPoints: number;
    responseSummary?: string;
    typedResponse?: string;
  }[] = [];

  for (const question of quiz.questions) {
    maxPossibleScore += question.points;
    const answerInput = answersInput.find((a) => a.questionId === question.id);

    if (!answerInput) {
      throw new QuizValidationError(`Missing answer for question ${question.id}`);
    }

    if (question.questionType === 'SINGLE_CHOICE' && answerInput.selectedOptionIds.length !== 1) {
      throw new QuizValidationError(`Single-choice question ${question.id} must have exactly one selected option`);
    }

    const uniqueOptionIds = new Set(answerInput.selectedOptionIds);
    if (uniqueOptionIds.size !== answerInput.selectedOptionIds.length) {
      throw new QuizValidationError(`Duplicate options selected for question ${question.id}`);
    }

    const selectedOptions = question.answerOptions.filter((opt: any) =>
      answerInput.selectedOptionIds.includes(opt.id),
    );

    if (selectedOptions.length !== answerInput.selectedOptionIds.length) {
      throw new QuizValidationError(`Invalid options selected for question ${question.id}`);
    }

    const correctOptions = question.answerOptions.filter((opt: any) => opt.isCorrect);

    // Score calculation logic for SINGLE/MULTIPLE_CHOICE (exact match)
    const isCorrect =
      correctOptions.length === selectedOptions.length &&
      correctOptions.every((opt: any) => answerInput.selectedOptionIds.includes(opt.id));

    const awardedPoints = isCorrect ? question.points : 0;
    totalScore += awardedPoints;

    createdAnswers.push({
      questionId: question.id,
      selectedOptionIds: answerInput.selectedOptionIds,
      isCorrect,
      awardedPoints,
      responseSummary: answerInput.responseSummary,
      typedResponse: answerInput.typedResponse,
    });
  }

  const scorePercentage = Math.round((totalScore / maxPossibleScore) * 100) || 0;
  const passed = scorePercentage >= quiz.passThresholdPercentage;

  await prisma.$transaction(async (tx: any) => {
    for (const answer of createdAnswers) {
      const createdAnswer = await tx.attemptAnswer.create({
        data: {
          attemptId,
          questionId: answer.questionId,
          isCorrect: answer.isCorrect,
          awardedPoints: answer.awardedPoints,
          responseSummary: answer.responseSummary,
          typedResponse: answer.typedResponse,
        },
      });

      await tx.attemptAnswerOption.createMany({
        data: answer.selectedOptionIds.map((optId: string) => ({
          attemptAnswerId: createdAnswer.id,
          answerOptionId: optId,
        })),
      });
    }

    await tx.quizResult.create({
      data: {
        attemptId,
        scorePercentage,
        passed,
      },
    });

    await tx.quizAttempt.update({
      where: { id: attemptId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  });

  return {
    success: true,
    attemptId,
    status: 'SUBMITTED',
  };
}

export async function getQuizResult(
  attemptId: string,
  traineeProfileId: string,
): Promise<GetQuizResultResponseDto> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, traineeProfileId },
    include: {
      quizResult: true,
      quiz: true,
      answers: {
        include: {
          selectedOptions: {
            include: { answerOption: true },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new QuizNotFoundError('Quiz attempt not found');
  }

  if (attempt.status !== 'SUBMITTED' || !attempt.quizResult) {
    throw new QuizForbiddenError('Results are not available until the attempt is submitted');
  }

  return {
    attemptId: attempt.id,
    quizId: attempt.quizId,
    campaignAssignmentId: attempt.campaignAssignmentId,
    campaignItemId: attempt.campaignItemId,
    scorePercentage: attempt.quizResult.scorePercentage,
    passed: attempt.quizResult.passed,
    summary: attempt.quizResult.summary,
    answers: attempt.answers.map((answer: any) => ({
      questionId: answer.questionId,
      isCorrect: answer.isCorrect,
      awardedPoints: answer.awardedPoints,
      feedbackShown: answer.feedbackShown,
      selectedOptions: answer.selectedOptions.map((sel: any) => ({
        optionId: sel.answerOption.id,
        label: sel.answerOption.label,
        text: sel.answerOption.text,
        isCorrect: sel.answerOption.isCorrect,
        feedbackText: sel.answerOption.feedbackText,
      })),
    })),
  };
}
