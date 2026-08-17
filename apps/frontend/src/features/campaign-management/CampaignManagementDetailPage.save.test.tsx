import type { CampaignDetailResponseDto } from '@insightful-phish/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CampaignManagementDetailPage from './CampaignManagementDetailPage';
import type { CampaignManagementClient } from './campaignManagementClient';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '40000000-0000-4000-8000-000000000001';
const LIST_PATH = `/organisations/${ORGANISATION_ID}/campaigns`;
const NEW_PATH = `${LIST_PATH}/new`;
const DETAIL_PATH = `${LIST_PATH}/${CAMPAIGN_ID}`;

type DetailClient = Pick<
  CampaignManagementClient,
  'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
>;

const CREATED_DETAIL: CampaignDetailResponseDto = {
  id: CAMPAIGN_ID,
  organisationId: ORGANISATION_ID,
  name: 'Created Campaign',
  description: 'Created Description',
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  startDate: '2026-09-01T08:00:00.000Z',
  endDate: '2026-10-01T17:00:00.000Z',
  createdBy: null,
  createdAt: '2026-08-16T10:00:00.000Z',
  updatedAt: '2026-08-16T10:00:00.000Z',
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

function SavedDestination() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <p>Saved destination: {location.pathname}</p>
      <button type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
    </div>
  );
}

function renderNewPage(client: DetailClient) {
  return render(
    <MemoryRouter initialEntries={[LIST_PATH, NEW_PATH]} initialIndex={1}>
      <Routes>
        <Route path={LIST_PATH} element={<div>Campaign list destination</div>} />
        <Route
          path="/organisations/:organisationId/campaigns/new"
          element={<CampaignManagementDetailPage contextKind="organisation" client={client} />}
        />
        <Route
          path="/organisations/:organisationId/campaigns/:campaignId"
          element={<SavedDestination />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CampaignManagementDetailPage new Draft saving', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'Africa/Johannesburg');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('created a Draft and replaces /new with the authoritative ID', async () => {
    const user = userEvent.setup();
    const createCampaignDraft = vi.fn().mockResolvedValue(CREATED_DETAIL);

    renderNewPage({
      getCampaignDetail: vi.fn(),
      createCampaignDraft,
      updateCampaignDraft: vi.fn(),
    });

    await user.type(
      screen.getByRole('textbox', { name: 'Campaign name' }),
      '   Created Campaign  ',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      '   Created description   ',
    );

    fireEvent.change(screen.getByLabelText('Start date and time'), {
      target: { value: '2026-09-01T10:00' },
    });
    fireEvent.change(screen.getByLabelText('End date and time'), {
      target: { value: '2026-09-01T19:00' },
    });

    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => {
      expect(createCampaignDraft).toHaveBeenCalledWith(
        {
          kind: 'organisation',
          organisationId: ORGANISATION_ID,
        },
        {
          name: 'Created Campaign',
          description: 'Created description',
          accentColor: '#8400FF',
          startDate: '2026-09-01T08:00:00.000Z',
          endDate: '2026-09-01T17:00:00.000Z',
          items: [],
        },
      );
    });

    expect(await screen.findByText(`Saved destination: ${DETAIL_PATH}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go back' }));

    expect(screen.getByText('Campaign list destination')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Create Campaign' }),
    ).not.toBeInTheDocument();
  });

  it('preserves the dirty local Draft after create failure', async () => {
    const user = userEvent.setup();
    const createCampaignDraft = vi.fn().mockRejectedValue(new Error('Unavailable'));

    renderNewPage({
      getCampaignDetail: vi.fn(),
      createCampaignDraft,
      updateCampaignDraft: vi.fn(),
    });

    const name = screen.getByRole('textbox', { name: 'Campaign name' });

    await user.type(name, 'Unsaved local Campaign');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(await screen.findByText('Campaign could not be saved.')).toBeInTheDocument();
    expect(name).toHaveValue('Unsaved local Campaign');
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
  });
});
