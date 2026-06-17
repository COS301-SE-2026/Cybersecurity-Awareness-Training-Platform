import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from '../apiClient';
import {
  createJsonResponse,
  installLocalStorageMock,
  setupHttpTest,
  teardownHttpTest,
} from './httpTestUtils';

const fetchMock = vi.fn();

describe('apiClient', () => {
  beforeEach(() => {
    setupHttpTest(fetchMock);
  });

  afterEach(() => {
    teardownHttpTest();
  });

  it('uses VITE_API_BASE_URL and trims trailing slashes', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test///');
    fetchMock.mockResolvedValue(createJsonResponse({ ok: true }));

    await apiClient.get('/health');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/health',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('adds the current token first and preserves custom headers', async () => {
    installLocalStorageMock({
      token: 'current-token',
      authToken: 'legacy-auth-token',
      accessToken: 'legacy-access-token',
    });
    fetchMock.mockResolvedValue(createJsonResponse({ ok: true }));

    await apiClient.get('/protected', {
      headers: {
        'X-Debug': '1',
      },
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(requestInit?.headers);

    expect(headers.get('authorization')).toBe('Bearer current-token');
    expect(headers.get('x-debug')).toBe('1');
  });

  it('stringifies JSON request bodies and sets the JSON content type', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ created: true }, { status: 201 }));

    await apiClient.post('/demo', {
      eventType: 'SIMULATED_EMAIL_OPENED',
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('content-type')).toBe('application/json');
    expect(requestInit?.body).toBe(JSON.stringify({ eventType: 'SIMULATED_EMAIL_OPENED' }));
  });

  it('returns undefined for 204 responses and empty bodies', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiClient.delete<void>('/demo')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      new Response('', {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    await expect(apiClient.get<void>('/empty')).resolves.toBeUndefined();
  });

  it('throws ApiError with status, method, url, message, and parsed body', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: 'validation failed',
          message: 'Email is required',
          fields: ['email'],
        },
        {
          status: 400,
          statusText: 'Bad Request',
        },
      ),
    );

    const error = await apiClient.post('/auth/login', {}).catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Email is required');
    expect(error).toMatchObject({
      status: 400,
      statusText: 'Bad Request',
      method: 'POST',
      url: 'http://localhost:4000/auth/login',
      body: {
        error: 'validation failed',
        message: 'Email is required',
        fields: ['email'],
      },
    });
  });
});
