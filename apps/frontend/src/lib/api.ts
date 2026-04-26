const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export type HealthResponse = {
  app: string;
  api: 'working';
  database: 'connected' | 'not connected';
  timestamp: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  const data = (await response.json().catch(() => null)) as HealthResponse | null;

  if (!response.ok) {
    if (data) {
      return data;
    }

    throw new Error('Failed to connect to API');
  }

  return data as HealthResponse;
}
