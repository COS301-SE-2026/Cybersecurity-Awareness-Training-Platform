import { apiClient } from './apiClient';

export async function authenticatedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiClient.request<T>(path, options);
}
