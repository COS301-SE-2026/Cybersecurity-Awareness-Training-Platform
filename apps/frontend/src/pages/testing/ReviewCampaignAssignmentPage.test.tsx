import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ReviewCampaignAssignmentPage from '../campaign-assignment/ReviewCampaignAssignmentPage';
import {
  mockAssignableCampaigns,
  mockTraineeCandidates,
} from '../../testing/fixtures/campaignAssignmentFixtures';

const originalCampaignCount = mockAssignableCampaigns.length;

type RenderPageOptions = {
  selectedTraineeIds?: string[];
  selectedCampaignIds?: string[];
  onBack?: () => void;
};

function renderPage({
  selectedTraineeIds = [],
  selectedCampaignIds = [],
  onBack = vi.fn(),
}: RenderPageOptions = {}) {
  return render(
    <ReviewCampaignAssignmentPage
      selectedTraineeIds={selectedTraineeIds}
      selectedCampaignIds={selectedCampaignIds}
      onBack={onBack}
    />,
  );
}

describe('ReviewCampaignAssignmentPage', () => {
  afterEach(() => {
    mockAssignableCampaigns.splice(originalCampaignCount);
  });

  it('renders the review step heading, instructions, and table headings', () => {
    renderPage();

    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /review campaign assignment/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /review the selected organisation trainees and campaigns before submitting/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /organisation trainee selection/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /training campaign selection/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^name$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
  });

  it('shows empty states and disables complete assignment when nothing is selected', () => {
    renderPage();

    expect(
      screen.getByText(/assigning 0 training campaign\(s\) to 0 organisation trainee\(s\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/0 total assignment\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/no organisation trainee\(s\) selected/i)).toBeInTheDocument();
    expect(screen.getByText(/no training campaign\(s\) selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeDisabled();
  });

  it('renders selected trainees, selected campaigns, and total assignment count', () => {
    renderPage({
      selectedTraineeIds: [
        mockTraineeCandidates[0].traineeProfileId,
        mockTraineeCandidates[1].traineeProfileId,
      ],
      selectedCampaignIds: [
        mockAssignableCampaigns[0].campaignId,
        mockAssignableCampaigns[1].campaignId,
      ],
    });

    expect(
      screen.getByText(/assigning 2 training campaign\(s\) to 2 organisation trainee\(s\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 total assignment\(s\)/i)).toBeInTheDocument();

    expect(screen.getByText('Connor Bell')).toBeInTheDocument();
    expect(screen.getByText('connor.bell@example.com')).toBeInTheDocument();
    expect(screen.getByText('Johan Nel')).toBeInTheDocument();
    expect(screen.getByText('johan.nel@example.com')).toBeInTheDocument();

    expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Phishing Awareness')).toBeInTheDocument();
    expect(screen.getAllByText('Premade General')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeEnabled();
  });

  it('does not render fixture rows when selected ids are not recognised', () => {
    renderPage({
      selectedTraineeIds: ['unknown-trainee-id'],
      selectedCampaignIds: ['unknown-campaign-id'],
    });

    expect(
      screen.getByText(/assigning 1 training campaign\(s\) to 1 organisation trainee\(s\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 total assignment\(s\)/i)).toBeInTheDocument();
    expect(screen.queryByText('Connor Bell')).not.toBeInTheDocument();
    expect(screen.queryByText('Cybersecurity Fundamentals')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeEnabled();
  });

  it('disables complete assignment when either selection is empty', () => {
    const { rerender } = render(
      <ReviewCampaignAssignmentPage
        selectedTraineeIds={[mockTraineeCandidates[0].traineeProfileId]}
        selectedCampaignIds={[]}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/no training campaign\(s\) selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeDisabled();

    rerender(
      <ReviewCampaignAssignmentPage
        selectedTraineeIds={[]}
        selectedCampaignIds={[mockAssignableCampaigns[0].campaignId]}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/no organisation trainee\(s\) selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeDisabled();
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderPage({ onBack });

    await user.click(screen.getByRole('button', { name: /^back$/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders fallback campaign values for missing description and custom type', () => {
    mockAssignableCampaigns.push({
      campaignId: '41111111-1111-4111-8111-111111111198',
      name: 'Custom Policy Review',
      description: null,
      status: 'ACTIVE',
      type: 'ORGANISATION_CUSTOM',
      itemCount: 1,
      startDate: null,
      endDate: null,
      assignmentCount: 0,
    });

    renderPage({
      selectedTraineeIds: [mockTraineeCandidates[0].traineeProfileId],
      selectedCampaignIds: ['41111111-1111-4111-8111-111111111198'],
    });

    const customCampaignRow = screen.getByText('Custom Policy Review').closest('tr');

    expect(customCampaignRow).not.toBeNull();
    expect(within(customCampaignRow as HTMLTableRowElement).getByText('—')).toBeInTheDocument();
    expect(
      within(customCampaignRow as HTMLTableRowElement).getByText('Organisation Custom'),
    ).toBeInTheDocument();
  });
});
