import type { CampaignDetailResponseDto } from '@insightful-phish/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import CampaignManagementDetailPage from './CampaignManagementDetailPage';
import type { CampaignManagementClient } from './campaignManagementClient';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}`;

type DetailClient = Pick<
  CampaignManagementClient,
  'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
>;

const INITIAL_DETAIL: CampaignDetailResponseDto = {
  id: CAMPAIGN_ID,
  organisationId: ORGANISATION_ID,
  name: 'Initial Draft',
  description: null,
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  startDate: null,
  endDate: null,
  createdBy: null,
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-14T09:30:00.000Z',
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

const FIRST_UPDATE: CampaignDetailResponseDto = {
  ...INITIAL_DETAIL,
  name: 'First saved name',
  updatedAt: '2026-08-16T10:00:00.000Z',
};

const SECOND_UPDATE: CampaignDetailResponseDto = {
  ...FIRST_UPDATE,
  name: 'Second saved name',
  updatedAt: '2026-08-16T10:00:01.000Z',
};

function renderPage(client: DetailClient) {
  return render(
    <MemoryRouter initialEntries={[DETAIL_PATH]}>
      <Routes>
        <Route
          path="/organisations/:organisationId/campaigns/:campaignId"
          element={<CampaignManagementDetailPage contextKind="organisation" client={client} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CampaignManagementDetailPage Draft updates', () => {
  it('uses each authoritative response as the next baseline and update token', async () => {
    const user = userEvent.setup();
    const updateCampaignDraft = vi
      .fn()
      .mockResolvedValueOnce(FIRST_UPDATE)
      .mockResolvedValueOnce(SECOND_UPDATE);

    renderPage({
      getCampaignDetail: vi.fn().mockResolvedValue(INITIAL_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft,
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'First saved name');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateCampaignDraft).toHaveBeenNthCalledWith(
        1,
        {
          kind: 'organisation',
          organisationId: ORGANISATION_ID,
        },
        CAMPAIGN_ID,
        {
          name: 'First saved name',
          description: null,
          accentColor: '#8400FF',
          startDate: null,
          endDate: null,
          items: [],
          expectedUpdatedAt: INITIAL_DETAIL.updatedAt,
        },
      );
    });

    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(FIRST_UPDATE.name);
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();

    const updatedName = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(updatedName);
    await user.type(updatedName, 'Second saved name');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateCampaignDraft).toHaveBeenNthCalledWith(
        2,
        {
          kind: 'organisation',
          organisationId: ORGANISATION_ID,
        },
        CAMPAIGN_ID,
        expect.objectContaining({
          name: 'Second saved name',
          expectedUpdatedAt: FIRST_UPDATE.updatedAt,
        }),
      );
    });

    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(SECOND_UPDATE.name);
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });
});
