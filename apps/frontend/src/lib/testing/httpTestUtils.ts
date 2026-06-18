import { vi } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn>;

export function installLocalStorageMock(values: Record<string, string | null> = {}) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values[key] ?? null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
}

export function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json;');
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function setupHttpTest(
  fetchMock: FetchMock,
  storageValues: Record<string, string | null> = {},
) {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  installLocalStorageMock(storageValues);
}

export function teardownHttpTest() {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}
