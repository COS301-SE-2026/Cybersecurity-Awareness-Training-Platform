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

export async function getQuizByCampaignItemId(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<GetQuizResponseDto> {
  const campaignItem = await prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
      quizId: { not: null },
    },
    include: {
      campaign: {
        include: {
          assignments: {
            where: { traineeProfileId },
          },
        },
      },
      quiz: {
        include: {
          questions: {
            include: { answerOptions: true },
          },
        },
      },
    },
  });

  if (!campaignItem || !campaignItem.quiz) {
    throw new QuizNotFoundError();
  }

  if (campaignItem.campaign.assignments.length === 0) {
    throw new QuizForbiddenError();
  }

  return {
    ...toGetQuizResponseDto(campaignItem.quiz),
    campaignItemId: campaignItem.id,
    campaignAssignmentId: campaignItem.campaign.assignments[0].id,
  };
}

export async function startQuizAttempt(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<StartQuizAttemptResponseDto> {
  const campaignItem = await prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
      quizId: { not: null },
    },
    include: {
      campaign: {
        include: {
          assignments: {
            where: { traineeProfileId },
          },
        },
      },
    },
  });

  if (!campaignItem || !campaignItem.quizId) {
    throw new QuizNotFoundError();
  }

  if (campaignItem.campaign.assignments.length === 0) {
    throw new QuizForbiddenError();
  }

  const assignment = campaignItem.campaign.assignments[0];

  let attempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId: campaignItem.quizId,
      traineeProfileId,
      campaignItemId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!attempt || attempt.status !== 'IN_PROGRESS') {
    attempt = await prisma.quizAttempt.create({
      data: {
        quizId: campaignItem.quizId,
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

    const selectedOptions = question.answerOptions.filter((opt: any) =>
      answerInput.selectedOptionIds.includes(opt.id),
    );

    if (selectedOptions.length === 0) {
      throw new QuizValidationError(`No valid options selected for question ${question.id}`);
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
