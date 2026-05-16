import type {
  GetQuizResponseDto,
  QuestionTypeDto,
  SafeQuizAnswerOptionDto,
  SafeQuizQuestionDto,
} from '@insightful-phish/shared';

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
  answerOptions: AnswerOptionRecord[];
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

export function toSafeQuizQuestionDto(question: QuizQuestionRecord): SafeQuizQuestionDto {
  return {
    id: question.id,
    prompt: question.prompt,
    questionType: question.questionType,
    position: question.position,
    points: question.points,
    options: question.answerOptions
      .map(toSafeQuizAnswerOptionDto)
      .sort((left, right) => left.position - right.position),
  };
}

export function toGetQuizResponseDto(quiz: QuizWithQuestionsRecord): GetQuizResponseDto {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passThresholdPercentage: quiz.passThresholdPercentage,
    difficultyLevel: quiz.difficultyLevel,
    status: quiz.status,
    questions: quiz.questions
      .map(toSafeQuizQuestionDto)
      .sort((left, right) => left.position - right.position),
  };
}
