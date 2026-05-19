import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuiz } from '../../lib/quizApi';

const campaignItemId = '33333333-3333-4333-8333-333333333334';

function installLocalStorageMock(authToken: string | null = null) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => (key === 'authToken' ? authToken : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
}

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    headers: {
      get: () => 'application/json',
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
}

describe('quizApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches quiz content through the campaign item quiz endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      await mockJsonResponse({
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
      }),
    );

    const quiz = await getQuiz(campaignItemId);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/trainee/campaign-items/${campaignItemId}/quiz`),
      expect.objectContaining({
        method: 'GET',
      }),
    );

    expect(quiz.title).toBe('Phishing basics quiz');
    expect(quiz.questions[0].options[0].text).toBe('Urgent password reset email.');
  });

  it('sends bearer token when a token already exists', async () => {
    installLocalStorageMock('demo-token');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      await mockJsonResponse({
        id: '55555555-5555-4555-8555-555555555551',
        campaignItemId,
        title: 'Phishing basics quiz',
        questions: [],
      }),
    );

    await getQuiz(campaignItemId);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer demo-token',
        }),
      }),
    );
  });

  it('rejects quiz fetch responses that expose correctness before submission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      await mockJsonResponse({
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      await mockJsonResponse({
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
