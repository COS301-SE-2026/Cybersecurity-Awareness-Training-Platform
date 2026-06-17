import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/apiClient';
import { getQuiz } from '../../lib/quizApi';

const campaignItemId = '33333333-3333-4333-8333-333333333334';
const fetchMock = vi.fn();

function installLocalStorageMock(values: Record<string, string | null> = {}) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values[key] ?? null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
}

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function createQuizPayload() {
  return {
    id: '55555555-5555-4555-8555-555555555551',
    campaignItemId,
    campaignAssignmentId: '22222222-2222-4222-8222-222222222222',
    title: 'Phishing basics quiz',
    description: 'Check your phishing awareness.',
    passThresholdPercentage: 70,
    difficultyLevel: 'BEGINNER',
    status: 'AVAILABLE',
    questions: [
      {
        id: 'question-1',
        text: 'Which email is suspicious?',
        options: [
          {
            id: 'option-1',
            label: 'A',
            text: 'Urgent password reset email.',
          },
        ],
      },
    ],
  };
}

describe('quizApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('defaults quiz requests to http://localhost:4000', async () => {
    fetchMock.mockResolvedValue(createJsonResponse(createQuizPayload()));

    const quiz = await getQuiz(campaignItemId);

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/trainee/campaign-items/${campaignItemId}/quiz`,
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(quiz.title).toBe('Phishing basics quiz');
    expect(quiz.questions[0].options[0].text).toBe('Urgent password reset email.');
  });

  it('respects VITE_API_BASE_URL when it is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test///');
    fetchMock.mockResolvedValue(createJsonResponse(createQuizPayload()));

    await getQuiz(campaignItemId);

    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.example.test/trainee/campaign-items/${campaignItemId}/quiz`,
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('sends bearer token when a token already exists', async () => {
    installLocalStorageMock({
      token: 'demo-token',
    });
    fetchMock.mockResolvedValue(
      createJsonResponse({
        id: '55555555-5555-4555-8555-555555555551',
        campaignItemId,
        title: 'Phishing basics quiz',
        questions: [],
      }),
    );

    await getQuiz(campaignItemId);

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get('authorization')).toBe('Bearer demo-token');
  });

  it('throws ApiError with parsed response details for non-ok responses', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: 'Forbidden',
          message: 'Quiz is not available yet.',
        },
        {
          status: 403,
          statusText: 'Forbidden',
        },
      ),
    );

    const error = await getQuiz(campaignItemId).catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      statusText: 'Forbidden',
      message: 'Quiz is not available yet.',
      body: {
        error: 'Forbidden',
        message: 'Quiz is not available yet.',
      },
    });
  });

  it('rejects quiz fetch responses that expose correctness before submission', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        id: '55555555-5555-4555-8555-555555555551',
        campaignItemId,
        title: 'Leaky quiz',
        questions: [
          {
            id: 'question-1',
            text: 'Which option is correct?',
            options: [
              {
                id: 'option-1',
                label: 'A',
                text: 'This should not expose correctness.',
                isCorrect: true,
              },
            ],
          },
        ],
      }),
    );

    await expect(getQuiz(campaignItemId)).rejects.toThrow(/exposed "isCorrect" before submission/i);
  });

  it('rejects quiz fetch responses that expose feedback before submission', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        id: '55555555-5555-4555-8555-555555555551',
        campaignItemId,
        title: 'Leaky quiz',
        questions: [
          {
            id: 'question-1',
            text: 'Which option is correct?',
            options: [
              {
                id: 'option-1',
                label: 'A',
                text: 'This should not expose feedback.',
                feedbackText: 'This feedback should only appear after submission.',
              },
            ],
          },
        ],
      }),
    );

    await expect(getQuiz(campaignItemId)).rejects.toThrow(
      /exposed "feedbackText" before submission/i,
    );
  });
});
