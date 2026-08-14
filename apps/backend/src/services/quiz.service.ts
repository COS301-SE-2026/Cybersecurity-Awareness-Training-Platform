import type {
  GetQuizResponseDto,
  QuizAnswerInputDto,
  GetQuizResultResponseDto,
  StartQuizAttemptResponseDto,
  SubmitQuizAttemptResponseDto,
} from '@insightful-phish/shared';
import { toGetQuizResponseDto } from '../mappers/quiz.mapper.js';
import * as QuizRepository from '../repositories/quiz.repository.js';
import { defaultCampaignEligibilityService } from './campaign-eligibility.service.js';

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

export async function getActiveTraineeProfileId(userId?: string) {
  if (!userId) return null;
  const profile = await QuizRepository.findActiveTraineeProfileByUserId(userId);
  return profile?.id ?? null;
}

async function getValidatedCampaignItem(campaignItemId: string, traineeProfileId: string) {
  const campaignItem = await QuizRepository.findQuizCampaignItem(campaignItemId, traineeProfileId);

  if (!campaignItem?.quiz) {
    throw new QuizNotFoundError();
  }

  if (campaignItem.campaign?.assignments?.length === 0) {
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
  const campaignItem = await getValidatedCampaignItem(campaignItemId, traineeProfileId);

  const campaign = campaignItem.campaign ?? { status: 'ACTIVE', campaignType: 'PREMADE_GENERAL' };
  const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(campaign);
  if (!eligibility.canView) {
    throw new QuizForbiddenError('Campaign is not viewable');
  }

  const campaignAssignmentId = campaignItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';

  return {
    ...toGetQuizResponseDto(
      campaignItem.quiz as unknown as Parameters<typeof toGetQuizResponseDto>[0],
    ),
    campaignItemId: campaignItem.id,
    campaignAssignmentId,
  };
}

export async function startQuizAttempt(
  campaignItemId: string,
  traineeProfileId: string,
): Promise<StartQuizAttemptResponseDto> {
  const campaignItem = await getValidatedCampaignItem(campaignItemId, traineeProfileId);

  const campaign = campaignItem.campaign ?? { status: 'ACTIVE', campaignType: 'PREMADE_GENERAL' };
  const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(campaign);
  defaultCampaignEligibilityService.assertCanProgress(eligibility);

  const assignmentId = campaignItem.campaign?.assignments?.[0]?.id ?? 'assignment-id';

  let attempt = await QuizRepository.findLatestQuizAttempt({
    quizId: campaignItem.quizId!,
    traineeProfileId,
    campaignItemId,
  });

  if (attempt?.status !== 'IN_PROGRESS') {
    attempt = await QuizRepository.createQuizAttempt({
      quizId: campaignItem.quizId!,
      traineeProfileId,
      campaignItemId,
      campaignAssignmentId: assignmentId,
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
  const attempt = await QuizRepository.findQuizAttemptWithQuiz(attemptId, traineeProfileId);

  if (!attempt) {
    throw new QuizNotFoundError('Quiz attempt not found');
  }

  const campaign = (
    attempt as {
      campaignItem?: { campaign?: unknown };
      campaignAssignment?: { campaign?: unknown };
    }
  ).campaignItem?.campaign ??
    (attempt as { campaignAssignment?: { campaign?: unknown } }).campaignAssignment?.campaign ?? {
      status: 'ACTIVE',
      campaignType: 'PREMADE_GENERAL',
    };
  const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
    campaign as Parameters<typeof defaultCampaignEligibilityService.evaluateCampaignEligibility>[0],
  );
  defaultCampaignEligibilityService.assertCanProgress(eligibility);

  if (attempt.status === 'SUBMITTED') {
    throw new QuizAttemptConflictError('This attempt has already been submitted');
  }

  const quiz = attempt.quiz;

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
      throw new QuizValidationError(
        `Single-choice question ${question.id} must have exactly one selected option`,
      );
    }

    if (question.questionType === 'MULTIPLE_CHOICE') {
      const count = answerInput.selectedOptionIds.length;
      const min = (question as { minSelections?: number | null }).minSelections;
      const max = (question as { maxSelections?: number | null }).maxSelections;
      if (min !== null && min !== undefined && count < min) {
        throw new QuizValidationError(
          `Multiple-choice question ${question.id} requires at least ${min} selected option(s)`,
        );
      }
      if (max !== null && max !== undefined && count > max) {
        throw new QuizValidationError(
          `Multiple-choice question ${question.id} allows at most ${max} selected option(s)`,
        );
      }
    }

    const uniqueOptionIds = new Set(answerInput.selectedOptionIds);
    if (uniqueOptionIds.size !== answerInput.selectedOptionIds.length) {
      throw new QuizValidationError(`Duplicate options selected for question ${question.id}`);
    }

    const selectedOptions = question.answerOptions.filter((opt: { id: string }) =>
      answerInput.selectedOptionIds.includes(opt.id),
    );

    if (selectedOptions.length !== answerInput.selectedOptionIds.length) {
      throw new QuizValidationError(`Invalid options selected for question ${question.id}`);
    }

    const correctOptions = question.answerOptions.filter(
      (opt: { isCorrect?: boolean }) => opt.isCorrect,
    );

    const isCorrect =
      correctOptions.length === selectedOptions.length &&
      correctOptions.every((opt: { id: string }) => answerInput.selectedOptionIds.includes(opt.id));

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

  await QuizRepository.saveSubmittedQuizAttemptTx({
    attemptId,
    scorePercentage,
    passed,
    createdAnswers,
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
  const attempt = await QuizRepository.findQuizResultByAttemptId(attemptId, traineeProfileId);

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
    answers: attempt.answers.map((answer: (typeof attempt.answers)[0]) => ({
      questionId: answer.questionId,
      isCorrect: answer.isCorrect,
      awardedPoints: answer.awardedPoints,
      feedbackShown: answer.feedbackShown ?? null,
      selectedOptions: answer.selectedOptions.map((sel: (typeof answer.selectedOptions)[0]) => ({
        optionId: sel.answerOption.id,
        label: sel.answerOption.label,
        text: sel.answerOption.text,
        isCorrect: sel.answerOption.isCorrect ?? false,
        feedbackText: sel.answerOption.feedbackText,
      })),
    })),
  };
}
