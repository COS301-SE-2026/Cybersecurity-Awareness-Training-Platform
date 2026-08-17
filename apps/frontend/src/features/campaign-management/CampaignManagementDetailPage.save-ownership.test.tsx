import type { CampaignDetailResponseDto } from '@insightful-phish/shared';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred } from '../../testing/render';
import CampaignManagementDetailPage from './CampaignManagementDetailPage';
import type { CampaignManagementClient } from './campaignManagementClient';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_A_ID = '10000000-0000-4000-8000-000000000001';
const CAMPAIGN_B_ID = '10000000-0000-4000-8000-000000000002';
const ROUTE = '/organisations/:organisationId/campaigns/:campaignId';
const PATH_A = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_A_ID}`;
const PATH_B = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_B_ID}`;

type DetailClient = Pick<
  CampaignManagementClient,
  'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
>;

function createDetail(id: string, name: string): CampaignDetailResponseDto {
  return {
    id,
    organisationId: ORGANISATION_ID,
    name,
    description: null,
    accentColor: '#9400FF',
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
}

function RouteHarness({ client }: { client: DetailClient }) {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate(PATH_B)}>
        Open Campaign B
      </button>

      <Routes>
        <Route
          path={ROUTE}
          element={<CampaignManagementDetailPage contextKind="organisation" client={client} />}
        />
      </Routes>
    </>
  );
}

describe('CampaignManagementDetailPage save ownership', () => {
  it('does not let Campaign A completion clear Campaign B pending state', async () => {
    const user = userEvent.setup();
    const detailA = createDetail(CAMPAIGN_A_ID, 'Campaign A');
    const detailB = createDetail(CAMPAIGN_B_ID, 'Campaign B');
    const updatedA = {
      ...detailA,
      name: 'Saved Campaign A',
      updatedAt: '2026-08-16T10:00:00.000Z',
    };
    const updatedB = {
      ...detailB,
      name: 'Saved Campaign B',
      updatedAt: '2026-08-16T10:00:01.000Z',
    };
    const saveA = createDeferred<CampaignDetailResponseDto>();
    const saveB = createDeferred<CampaignDetailResponseDto>();

    const getCampaignDetail = vi.fn(async (_context, campaignId: string) =>
      campaignId === CAMPAIGN_A_ID ? detailA : detailB,
    );
    const updateCampaignDraft = vi.fn(async (_context, campaignId: string) =>
      campaignId === CAMPAIGN_A_ID ? saveA.promise : saveB.promise,
    );

    render(
      <MemoryRouter initialEntries={[PATH_A]}>
        <RouteHarness
          client={{
            getCampaignDetail,
            createCampaignDraft: vi.fn(),
            updateCampaignDraft,
          }}
        />
      </MemoryRouter>,
    );

    const nameA = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(nameA);
    await user.type(nameA, 'Local Campaign A');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByRole('button', { name: 'Saving Changes…' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Open Campaign B' }));

    const nameB = await screen.findByRole('textbox', { name: 'Campaign name' });

    expect(nameB).toHaveValue('Campaign B');

    await user.clear(nameB);
    await user.type(nameB, 'Local Campaign B');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(updateCampaignDraft).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Saving Changes…' })).toBeDisabled();

    await act(async () => {
      saveA.resolve(updatedA);
      await saveA.promise;
    });

    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('Local Campaign B');
    expect(screen.getByRole('button', { name: 'Saving Changes…' })).toBeDisabled();
    expect(screen.queryByText('Campaign could not be saved. Try again.')).not.toBeInTheDocument();

    await act(async () => {
      saveB.resolve(updatedB);
      await saveB.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(
        'Saved Campaign B',
      );
    });
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });
});
