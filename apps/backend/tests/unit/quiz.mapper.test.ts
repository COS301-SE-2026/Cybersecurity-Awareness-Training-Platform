import { describe, expect, it } from 'vitest';
import { toGetQuizResponseDto } from '../../src/mappers/quiz.mapper.js';

describe('toGetQuizResponseDto', () => {
  it('maps quiz records to safe quiz fetch DTOs without correct-answer data', () => {
    const quizRecord = {
      id: 'quiz-1',
      title: 'Phishing Knowledge Check',
      passThresholdPercentage: 70,
      questions: [
        {
          id: 'question-2',
          prompt: 'Second question',
          questionType: 'SINGLE_CHOICE' as const,
          order: 2,
          points: 1,
          answerOptions: [
            {
              id: 'option-2b',
              label: 'B',
              text: 'Second option',
              order: 2,
              isCorrect: true,
            },
            {
              id: 'option-2a',
              label: 'A',
              text: 'First option',
              order: 1,
              isCorrect: false,
            },
          ],
        },
        {
          id: 'question-1',
          prompt: 'First question',
          questionType: 'SINGLE_CHOICE' as const,
          order: 1,
          points: 1,
          answerOptions: [
            {
              id: 'option-1a',
              label: 'A',
              text: 'Only option',
              order: 1,
              isCorrect: true,
            },
          ],
        },
      ],
    };

    const dto = toGetQuizResponseDto(quizRecord);

    expect(dto).toEqual({
      id: 'quiz-1',
      title: 'Phishing Knowledge Check',
      passThresholdPercentage: 70,
      questions: [
        {
          id: 'question-1',
          text: 'First question',
          type: 'SINGLE_CHOICE',
          order: 1,
          points: 1,
          options: [
            {
              id: 'option-1a',
              label: 'A',
              text: 'Only option',
              order: 1,
            },
          ],
        },
        {
          id: 'question-2',
          text: 'Second question',
          type: 'SINGLE_CHOICE',
          order: 2,
          points: 1,
          options: [
            {
              id: 'option-2a',
              label: 'A',
              text: 'First option',
              order: 1,
            },
            {
              id: 'option-2b',
              label: 'B',
              text: 'Second option',
              order: 2,
            },
          ],
        },
      ],
    });
    expect(dto.questions[1]?.options[1]).not.toHaveProperty('isCorrect');
  });
});
