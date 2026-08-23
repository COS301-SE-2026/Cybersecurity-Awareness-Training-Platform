import type { CampaignDetailResponseDto } from '@insightful-phish/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import CampaignManagementDetailPage from './CampaignManagementDetailPage';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}`;

type DetailClient = Pick<
  CampaignManagementClient,
  'getCampaignCatalogue' | 'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
>;

const PERSISTED_ITEM = {
  itemType: 'COMPONENT',
  campaignItemId: '90000000-0000-4000-8000-000000000001',
  componentType: 'QUIZ',
  contentId: '50000000-0000-4000-8000-000000000002',
  title: 'Password safety quiz',
  description: 'Check understanding of password security practices.',
  position: 10,
  isRequired: true,
  sourceAvailable: true,
} as const;

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
  items: [PERSISTED_ITEM],
};

const FIRST_UPDATE: CampaignDetailResponseDto = {
  ...INITIAL_DETAIL,
  name: 'First saved name',
  updatedAt: '2026-08-16T10:00:00.000Z',
  items: [{ ...PERSISTED_ITEM, isRequired: false }],
};

const SECOND_UPDATE: CampaignDetailResponseDto = {
  ...FIRST_UPDATE,
  name: 'Second saved name',
  updatedAt: '2026-08-16T10:00:01.000Z',
};

const ACTIVE_DETAIL: CampaignDetailResponseDto = {
  ...INITIAL_DETAIL,
  name: 'Authoritative Active Campaign',
  status: 'ACTIVE',
  updatedAt: '2026-08-16T11:00:00.000Z',
  allowedActions: ['VIEW'],
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

const EMPTY_CATALOGUE = {
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousePage: false,
  },
};

describe('CampaignManagementDetailPage Draft updates', () => {
  it('uses each authoritative response as the next baseline and update token', async () => {
    const user = userEvent.setup();
    const updateCampaignDraft = vi
      .fn()
      .mockResolvedValueOnce(FIRST_UPDATE)
      .mockResolvedValueOnce(SECOND_UPDATE);

    renderPage({
      getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
      getCampaignDetail: vi.fn().mockResolvedValue(INITIAL_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft,
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'First saved name');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Requirement for Password safety quiz' }),
      'optional',
    );
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
          items: [
            {
              itemType: 'COMPONENT',
              campaignItemId: PERSISTED_ITEM.campaignItemId,
              componentType: PERSISTED_ITEM.componentType,
              contentId: PERSISTED_ITEM.contentId,
              isRequired: false,
            },
          ],
          expectedUpdatedAt: INITIAL_DETAIL.updatedAt,
        },
      );
    });

    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(FIRST_UPDATE.name);
    expect(
      screen.getByRole('combobox', { name: 'Requirement for Password safety quiz' }),
    ).toHaveValue('optional');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();

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
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
  });

  it('restores the authoritative item requirement on Discard', async () => {
    const user = userEvent.setup();
    const updateCampaignDraft = vi.fn();

    renderPage({
      getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
      getCampaignDetail: vi.fn().mockResolvedValue(INITIAL_DETAIL),
      createCampaignDraft: vi.fn(),
      updateCampaignDraft,
    });

    const requirement = await screen.findByRole('combobox', {
      name: 'Requirement for Password safety quiz',
    });

    expect(requirement).toHaveValue('required');
    await user.selectOptions(requirement, 'optional');
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));

    const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }));
    expect(
      screen.getByRole('combobox', { name: 'Requirement for Password safety quiz' }),
    ).toHaveValue('required');
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
    expect(updateCampaignDraft).not.toHaveBeenCalled();
  });

  it('preserves conflicting edits until authoritative reload is confirmed', async () => {
    const user = userEvent.setup();
    const getCampaignDetail = vi
      .fn()
      .mockResolvedValueOnce(INITIAL_DETAIL)
      .mockResolvedValueOnce({
        ...INITIAL_DETAIL,
        name: 'Authoritative Campaign',
        updatedAt: '2026-08-16T12:00:00.000Z',
      });
    const updateCampaignDraft = vi
      .fn()
      .mockRejectedValue(new CampaignManagementClientError('CAMPAIGN_CHANGED'));

    renderPage({
      getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
      getCampaignDetail,
      createCampaignDraft: vi.fn(),
      updateCampaignDraft,
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Local conflicting name');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(
      await screen.findByText('This Draft has changed since you opened it.'),
    ).toBeInTheDocument();
    expect(name).toHaveValue('Local conflicting name');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Reload Draft' }));

    const dialog = screen.getByRole('dialog', { name: 'Reload Draft?' });

    expect(
      within(dialog).getByText('Reloading will replace your local Campaign Draft changes.'),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(name).toHaveValue('Local conflicting name');

    await user.click(screen.getByRole('button', { name: 'Reload Draft' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Reload Draft?' })).getByRole('button', {
        name: 'Reload Draft',
      }),
    );

    expect(await screen.findByDisplayValue('Authoritative Campaign')).toBeInTheDocument();
    expect(getCampaignDetail).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
  });

  it('reloads authoritative read-only state when the Draft become immutable', async () => {
    const user = userEvent.setup();
    const getCampaignDetail = vi
      .fn()
      .mockResolvedValueOnce(INITIAL_DETAIL)
      .mockResolvedValueOnce(ACTIVE_DETAIL);
    const updateCampaignDraft = vi
      .fn()
      .mockRejectedValue(new CampaignManagementClientError('CAMPAIGN_IMMUTABLE'));

    renderPage({
      getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
      getCampaignDetail,
      createCampaignDraft: vi.fn(),
      updateCampaignDraft,
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Local edited Campaign');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    const readOnlyDetail = await screen.findByRole('region', {
      name: 'Authoritative Active Campaign',
    });

    expect(within(readOnlyDetail).getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(getCampaignDetail).toHaveBeenCalledTimes(2);
  });
});
