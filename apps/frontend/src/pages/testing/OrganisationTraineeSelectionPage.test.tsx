import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import OrganisationTraineeSelectionPage from '../campaign-assignment/OrganisationTraineeSelectionPage';
import {
  mockTraineeCandidates,
  mockCampaignAssignmentCandidatesResponse,
} from '../../testing/fixtures/campaignAssignmentFixtures';

import { getCampaignAssignmentCandidates } from '../../services/campaign-assignment.service';

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
}));

const mockedGetCampaignAssignmentCandidates = vi.mocked(getCampaignAssignmentCandidates);

type RenderPageOptions = {
  initialSelectedTraineeIds?: string[];
  onContinue?: () => void;
};

function TestHarness({ initialSelectedTraineeIds = [], onContinue = vi.fn() }: RenderPageOptions) {
  const [selectedTraineeIds, setSelectedTraineesIds] = useState(initialSelectedTraineeIds);
  const [, setSelectedTrainees] = useState(
    mockTraineeCandidates.filter((trainee) =>
      initialSelectedTraineeIds.includes(trainee.traineeProfileId),
    ),
  );

  return (
    <OrganisationTraineeSelectionPage
      selectedTraineeIds={selectedTraineeIds}
      setSelectedTraineesIds={setSelectedTraineesIds}
      setSelectedTrainees={setSelectedTrainees}
      onContinue={onContinue}
    />
  );
}

function renderPage(options: RenderPageOptions = {}) {
  mockedGetCampaignAssignmentCandidates.mockResolvedValue(mockCampaignAssignmentCandidatesResponse);

  return render(<TestHarness {...options} />);
}

describe('OrganisationTraineeSelectionPage', () => {
  it('renders the step heading, search input, table headings, and trainee rows', async () => {
    renderPage();

    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /organisation trainee selection/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/search organisation trainees/i)).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();

    await waitFor(() => {
      for (const trainee of mockTraineeCandidates) {
        expect(screen.getByText(trainee.displayName)).toBeInTheDocument();
        expect(screen.getByText(trainee.email)).toBeInTheDocument();
      }
    });
  });

  it('starts with no selected trainees and disables selection actions', async () => {
    renderPage();

    expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockTraineeCandidates.length);
    });

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it('selects one trainee, enables continue, and calls onContinue', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    renderPage({ onContinue });

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockTraineeCandidates.length);
    });

    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));

    expect(screen.getByText(/1 organisation trainee selected/i)).toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('toggles a selected trainee off again', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockTraineeCandidates.length);
    });

    const firstTraineeCheckbox = within(screen.getAllByRole('row')[1]).getByRole('checkbox');

    await user.click(firstTraineeCheckbox);
    expect(firstTraineeCheckbox).toBeChecked();

    await user.click(firstTraineeCheckbox);

    expect(firstTraineeCheckbox).not.toBeChecked();
    expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });

  it('clears multiple selected trainees', async () => {
    const user = userEvent.setup();

    renderPage({
      initialSelectedTraineeIds: [
        mockTraineeCandidates[0].traineeProfileId,
        mockTraineeCandidates[1].traineeProfileId,
      ],
    });

    expect(screen.getByText(/2 organisation trainees selected/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(within(screen.getAllByRole('row')[1]).getByRole('checkbox')).toBeChecked();

      expect(within(screen.getAllByRole('row')[2]).getByRole('checkbox')).toBeChecked();
    });

    await user.click(screen.getByRole('button', { name: /clear selection/i }));

    expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
  });
});
