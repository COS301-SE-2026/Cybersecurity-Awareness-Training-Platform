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
  order: number;
}

interface QuizQuestionRecord {
  id: string;
  prompt: string;
  questionType: QuestionTypeDto;
  order: number;
  points: number;
  answerOptions: AnswerOptionRecord[];
}

interface QuizWithQuestionsRecord {
  id: string;
  title: string;
  passThresholdPercentage: number;
  questions: QuizQuestionRecord[];
}

export function toSafeQuizAnswerOptionDto(option: AnswerOptionRecord): SafeQuizAnswerOptionDto {
  return {
    id: option.id,
    label: option.label,
    text: option.text,
    order: option.order,
  };
}

export function toSafeQuizQuestionDto(question: QuizQuestionRecord): SafeQuizQuestionDto {
  return {
    id: question.id,
    text: question.prompt,
    type: question.questionType,
    order: question.order,
    points: question.points,
    options: question.answerOptions
      .map(toSafeQuizAnswerOptionDto)
      .sort((left, right) => left.order - right.order),
  };
}

export function toGetQuizResponseDto(quiz: QuizWithQuestionsRecord): GetQuizResponseDto {
  return {
    id: quiz.id,
    title: quiz.title,
    passThresholdPercentage: quiz.passThresholdPercentage,
    questions: quiz.questions
      .map(toSafeQuizQuestionDto)
      .sort((left, right) => left.order - right.order),
  };
}
