const MOCK_DELAY_MS = 150;

export type QuestionTypeDto = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export interface SafeQuizAnswerOptionDto {
  id: string;
  label: string;
  text: string;
  position: number;
}

export interface SafeQuizQuestionDto {
  id: string;
  prompt: string;
  questionType: QuestionTypeDto;
  position: number;
  points: number;
  options: SafeQuizAnswerOptionDto[];
}

export interface GetQuizResponseDto {
  id: string;
  campaignItemId?: string | null;
  campaignAssignmentId?: string | null;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: string;
  status: string;
  questions: SafeQuizQuestionDto[];
}

export interface StartQuizAttemptResponseDto {
  attemptId: string;
  traineeProfileId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  status: 'IN_PROGRESS';
  startedAt: string;
}

export interface QuizAnswerInputDto {
  questionId: string;
  selectedOptionIds: string[];
  responseSummary?: string;
  typedResponse?: string;
}

export interface SubmitQuizAttemptRequestDto {
  answers: QuizAnswerInputDto[];
}

export interface SubmitQuizAttemptResponseDto {
  success: boolean;
  message?: string;
  attemptId: string;
  status: 'SUBMITTED';
}

export interface QuizSelectedOptionFeedbackDto {
  optionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  feedbackText?: string | null;
}

export interface QuizAttemptAnswerResultDto {
  questionId: string;
  isCorrect?: boolean | null;
  awardedPoints?: number | null;
  feedbackShown?: string | null;
  selectedOptions: QuizSelectedOptionFeedbackDto[];
}

export interface GetQuizResultResponseDto {
  attemptId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  answers: QuizAttemptAnswerResultDto[];
}

export const quizRoutes = {
  quiz: (quizId: string) => `/quizzes/${quizId}`,
  result: (attemptId: string) => `/quiz-attempts/${attemptId}/results`,
};

const mockQuiz: GetQuizResponseDto = {
  id: 'phishing-basics-quiz',
  campaignItemId: 'campaign-item-phishing-basics-quiz',
  campaignAssignmentId: 'campaign-assignment-demo',
  title: 'Phishing Basics Quiz',
  description:
    'Answer these short questions to check whether you can recognise common phishing warning signs.',
  passThresholdPercentage: 70,
  difficultyLevel: 'BEGINNER',
  status: 'AVAILABLE',
  questions: [
    {
      id: 'question-sender',
      prompt: 'Which email detail is most suspicious?',
      questionType: 'SINGLE_CHOICE',
      position: 1,
      points: 1,
      options: [
        {
          id: 'option-sender-a',
          label: 'A',
          text: 'The sender address uses a strange domain that does not match the organisation.',
          position: 1,
        },
        {
          id: 'option-sender-b',
          label: 'B',
          text: 'The email includes a normal company signature.',
          position: 2,
        },
        {
          id: 'option-sender-c',
          label: 'C',
          text: 'The email has a short subject line.',
          position: 3,
        },
      ],
    },
    {
      id: 'question-link',
      prompt: 'What should you do before opening a link in a suspicious email?',
      questionType: 'SINGLE_CHOICE',
      position: 2,
      points: 1,
      options: [
        {
          id: 'option-link-a',
          label: 'A',
          text: 'Click it quickly before the message expires.',
          position: 1,
        },
        {
          id: 'option-link-b',
          label: 'B',
          text: 'Check the destination and verify the request through a trusted channel.',
          position: 2,
        },
        {
          id: 'option-link-c',
          label: 'C',
          text: 'Forward it to colleagues to ask whether they received it too.',
          position: 3,
        },
      ],
    },
  ],
};

const mockResult: GetQuizResultResponseDto = {
  attemptId: 'attempt-phishing-basics-quiz',
  quizId: 'phishing-basics-quiz',
  campaignItemId: 'campaign-item-phishing-basics-quiz',
  campaignAssignmentId: 'campaign-assignment-demo',
  scorePercentage: 100,
  passed: true,
  summary:
    'Good work. The backend-calculated result shows that the selected answers recognised the main phishing indicators.',
  answers: [
    {
      questionId: 'question-sender',
      isCorrect: true,
      awardedPoints: 1,
      feedbackShown: 'Sender address mismatches are a common phishing warning sign.',
      selectedOptions: [
        {
          optionId: 'option-sender-a',
          label: 'A',
          text: 'The sender address uses a strange domain that does not match the organisation.',
          isCorrect: true,
          feedbackText:
            'Correct. Attackers often use lookalike or unrelated domains to make messages seem legitimate.',
        },
      ],
    },
    {
      questionId: 'question-link',
      isCorrect: true,
      awardedPoints: 1,
      feedbackShown: 'Suspicious links should be verified before they are opened.',
      selectedOptions: [
        {
          optionId: 'option-link-b',
          label: 'B',
          text: 'Check the destination and verify the request through a trusted channel.',
          isCorrect: true,
          feedbackText:
            'Correct. Verifying through a trusted channel reduces the risk of interacting with a phishing link.',
        },
      ],
    },
  ],
};

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });
}

export async function getQuiz(quizId: string): Promise<GetQuizResponseDto> {
  await delay();

  if (quizId !== mockQuiz.id) {
    throw new Error('Quiz not found.');
  }

  return mockQuiz;
}

export async function startQuizAttempt(quizId: string): Promise<StartQuizAttemptResponseDto> {
  await delay();

  if (quizId !== mockQuiz.id) {
    throw new Error('Quiz not found.');
  }

  return {
    attemptId: mockResult.attemptId,
    traineeProfileId: 'trainee-demo-profile',
    quizId,
    campaignItemId: mockQuiz.campaignItemId,
    campaignAssignmentId: mockQuiz.campaignAssignmentId,
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
  };
}

export async function submitQuizAttempt(
  attemptId: string,
  _payload: SubmitQuizAttemptRequestDto,
): Promise<SubmitQuizAttemptResponseDto> {
  await delay();

  if (attemptId !== mockResult.attemptId) {
    throw new Error('Quiz attempt not found.');
  }

  return {
    success: true,
    attemptId,
    status: 'SUBMITTED',
  };
}

export async function getQuizResult(attemptId: string): Promise<GetQuizResultResponseDto> {
  await delay();

  if (attemptId !== mockResult.attemptId) {
    throw new Error('Quiz result not found.');
  }

  return mockResult;
}
