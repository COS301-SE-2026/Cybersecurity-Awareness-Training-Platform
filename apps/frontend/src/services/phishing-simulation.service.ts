import type { RealEmailFeedbackDto } from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export function getPhishingSimulationFeedback(token: string): Promise<RealEmailFeedbackDto> {
  return apiClient.get<RealEmailFeedbackDto>(
    `/phishing-simulations/feedback/${encodeURIComponent(token)}`,
    { authToken: null, cache: 'no-store' },
  );
}
