import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QuizQuestionDraftInput } from '@insightful-phish/shared';

import QuestionEditorDialog from './QuestionEditorDialog';

const question: QuizQuestionDraftInput = {
  prompt: 'Which message is suspicious?',
  questionType: 'SINGLE_CHOICE',
  position: 0,
  points: 1,
  categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
  shuffleOptions: false,
  answerOptions: [
    {
      label: 'Legacy first label',
      text: 'An unexpected password reset request.',
      position: 0,
      isCorrect: true,
      feedbackText: 'Unexpected requests should be verified.',
    },
    {
      label: 'Legacy second label',
      text: 'A message you requested from a known sender.',
      position: 1,
      isCorrect: false,
      feedbackText: null,
    },
  ],
};

describe('QuestionEditorDialog option labels', () => {
  it('derives positional labels and saves them without changing option content', () => {
    const onSave = vi.fn();

    render(
      <QuestionEditorDialog question={question} position={0} onCancel={vi.fn()} onSave={onSave} />,
    );

    expect(screen.getByLabelText('Option 1 label')).toHaveTextContent('A');
    expect(screen.getByLabelText('Option 2 label')).toHaveTextContent('B');
    expect(screen.queryByDisplayValue('Legacy first label')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Question' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        answerOptions: [
          expect.objectContaining({
            label: 'A',
            text: 'An unexpected password reset request.',
            isCorrect: true,
            feedbackText: 'Unexpected requests should be verified.',
            position: 0,
          }),
          expect.objectContaining({
            label: 'B',
            text: 'A message you requested from a known sender.',
            isCorrect: false,
            position: 1,
          }),
        ],
      }),
    );
  });

  it('renumbers labels after removing and adding options', () => {
    render(
      <QuestionEditorDialog question={question} position={0} onCancel={vi.fn()} onSave={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove option 1' }));
    expect(screen.getByLabelText('Option 1 label')).toHaveTextContent('A');
    expect(screen.getByDisplayValue('A message you requested from a known sender.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Add Answer Option' }));
    expect(screen.getByLabelText('Option 1 label')).toHaveTextContent('A');
    expect(screen.getByLabelText('Option 2 label')).toHaveTextContent('B');
  });
});
