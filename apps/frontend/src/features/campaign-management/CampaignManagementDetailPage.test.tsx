import { screen } from '@testing-library/react';
import type { CampaignDetailResponseDto } from '@insightful-phish/shared';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../testing/render';
import type { CampaignManagementClient } from './campaignManagementClient';
import CampaignManagementDetailPage from './CampaignManagementDetailPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

type DetailClient = Pick<CampaignManagementClient, 'getCampaignDetail'>;

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const NEW_ROUTE = '/organisations/:organisationId/campaigns/new';
const DETAIL_ROUTE = '/organisations/:organisationId/campaigns/:campaignId';
const NEW_PATH = `/organisations/${ORGANISATION_ID}/campaigns/new`;
const DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}`;

const DRAFT_DETAIL: CampaignDetailResponseDto = {
  id: CAMPAIGN_ID,
  organisationId: ORGANISATION_ID,
  name: 'Authoritative Draft Campaign',
  description: 'Draft detail from the client.',
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  startDate: null,
  endDate: null,
  createdBy: {
    id: '20000000-0000-4000-8000-000000000001',
    displayName: 'Organisation Administrator',
  },
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-14T09:30:00.000Z',
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

function renderPage(path: string, routePath: string, client: DetailClient) {
  return renderWithRouter(
    <CampaignManagementDetailPage contextKind="organisation" client={client} />,
    {
      initialEntry: path,
      routePath,
    },
  );
}

describe('CampaignManagementDetailPage', () => {
  it('does not load detail for a new Campaign route', () => {
    const getCampaignDetail = vi.fn();

    renderPage(NEW_PATH, NEW_ROUTE, { getCampaignDetail });

    expect(screen.getByRole('heading', { level: 1, name: 'Create Campaign' })).toBeInTheDocument();
    expect(getCampaignDetail).not.toHaveBeenCalled();
  });

  it('shows authoritative editable Draft detail', async () => {
    const getCampaignDetail = vi.fn().mockResolvedValue(DRAFT_DETAIL);

    renderPage(DETAIL_PATH, DETAIL_ROUTE, { getCampaignDetail });

    expect(screen.getByText('Loading campaign…')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Draft Campaign' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: DRAFT_DETAIL.name })).toBeInTheDocument();
  });

  it('keeps a Draft without EDIT authority read-only', async () => {
    const viewOnlyDraft: CampaignDetailResponseDto = {
      ...DRAFT_DETAIL,
      allowedActions: ['VIEW'],
    };

    renderPage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(viewOnlyDraft),
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Draft Campaign' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This Campaign is currently read-only.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Edit Draft Campaign' }),
    ).not.toBeInTheDocument();
  });

  it('treats an Active Campaign as successful read-only detail', async () => {
    const activeDetail: CampaignDetailResponseDto = {
      ...DRAFT_DETAIL,
      name: 'Authoritative Active Campaign',
      status: 'ACTIVE',
      allowedActions: ['VIEW', 'ARCHIVE'],
    };

    renderPage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(activeDetail),
    });

    expect(
      await screen.findByRole('heading', { level: 2, name: activeDetail.name }),
    ).toBeInTheDocument();
    expect(screen.getByText('Status: ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('This Campaign is currently read-only.')).toBeInTheDocument();
    expect(screen.queryByText('Campaign could not be loaded. Try again.')).not.toBeInTheDocument();
  });
});
