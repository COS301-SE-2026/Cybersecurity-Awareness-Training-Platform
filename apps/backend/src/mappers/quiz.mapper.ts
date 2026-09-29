import type {
  GetQuizResponseDto,
  QuestionTypeDto,
  SafeQuizAnswerOptionDto,
  SafeQuizQuestionDto,
} from '@insightful-phish/shared';
import { createHash } from 'node:crypto';

interface AnswerOptionRecord {
  id: string;
  label: string;
  text: string;
  position: number;
}

interface QuizQuestionRecord {
  id: string;
  prompt: string;
  questionType: QuestionTypeDto;
  position: number;
  points: number;
  minSelections?: number | null;
  maxSelections?: number | null;
  answerOptions: AnswerOptionRecord[];
  shuffleOptions: boolean;
}

interface QuizWithQuestionsRecord {
  id: string;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: GetQuizResponseDto['difficultyLevel'];
  status: GetQuizResponseDto['status'];
  questions: QuizQuestionRecord[];
}

export function toSafeQuizAnswerOptionDto(option: AnswerOptionRecord): SafeQuizAnswerOptionDto {
  return {
    id: option.id,
    label: option.label,
    text: option.text,
    position: option.position,
  };
}

export function toSafeQuizQuestionDto(
  question: QuizQuestionRecord,
  presentationSeed = question.id,
): SafeQuizQuestionDto {
  const safeOptions = question.answerOptions.map(toSafeQuizAnswerOptionDto);
  const presentedOptions = presentQuizAnswerOptions(
    safeOptions,
    question.shuffleOptions,
    `${presentationSeed}:${question.id}`,
  );
  const safeQuestion = {
    id: question.id,
    prompt: question.prompt,
    questionType: question.questionType,
    position: question.position,
    points: question.points,
    options: presentedOptions,
  };

  if (question.questionType === 'MULTIPLE_CHOICE') {
    const { minSelections, maxSelections } = question;

    if (minSelections == null || maxSelections == null) {
      throw new Error('Multiple choice question is missing selection bounds');
    }

    return {
      ...safeQuestion,
      questionType: 'MULTIPLE_CHOICE',
      minSelections,
      maxSelections,
    };
  }

  return { ...safeQuestion, questionType: 'SINGLE_CHOICE' };
}

export function toGetQuizResponseDto(
  quiz: QuizWithQuestionsRecord,
  presentationSeed = quiz.id,
): Omit<
  GetQuizResponseDto,
  | 'campaignItemId'
  | 'campaignAssignmentId'
  | 'currentAttempts'
  | 'maxAttempts'
  | 'attemptsRemaining'
  | 'scorePolicy'
  | 'effectiveScorePercentage'
> {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passThresholdPercentage: quiz.passThresholdPercentage,
    difficultyLevel: quiz.difficultyLevel,
    status: quiz.status,
    questions: quiz.questions
      .map((question) => toSafeQuizQuestionDto(question, presentationSeed))
      .sort((left, right) => left.position - right.position),
  };
}

function shuffleAnswerOptions<T extends SafeQuizAnswerOptionDto>(
  options: T[],
  shuffleSeed: string,
): T[] {
  const shuffledOptions = [...options];

  if (shuffledOptions.length < 2) {
    return shuffledOptions;
  }

  for (let currentIndex = shuffledOptions.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = getDeterministicShuffleIndex(
      `${shuffleSeed}:${currentIndex}`,
      currentIndex + 1,
    );
    const currentOption = shuffledOptions[currentIndex];
    const randomOption = shuffledOptions[randomIndex];

    if (currentOption === undefined || randomOption === undefined) {
      continue;
    }

    shuffledOptions[currentIndex] = randomOption;
    shuffledOptions[randomIndex] = currentOption;
  }

  const orderDidNotChange = shuffledOptions.every(
    (option, index) => option.id === options[index]?.id,
  );

  if (orderDidNotChange) {
    const firstOption = shuffledOptions.shift();

    if (firstOption !== undefined) {
      shuffledOptions.push(firstOption);
    }
  }

  return shuffledOptions;
}

export function presentQuizAnswerOptions<T extends SafeQuizAnswerOptionDto>(
  options: T[],
  shuffleOptions: boolean,
  presentationSeed: string,
): T[] {
  const orderedOptions = [...options].sort((left, right) => left.position - right.position);

  if (shuffleOptions === false) {
    return orderedOptions;
  }

  return shuffleAnswerOptions(orderedOptions, presentationSeed).map((option, index) => ({
    ...option,
    label: getAlphabeticOptionLabel(index),
    position: index,
  }));
}

function getDeterministicShuffleIndex(seed: string, upperBound: number): number {
  const digest = createHash('sha256').update(seed).digest();

  return digest.readUInt32BE(0) % upperBound;
}

function getAlphabeticOptionLabel(index: number): string {
  let label = '';
  let remainingIndex = index;

  do {
    label = String.fromCharCode(65 + (remainingIndex % 26)) + label;
    remainingIndex = Math.floor(remainingIndex / 26) - 1;
  } while (remainingIndex >= 0);

  return label;
}
