import { describe, expect, it } from 'vitest';
import { toGetQuizResponseDto } from '../../src/mappers/quiz.mapper.js';

describe('toGetQuizResponseDto', () => {
  it('maps quiz records to safe quiz fetch DTOs without correct-answer data', () => {
    const quizRecord = {
      id: 'quiz-1',
      title: 'Phishing Knowledge Check',
      description: 'Demo 1 quiz',
      passThresholdPercentage: 70,
      difficultyLevel: 'BEGINNER' as const,
      status: 'PUBLISHED' as const,
      questions: [
        {
          id: 'question-2',
          prompt: 'Second question',
          questionType: 'SINGLE_CHOICE' as const,
          position: 2,
          points: 1,
          answerOptions: [
            {
              id: 'option-2b',
              label: 'B',
              text: 'Second option',
              position: 2,
              isCorrect: true,
            },
            {
              id: 'option-2a',
              label: 'A',
              text: 'First option',
              position: 1,
              isCorrect: false,
            },
          ],
        },
        {
          id: 'question-1',
          prompt: 'First question',
          questionType: 'SINGLE_CHOICE' as const,
          position: 1,
          points: 1,
          answerOptions: [
            {
              id: 'option-1a',
              label: 'A',
              text: 'Only option',
              position: 1,
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
      description: 'Demo 1 quiz',
      passThresholdPercentage: 70,
      difficultyLevel: 'BEGINNER',
      status: 'PUBLISHED',
      questions: [
        {
          id: 'question-1',
          prompt: 'First question',
          questionType: 'SINGLE_CHOICE',
          position: 1,
          points: 1,
          options: [
            {
              id: 'option-1a',
              label: 'A',
              text: 'Only option',
              position: 1,
            },
          ],
        },
        {
          id: 'question-2',
          prompt: 'Second question',
          questionType: 'SINGLE_CHOICE',
          position: 2,
          points: 1,
          options: [
            {
              id: 'option-2a',
              label: 'A',
              text: 'First option',
              position: 1,
            },
            {
              id: 'option-2b',
              label: 'B',
              text: 'Second option',
              position: 2,
            },
          ],
        },
      ],
    });
    expect(dto.questions[1]?.options[1]).not.toHaveProperty('isCorrect');
  });
});
