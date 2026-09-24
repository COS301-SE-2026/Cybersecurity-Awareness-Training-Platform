import type { PortalInsightSummary } from '@insightful-phish/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PortalInsightsSection from './PortalInsightsSection';

const SUMMARY: PortalInsightSummary = {
  managedLinkRequestCount: 101,
  distinctTraineeLinkRequestCount: 102,
  portalVisitCount: 103,
  distinctPortalVisitorCount: 104,
  identifierFieldInteractionCount: 105,
  credentialFieldInteractionCount: 106,
  credentialSubmissionAttemptCount: 107,
  distinctCredentialAttemptTraineeCount: 108,
  repeatCredentialAttemptCount: 109,
  educationalRevealViewCount: 110,
  distinctRevealTraineeCount: 111,
};

const EXPECTED_METRICS = [
  ['Managed-link requests', 101],
  ['Trainees with link requests', 102],
  ['Portal visits', 103],
  ['Distinct portal visitors', 104],
  ['Identifier field interactions', 105],
  ['Credential field interactions', 106],
  ['Credential submission attempts', 107],
  ['Trainees with credential attempts', 108],
  ['Repeat credential attempts', 109],
  ['Educational reveal views', 110],
  ['Trainees who viewed the reveal', 111],
] as const;

describe('PortalInsightsSection', () => {
  it('shows each portal event as a separate factual count', () => {
    render(<PortalInsightsSection summary={SUMMARY} />);

    expect(screen.getByRole('heading', { name: 'Phishing Portal Evidence' })).toBeVisible();

    for (const [label, value] of EXPECTED_METRICS) {
      expect(screen.getByText(label)).toBeVisible();
      expect(screen.getByText(String(value))).toBeVisible();
    }

    expect(
      screen.getByText('These behavioural events are reported separately from Campaign progress.'),
    ).toBeVisible();
    expect(screen.getByText(/Repeat attempts exclude duplicate network retries/)).toBeVisible();
  });
});
