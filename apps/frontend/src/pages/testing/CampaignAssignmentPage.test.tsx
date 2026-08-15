import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import CampaignAssignmentPage from '../CampaignAssignmentPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CampaignAssignmentPage />
    </MemoryRouter>,
  );
}

describe('CampaignAssignmentPage', () => {
  it('renders the page heading and instructions', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        name: /assign training campaigns/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /select the organisation trainees you want to assign training campaigns to/i,
      ),
    ).toBeInTheDocument();
  });

  it('starts on trainee selection and disables later steps until prerequisites are selected', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /organisation trainee selection/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /2\. training campaign selection/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /3\. review assignment/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
    expect(screen.getByText(/no organisation trainees selected/i)).toBeInTheDocument();
  });

  it('selects trainees, clears them, and returns to the first step if trainee selection is removed', async () => {
    const user = userEvent.setup();
    renderPage();

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

    const traineeRows = screen.getAllByRole('row');
    await user.click(within(traineeRows[1]).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(screen.getByRole('heading', { name: /training campaign selection/i })).toBeVisible();
    expect(screen.getByText(/no training campaigns selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3\. review assignment/i })).toBeDisabled();

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

    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await user.click(screen.getByRole('button', { name: /^back$/i }));

    expect(screen.getByRole('heading', { name: /training campaign selection/i })).toBeVisible();
    expect(screen.getByText(/1 training campaign selected/i)).toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getByRole('checkbox')).toBeChecked();
  });
});
