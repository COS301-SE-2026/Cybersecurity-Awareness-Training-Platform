import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  GetCampaignCatalogueResponseDto,
  CampaignDetailResponseDto,
} from '@insightful-phish/shared';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred } from '../../testing/render';
import type { CampaignManagementClient } from './campaignManagementClient';
import CampaignManagementDetailPage from './CampaignManagementDetailPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}`;
const DETAIL_ROUTE = '/organisations/:organisationId/campaigns/:campaignId';

type DetailClient = Pick<
  CampaignManagementClient,
  'getCampaignCatalogue' | 'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
>;

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
  createdBy: null,
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-14T09:30:00.000Z',
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

const CATALOGUE_RESPONSE: GetCampaignCatalogueResponseDto = {
  items: [
    {
      id: '50000000-0000-4000-8000-000000000001',
      type: 'TRAINING_DOCUMENT',
      title: 'Password security essentials',
      description: 'Practical guidance for creating and protecting strong passwords.',
      contentType: 'AWARENESS_BRIEF',
      estimatedReadTimeMinutes: 8,
      difficultyLevel: 'BEGINNER',
      status: 'AVAILABLE',
    },
    {
      id: '50000000-0000-4000-8000-000000000002',
      type: 'QUIZ',
      title: 'Password safety quiz',
      description: 'Check understanding of password security practices.',
      passThresholdPercentage: 80,
      questionCount: 5,
      difficultyLevel: 'INTERMEDIATE',
      status: 'PUBLISHED',
    },
    {
      id: '50000000-0000-4000-8000-000000000003',
      type: 'SIMULATED_INBOX',
      title: 'Invoice phishing simulation',
      description: 'Identify suspicious messages in a simulated inbox.',
      emailCount: 4,
      difficultyLevel: 'ADVANCED',
      status: 'ACTIVE',
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 3,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

function renderPage(client: DetailClient) {
  return render(
    <MemoryRouter initialEntries={[DETAIL_PATH]}>
      <Routes>
        <Route
          path={DETAIL_ROUTE}
          element={<CampaignManagementDetailPage contextKind="organisation" client={client} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CampaignManagementDetailPage catalogue', () => {
  it('loads and displays catalogue items for an editable Draft', async () => {
    const catalogueRequest = createDeferred<GetCampaignCatalogueResponseDto>();
    const getCampaignCatalogue = vi.fn(() => catalogueRequest.promise);

    renderPage({
      getCampaignCatalogue,
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft: vi.fn(),
    });

    expect(await screen.findByText('Loading catalogue…')).toBeInTheDocument();

    await act(async () => {
      catalogueRequest.resolve(CATALOGUE_RESPONSE);
      await catalogueRequest.promise;
    });

    expect(
      await screen.findByRole('heading', { name: 'Password security essentials' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Training Document')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getAllByText('Simulated Inbox')).toHaveLength(2);
    expect(getCampaignCatalogue).toHaveBeenCalledWith(
      {
        kind: 'organisation',
        organisationId: ORGANISATION_ID,
      },
      {
        page: 1,
        limit: 10,
      },
    );
  });

  it('retries a failed catalogue load and displays the returned items', async () => {
    const user = userEvent.setup();
    const getCampaignCatalogue = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(CATALOGUE_RESPONSE);

    renderPage({
      getCampaignCatalogue,
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft: vi.fn(),
    });

    expect(
      await screen.findByText('Campaign catalogue could not be loaded. Try again.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { name: 'Password security essentials' }),
    ).toBeInTheDocument();
    expect(getCampaignCatalogue).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText('Campaign catalogue could not be loaded. Try again.'),
    ).not.toBeInTheDocument();
  });

  it('resets pagination for search and type changes without submitting the Campaign', async () => {
    const user = userEvent.setup();
    const updateCampaignDraft = vi.fn();
    const firstPage = {
      ...CATALOGUE_RESPONSE,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 13,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };
    const secondPage = {
      ...CATALOGUE_RESPONSE,
      pagination: {
        page: 2,
        limit: 10,
        totalItems: 13,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    const getCampaignCatalogue = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce(CATALOGUE_RESPONSE)
      .mockResolvedValueOnce(CATALOGUE_RESPONSE);

    renderPage({
      getCampaignCatalogue,
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft,
    });

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(getCampaignCatalogue).toHaveBeenLastCalledWith(expect.anything(), {
        page: 2,
        limit: 10,
        search: undefined,
      });
    });
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();

    const search = screen.getByRole('searchbox', { name: 'Search catalogue' });

    fireEvent.change(search, { target: { value: 'password' } });

    await waitFor(() => {
      expect(getCampaignCatalogue).toHaveBeenLastCalledWith(expect.anything(), {
        page: 1,
        limit: 10,
        search: 'password',
      });
    });

    await user.type(search, `{enter}`);

    expect(updateCampaignDraft).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Content type' }), {
      target: { value: 'QUIZ' },
    });

    await waitFor(() => {
      expect(getCampaignCatalogue).toHaveBeenLastCalledWith(expect.anything(), {
        page: 1,
        limit: 10,
        search: 'password',
        type: 'QUIZ',
      });
    });
  });

  it('uses authoritative pagination metadata for Previous and Next', async () => {
    const user = userEvent.setup();
    const firstPage = {
      ...CATALOGUE_RESPONSE,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 13,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };
    const secondPage = {
      ...CATALOGUE_RESPONSE,
      pagination: {
        page: 2,
        limit: 10,
        totalItems: 13,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    const getCampaignCatalogue = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    renderPage({
      getCampaignCatalogue,
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft: vi.fn(),
    });

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(getCampaignCatalogue).toHaveBeenLastCalledWith(expect.anything(), {
        page: 2,
        limit: 10,
        search: undefined,
      });
    });

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('ignores an older catalogue response after a newer query resolves', async () => {
    const olderRequest = createDeferred<GetCampaignCatalogueResponseDto>();
    const newerRequest = createDeferred<GetCampaignCatalogueResponseDto>();
    const emptyResponse: GetCampaignCatalogueResponseDto = {
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    const olderResponse: GetCampaignCatalogueResponseDto = {
      ...emptyResponse,
      items: [
        {
          ...CATALOGUE_RESPONSE.items[0],
          title: 'Older search result',
        },
      ],
    };
    const newerResponse: GetCampaignCatalogueResponseDto = {
      ...emptyResponse,
      items: [
        {
          ...CATALOGUE_RESPONSE.items[0],
          title: 'Newer search result',
        },
      ],
    };
    const getCampaignCatalogue = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse)
      .mockImplementationOnce(() => olderRequest.promise)
      .mockImplementationOnce(() => newerRequest.promise);

    renderPage({
      getCampaignCatalogue,
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft: vi.fn(),
    });

    await screen.findByText('No catalogue items found.');

    const search = screen.getByRole('searchbox', { name: 'Search catalogue' });

    fireEvent.change(search, { target: { value: 'older' } });

    await waitFor(() => {
      expect(getCampaignCatalogue).toHaveBeenCalledTimes(2);
    });

    fireEvent.change(search, { target: { value: 'newer' } });

    await waitFor(() => {
      expect(getCampaignCatalogue).toHaveBeenCalledTimes(3);
    });

    await act(async () => {
      newerRequest.resolve(newerResponse);
      await newerRequest.promise;
    });

    expect(await screen.findByRole('heading', { name: 'Newer search result' })).toBeInTheDocument();

    await act(async () => {
      olderRequest.resolve(olderResponse);
      await olderRequest.promise;
    });

    expect(screen.getByRole('heading', { name: 'Newer search result' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Older search result' })).not.toBeInTheDocument();
  });
});
