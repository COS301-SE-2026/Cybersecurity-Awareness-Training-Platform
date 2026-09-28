import type { PortalInsightSummary } from '@insightful-phish/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(
      screen.queryByRole('heading', { name: 'Trainee Portal Evidence' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Delivery Channel Evidence' }),
    ).not.toBeInTheDocument();
  });

  it('shows authorised trainee stages in expandable details', async () => {
    const user = userEvent.setup();

    render(
      <PortalInsightsSection
        summary={SUMMARY}
        trainees={[
          {
            traineeProfileId: 'trainee-1',
            displayName: 'Sipho Ndlovu',
            insight: {
              managedLinkRequested: true,
              portalVisited: true,
              identifierFieldInteracted: true,
              credentialFieldInteracted: false,
              credentialSubmissionAttemptCount: 2,
              repeatCredentialAttemptCount: 1,
              educationalRevealViewed: true,
            },
          },
        ]}
      />,
    );

    const traineeName = screen.getByText('Sipho Ndlovu');
    await user.click(traineeName);

    const traineeDetail = traineeName.closest('details');
    expect(traineeDetail).not.toBeNull();

    const detail = within(traineeDetail as HTMLElement);
    expect(detail.getByText('Managed link requested')).toBeVisible();
    expect(detail.getByText('Portal visited')).toBeVisible();
    expect(detail.getByText('Identifier field interacted')).toBeVisible();
    expect(detail.getByText('Credential field interacted')).toBeVisible();
    expect(detail.getByText('Educational reveal viewed')).toBeVisible();
    expect(detail.getAllByText('Recorded')).toHaveLength(4);
    expect(detail.getByText('Not recorded')).toBeVisible();
    expect(detail.getByText('Repeat credential attempts')).toBeVisible();
  });

  it('shows only the supplied delivery channel breakdowns', async () => {
    const user = userEvent.setup();

    render(
      <PortalInsightsSection
        summary={SUMMARY}
        channels={[
          {
            channel: 'SIMULATED_INBOX',
            summary: {
              ...SUMMARY,
              managedLinkRequestCount: 12,
              portalVisitCount: 9,
            },
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Delivery Channel Evidence' })).toBeVisible();
    expect(screen.queryByText('Real Email')).not.toBeInTheDocument();

    const channelName = screen.getByText('Simulated Inbox');
    await user.click(channelName);

    const channelDetail = channelName.closest('details');
    expect(channelDetail).not.toBeNull();

    const detail = within(channelDetail as HTMLElement);
    expect(detail.getByText('12')).toBeVisible();
    expect(detail.getByText('9')).toBeVisible();
    expect(detail.getByText(/security scanners or preview tools/)).toBeVisible();
  });
});
