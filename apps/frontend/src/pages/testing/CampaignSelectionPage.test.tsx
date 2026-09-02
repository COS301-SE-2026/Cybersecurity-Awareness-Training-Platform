import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CampaignSelectionPage from '../campaign-assignment/CampaignSelectionPage';
import {
  mockAssignableCampaigns,
  mockAssignableCampaignsResponse,
} from '../../testing/fixtures/campaignAssignmentFixtures';
import { getAssignableCampaigns } from '../../services/campaign-assignment.service';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    authContext: {
      organisation: {
        id: 'test-organisation-id',
      },
    },
  }),
}));

vi.mock('../../services/campaign-assignment.service', () => ({
  getAssignableCampaigns: vi.fn(),
}));

const mockedGetAssignableCampaigns = vi.mocked(getAssignableCampaigns);

const originalCampaignCount = mockAssignableCampaigns.length;

type RenderPageOptions = {
  initialSelectedCampaignIds?: string[];
  onBack?: () => void;
  onContinue?: () => void;
};

function TestHarness({
  initialSelectedCampaignIds = [],
  onBack = vi.fn(),
  onContinue = vi.fn(),
}: RenderPageOptions) {
  const [selectedCampaignIds, setSelectedCampaignIds] = useState(initialSelectedCampaignIds);
  const [, setSelectedCampaigns] = useState(
    mockAssignableCampaigns.filter((campaign) =>
      initialSelectedCampaignIds.includes(campaign.campaignId),
    ),
  );

  return (
    <CampaignSelectionPage
      selectedCampaignIds={selectedCampaignIds}
      setSelectedCampaignIds={setSelectedCampaignIds}
      setSelectedCampaigns={setSelectedCampaigns}
      onBack={onBack}
      onContinue={onContinue}
    />
  );
}

function renderPage(options: RenderPageOptions = {}) {
  mockedGetAssignableCampaigns.mockResolvedValue(mockAssignableCampaignsResponse);

  return render(<TestHarness {...options} />);
}

async function waitForCampaignsToLoad() {
  await waitFor(() => {
    expect(screen.getAllByRole('checkbox')).toHaveLength(mockAssignableCampaigns.length);
  });
}

describe('CampaignSelectionPage', () => {
  afterEach(() => {
    mockAssignableCampaigns.splice(originalCampaignCount);
  });

  it('renders the step heading, search input, table headings, and campaign rows', async () => {
    renderPage();

    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /training campaign selection/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/search training campaigns/i)).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /item count/i })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /current assignment count/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /duration/i })).toBeInTheDocument();

    await waitForCampaignsToLoad();

    for (const campaign of mockAssignableCampaigns) {
      expect(screen.getByText(campaign.name)).toBeInTheDocument();
      expect(screen.getByText(campaign.description ?? '—')).toBeInTheDocument();
    }
  });

  it('starts with no selected campaigns and disables selection actions', async () => {
    renderPage();

    expect(screen.getByText(/no training campaigns selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^back$/i })).toBeEnabled();

    await waitForCampaignsToLoad();

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it('selects one campaign, enables continue, and calls onContinue', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderPage({ onContinue });

    await waitForCampaignsToLoad();
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));

    expect(screen.getByText(/1 training campaign selected/i)).toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderPage({ onBack });

    await user.click(screen.getByRole('button', { name: /^back$/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('toggles a selected campaign off again', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitForCampaignsToLoad();
    const firstCampaignCheckbox = within(screen.getAllByRole('row')[1]).getByRole('checkbox');

    await user.click(firstCampaignCheckbox);
    expect(firstCampaignCheckbox).toBeChecked();

    await user.click(firstCampaignCheckbox);

    expect(firstCampaignCheckbox).not.toBeChecked();
    expect(screen.getByText(/no training campaigns selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });

  it('clears multiple selected campaigns', async () => {
    const user = userEvent.setup();
    renderPage({
      initialSelectedCampaignIds: [
        mockAssignableCampaigns[0].campaignId,
        mockAssignableCampaigns[1].campaignId,
      ],
    });

    await waitForCampaignsToLoad();
    expect(screen.getByText(/2 training campaigns selected/i)).toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getByRole('checkbox')).toBeChecked();
    expect(within(screen.getAllByRole('row')[2]).getByRole('checkbox')).toBeChecked();

    await user.click(screen.getByRole('button', { name: /clear selection/i }));

    expect(screen.getByText(/no training campaigns selected/i)).toBeInTheDocument();

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it('renders fallback values for campaigns without optional details', async () => {
    mockAssignableCampaigns.push({
      campaignId: '41111111-1111-4111-8111-111111111199',
      name: 'Custom Security Refresher',
      description: null,
      status: 'PAUSED',
      type: 'ORGANISATION_CUSTOM',
      itemCount: 3,
      startDate: null,
      endDate: null,
      assignmentCount: 0,
    });

    renderPage();

    await waitForCampaignsToLoad();
    const customCampaignRow = screen.getByText('Custom Security Refresher').closest('tr');

    expect(customCampaignRow).not.toBeNull();
    expect(within(customCampaignRow as HTMLTableRowElement).getAllByText('—')).toHaveLength(2);
    expect(
      within(customCampaignRow as HTMLTableRowElement).getByText('Paused'),
    ).toBeInTheDocument();
    expect(
      within(customCampaignRow as HTMLTableRowElement).getByText('Organisation'),
    ).toBeInTheDocument();
  });
});
