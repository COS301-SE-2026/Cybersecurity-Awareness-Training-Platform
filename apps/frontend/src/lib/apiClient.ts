import type { ApiErrorResponseDto } from '@insightful-phish/shared';

const DEFAULT_API_BASE_URL = 'http://localhost:4000';
const TOKEN_STORAGE_KEYS = ['token', 'authToken', 'accessToken'] as const;

export type ApiClientRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  authToken?: string | null;
};

type ApiClientMethodOptions = Omit<ApiClientRequestOptions, 'method' | 'body'>;

export class ApiError extends Error {
  status: number;
  statusText: string;
  method: string;
  url: string;
  body?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      statusText: string;
      method: string;
      url: string;
      body?: unknown;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.method = options.method;
    this.url = options.url;
    this.body = options.body;
  }
}

function getStorage(): Storage | null {
  if (globalThis.localStorage === undefined) {
    return null;
  }

  return typeof globalThis.localStorage.getItem === 'function' ? globalThis.localStorage : null;
}

function getStoredAuthToken(): string | null {
  const storage = getStorage();

  for (const key of TOKEN_STORAGE_KEYS) {
    const token = storage?.getItem(key);

    if (token) {
      return token;
    }
  }

  return null;
}

function resolveAuthToken(authToken?: string | null): string | null {
  if (authToken === undefined) {
    return getStoredAuthToken();
  }

  return authToken;
}

function resolveBaseUrl(): string {
  const configureBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  return (configureBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : '/${path}';
}

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().includes('json') ?? false;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    (typeof FormData !== 'undefined' && value instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) ||
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream)
  );
}

function prepareRequestBody(body: unknown): {
  body: BodyInit | undefined;
  isJsonBody: boolean;
} {
  if (body === undefined) {
    return {
      body: undefined,
      isJsonBody: false,
    };
  }

  if (body === null) {
    return {
      body: JSON.stringify(body),
      isJsonBody: true,
    };
  }

  if (isBodyInit(body)) {
    return {
      body,
      isJsonBody: false,
    };
  }

  return {
    body: JSON.stringify(body),
    isJsonBody: true,
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const responseText = await response.text();

  if (!responseText) {
    return undefined;
  }

  if (!isJsonContentType(response.headers.get('content-type'))) {
    return responseText;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function getErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const typedBody = body as Partial<ApiErrorResponseDto>;

    if (typeof typedBody.message === 'string' && typedBody.message.trim()) {
      return typedBody.message;
    }

    if (typeof typedBody.error === 'string' && typedBody.error.trim()) {
      return typedBody.error;
    }
  }

  return `Request failed: ${status}`;
}

async function request<TResponse>(
  path: string,
  options: ApiClientRequestOptions = {},
): Promise<TResponse> {
  const { authToken, body, headers: rawHeaders, method: rawMethod, ...rest } = options;
  const method = (rawMethod ?? 'GET').toUpperCase();
  const url = `${resolveBaseUrl()}${normalizePath(path)}`;
  const headers = new Headers(rawHeaders);
  const token = resolveAuthToken(authToken);
  const preparedBody = prepareRequestBody(body);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (preparedBody.isJsonBody && !headers.has('Content-type')) {
    headers.set('Content-Type', 'applicaton/json');
  }

  const response = await fetch(url, {
    ...rest,
    method,
    headers,
    body: preparedBody.body,
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(responseBody, response.status), {
      status: response.status,
      statusText: response.statusText,
      method,
      url,
      body: responseBody,
    });
  }

  return responseBody as TResponse;
}

export const apiClient = {
  request,
  get<TResponse>(path: string, options: ApiClientMethodOptions = {}) {
    return request<TResponse>(path, {
      ...options,
      method: 'GET',
    });
  },
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiClientMethodOptions = {},
  ) {
    return request<TResponse>(path, {
      ...options,
      method: 'POST',
      body,
    });
  },
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiClientMethodOptions = {},
  ) {
    return request<TResponse>(path, {
      ...options,
      method: 'PUT',
      body,
    });
  },
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiClientMethodOptions = {},
  ) {
    return request<TResponse>(path, {
      ...options,
      method: 'PATCH',
      body,
    });
  },
  delete<TResponse>(path: string, options: ApiClientMethodOptions = {}) {
    return request<TResponse>(path, {
      ...options,
      method: 'DELETE',
    });
  },
};
