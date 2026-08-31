import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CampaignAssignmentPage from '../CampaignAssignmentPage';
import {
  createCampaignAssignments,
  getAssignableCampaigns,
  getCampaignAssignmentCandidates,
} from '../../services/campaign-assignment.service';
import {
  mockAssignableCampaignsResponse,
  mockCampaignAssignmentCandidatesResponse,
} from '../../testing/fixtures/campaignAssignmentFixtures';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

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
  getCampaignAssignmentCandidates: vi.fn(),
  getAssignableCampaigns: vi.fn(),
  createCampaignAssignments: vi.fn(),
}));

const mockedGetCampaignAssignmentCandidates = vi.mocked(getCampaignAssignmentCandidates);
const mockedGetAssignableCampaigns = vi.mocked(getAssignableCampaigns);
const mockedCreateCampaignAssignments = vi.mocked(createCampaignAssignments);

function renderPage() {
  mockedGetCampaignAssignmentCandidates.mockResolvedValue(mockCampaignAssignmentCandidatesResponse);
  mockedGetAssignableCampaigns.mockResolvedValue(mockAssignableCampaignsResponse);

  return render(
    <MemoryRouter>
      <CampaignAssignmentPage />
    </MemoryRouter>,
  );
}

async function waitForTraineesToLoad() {
  await waitFor(() => {
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });
}

async function waitForCampaignsToLoad() {
  await waitFor(() => {
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });
}

async function completeOneAssignment(user: ReturnType<typeof userEvent.setup>) {
  await waitForTraineesToLoad();
  await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /^continue$/i }));
  await waitForCampaignsToLoad();
  await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /^continue$/i }));
  await user.click(screen.getByRole('button', { name: /complete assignment/i }));
  await user.click(screen.getByRole('button', { name: /confirm assignment/i }));
}

describe('CampaignAssignmentPage', () => {
  it('renders the page heading and instructions', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /assign training campaigns/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /select the organisation trainees you want to assign training campaigns to/i,
      ),
    ).toBeInTheDocument();
  });

  it('starts on trainee selection and disables later steps until prerequisites are selected', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /organisation trainee selection/i })).toBeVisible();

    expect(screen.getByRole('button', { name: /2\. training campaign selection/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /3\. review assignment/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
    expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();

    await waitForTraineesToLoad();
  });

  it('selects trainees, clears them, and returns to the first step if trainee selection is removed', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitForTraineesToLoad();
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));

    expect(screen.getByText(/1 organisation trainee selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2\. training campaign selection/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(screen.getByRole('heading', { name: /training campaign selection/i })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /1\. organisation trainee selection/i }));
    await user.click(screen.getByRole('button', { name: /clear selection/i }));

    expect(screen.getByRole('heading', { name: /organisation trainee selection/i })).toBeVisible();
    expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2\. training campaign selection/i })).toBeDisabled();
  });

  it('walks through trainee and campaign selection into the review step', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitForTraineesToLoad();

    const traineeRows = screen.getAllByRole('row');

    await user.click(within(traineeRows[1]).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(screen.getByRole('heading', { name: /training campaign selection/i })).toBeVisible();
    expect(screen.getByText(/no training campaigns selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3\. review assignment/i })).toBeDisabled();

    await waitForCampaignsToLoad();
    const campaignRows = screen.getAllByRole('row');

    await user.click(within(campaignRows[1]).getByRole('checkbox'));

    expect(screen.getByText(/1 training campaign selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3\. review assignment/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(screen.getByRole('heading', { name: /review campaign assignment/i })).toBeVisible();
    expect(
      screen.getByText(/assigning 1 training campaign\(s\) to 1 organisation trainee\(s\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 total assignment\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText('Connor Bell')).toBeInTheDocument();
    expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeEnabled();
  });

  it('goes back from review to campaign selection without losing campaign selection', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitForTraineesToLoad();
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitForCampaignsToLoad();
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /^back$/i }));

    expect(screen.getByRole('heading', { name: /training campaign selection/i })).toBeVisible();
    expect(screen.getByText(/1 training campaign selected/i)).toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getByRole('checkbox')).toBeChecked();
  });

  it.each([
    [1, 0, '1 Assignment(s) Were Created Successfully'],
    [0, 1, 'No New Assignments Were Created. All 1 Requested Assignment(s) Were Already Assigned'],
    [1, 1, '1 Assignment(s) Were Created And 1 Were Already Assigned'],
  ])(
    'keeps the authoritative result visible for created=%i and already-assigned=%i',
    async (createdCount, alreadyAssignedCount, expectedMessage) => {
      const user = userEvent.setup();
      mockedCreateCampaignAssignments.mockResolvedValue({
        created: Array.from({ length: createdCount }, () => ({
          assignmentId: '51111111-1111-4111-8111-111111111111',
          campaignId: mockAssignableCampaignsResponse.items[0].campaignId,
          traineeProfileId: mockCampaignAssignmentCandidatesResponse.items[0].traineeProfileId,
        })),
        alreadyAssigned: Array.from({ length: alreadyAssignedCount }, () => ({
          assignmentId: '51111111-1111-4111-8111-111111111112',
          campaignId: mockAssignableCampaignsResponse.items[0].campaignId,
          traineeProfileId: mockCampaignAssignmentCandidatesResponse.items[0].traineeProfileId,
        })),
        summary: {
          requestedCampaigns: 1,
          requestedTrainees: createdCount + alreadyAssignedCount,
          requestedPairs: createdCount + alreadyAssignedCount,
          createdCount,
          alreadyAssignedCount,
        },
      });

      renderPage();
      await completeOneAssignment(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
      expect(
        screen.getByRole('heading', { name: /organisation trainee selection/i }),
      ).toBeVisible();
      expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    },
  );
});
