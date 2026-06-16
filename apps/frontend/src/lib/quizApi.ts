const DEFAULT_API_BASE_URL = 'http://localhost:3000';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

const TOKEN_STORAGE_KEYS = ['authToken', 'accessToken', 'token'];

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QuizApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
};

class QuizApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'QuizApiError';
    this.status = status;
    this.details = details;
  }
}

function getExistingAuthToken(): string | null {
  if (globalThis.localStorage === undefined) {
    return null;
  }
  for (const key of TOKEN_STORAGE_KEYS) {
    const token = globalThis.localStorage.getItem(key);

    if (token) {
      return token;
    }
  }

  return null;
}

async function quizApiRequest<T>(path: string, options: QuizApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const token = getExistingAuthToken();
  const hasBody = body !== undefined;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : `Quiz request failed with status ${response.status}`;

    throw new QuizApiError(message, response.status, payload);
  }

  return payload as T;
}

export type QuizOption = {
  id: string;
  label: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  text: string;
  options: QuizOption[];
};

export type CampaignItemQuiz = {
  id: string;
  campaignItemId: string;
  campaignAssignmentId?: string | null;
  title: string;
  description?: string | null;
  passThresholdPercentage?: number | null;
  difficultyLevel?: string | null;
  status?: string | null;
  questions: QuizQuestion[];
};

export type StartQuizAttemptResponse = {
  attemptId: string;
  traineeProfileId?: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  status: string;
  startedAt: string;
};

export type SubmitQuizAnswer = {
  questionId: string;
  selectedOptionIds: string[];
};

export type SubmitQuizAttemptResponse = {
  success: boolean;
  attemptId: string;
  status: string;
};

export type QuizResultSelectedOption = {
  optionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  feedbackText?: string | null;
};

export type QuizResultAnswer = {
  questionId: string;
  isCorrect: boolean;
  awardedPoints?: number | null;
  feedbackShown?: string | null;
  selectedOptions: QuizResultSelectedOption[];
};

export type QuizResult = {
  attemptId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  answers: QuizResultAnswer[];
};

const quizRequestCache = new Map<string, Promise<CampaignItemQuiz>>();
const quizResultRequestCache = new Map<string, Promise<QuizResult>>();

type RawQuizOption = {
  id?: string;
  optionId?: string;
  label?: string;
  text?: string;
  optionText?: string;
  answerText?: string;
  isCorrect?: boolean;
  correct?: boolean;
  feedback?: string;
  feedbackText?: string;
};

type RawQuizQuestion = {
  id?: string;
  questionId?: string;
  text?: string;
  questionText?: string;
  prompt?: string;
  options?: RawQuizOption[];
  answerOptions?: RawQuizOption[];
};

type RawCampaignItemQuiz = Omit<CampaignItemQuiz, 'questions'> & {
  questions: RawQuizQuestion[];
};

const FORBIDDEN_PRE_SUBMIT_KEYS = new Set([
  'isCorrect',
  'correct',
  'correctAnswerId',
  'correctAnswerIds',
  'correctOptionId',
  'correctOptionIds',
  'feedback',
  'feedbackText',
  'feedbackShown',
]);

function assertNoPreSubmitAnswerLeak(value: unknown, path = 'quiz'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPreSubmitAnswerLeak(item, `${path}[${index}]`));
    return;
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_PRE_SUBMIT_KEYS.has(key)) {
      throw new Error(`Quiz fetch exposed "${key}" before submission at ${path}.${key}`);
    }

    assertNoPreSubmitAnswerLeak(nestedValue, `${path}.${key}`);
  }
}

function normaliseQuiz(rawQuiz: RawCampaignItemQuiz): CampaignItemQuiz {
  return {
    id: rawQuiz.id,
    campaignItemId: rawQuiz.campaignItemId,
    campaignAssignmentId: rawQuiz.campaignAssignmentId,
    title: rawQuiz.title,
    description: rawQuiz.description,
    passThresholdPercentage: rawQuiz.passThresholdPercentage,
    difficultyLevel: rawQuiz.difficultyLevel,
    status: rawQuiz.status,
    questions: rawQuiz.questions.map((question, questionIndex) => {
      const options = question.options ?? question.answerOptions ?? [];

      return {
        id: question.id ?? question.questionId ?? `question-${questionIndex + 1}`,
        text:
          question.text ??
          question.questionText ??
          question.prompt ??
          `Question ${questionIndex + 1}`,
        options: options.map((option, optionIndex) => ({
          id: option.id ?? option.optionId ?? `option-${optionIndex + 1}`,
          label: option.label ?? String.fromCodePoint(65 + optionIndex),
          text:
            option.text ?? option.optionText ?? option.answerText ?? `Option ${optionIndex + 1}`,
        })),
      };
    }),
  };
}

export async function getQuiz(campaignItemId: string): Promise<CampaignItemQuiz> {
  const existingRequest = quizRequestCache.get(campaignItemId);

  if (existingRequest !== undefined) {
    return existingRequest;
  }

  const request = quizApiRequest<RawCampaignItemQuiz>(
    `/trainee/campaign-items/${campaignItemId}/quiz`,
  )
    .then((quiz) => {
      assertNoPreSubmitAnswerLeak(quiz);
      return normaliseQuiz(quiz);
    })
    .finally(() => {
      quizRequestCache.delete(campaignItemId);
    });

  quizRequestCache.set(campaignItemId, request);

  return request;
}

export async function startQuizAttempt(campaignItemId: string): Promise<StartQuizAttemptResponse> {
  return quizApiRequest<StartQuizAttemptResponse>(
    `/trainee/campaign-items/${campaignItemId}/quiz/attempts`,
    {
      method: 'POST',
      body: {},
    },
  );
}

export async function submitQuizAttempt(
  attemptId: string,
  answers: SubmitQuizAnswer[],
): Promise<SubmitQuizAttemptResponse> {
  return quizApiRequest<SubmitQuizAttemptResponse>(`/quiz-attempts/${attemptId}/submit`, {
    method: 'POST',
    body: {
      answers,
    },
  });
}

export async function getQuizResult(attemptId: string): Promise<QuizResult> {
  const existingRequest = quizResultRequestCache.get(attemptId);

  if (existingRequest !== undefined) {
    return existingRequest;
  }

  const request = quizApiRequest<QuizResult>(`/quiz-attempts/${attemptId}/results`).finally(() => {
    quizResultRequestCache.delete(attemptId);
  });

  quizResultRequestCache.set(attemptId, request);

  return request;
}
