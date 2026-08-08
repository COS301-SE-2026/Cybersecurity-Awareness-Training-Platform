import { apiClient } from './apiClient';

export type HealthResponse = {
  app: string;
  api: 'working';
  database: 'connected' | 'not connected';
  timestamp: string;
};

export async function getHealth(): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>('/health');
}
