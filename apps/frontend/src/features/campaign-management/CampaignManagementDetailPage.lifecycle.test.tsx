import type {
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
} from '@insightful-phish/shared';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred } from '../../testing/render';
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

type LifecycleClient = Pick<
  CampaignManagementClient,
  | 'getCampaignCatalogue'
  | 'getCampaignDetail'
  | 'createCampaignDraft'
  | 'updateCampaignDraft'
  | 'activateCampaign'
> &
  Partial<
    Pick<CampaignManagementClient, 'activateCampaign' | 'archiveCampaign' | 'reactivateCampaign'>
  >;

type LifecycleMethods = Partial<
  Pick<CampaignManagementClient, 'activateCampaign' | 'archiveCampaign' | 'reactivateCampaign'>
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

const VALID_DRAFT: CampaignDetailResponseDto = {
  id: CAMPAIGN_ID,
  organisationId: ORGANISATION_ID,
  name: 'Activation Draft',
  description: null,
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  startDate: null,
  endDate: null,
  createdBy: null,
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-14T09:30:00.000Z',
  allowedActions: ['VIEW', 'EDIT', 'ACTIVATE'],
  items: [PERSISTED_ITEM],
};

const EMPTY_DRAFT: CampaignDetailResponseDto = {
  ...VALID_DRAFT,
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

const ACTIVE_CAMPAIGN: CampaignDetailResponseDto = {
  ...VALID_DRAFT,
  name: 'Active Awareness Campaign',
  status: 'ACTIVE',
  allowedActions: ['VIEW', 'ARCHIVE'],
};

const EMPTY_CATALOGUE = {
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

function renderPage(detail: CampaignDetailResponseDto, lifecycleMethods: LifecycleMethods = {}) {
  const client: LifecycleClient = {
    getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
    getCampaignDetail: vi.fn().mockResolvedValue(detail),
    createCampaignDraft: vi.fn(),
    updateCampaignDraft: vi.fn(),
    activateCampaign: lifecycleMethods.activateCampaign ?? vi.fn(),
    ...lifecycleMethods,
  };

  render(
    <MemoryRouter initialEntries={[DETAIL_PATH]}>
      <Routes>
        <Route
          path="/organisations/:organisationId/campaigns/:campaignId"
          element={<CampaignManagementDetailPage contextKind="organisation" client={client} />}
        />
      </Routes>
    </MemoryRouter>,
  );

  return client;
}

describe('CampaignManagementDetailPage activation', () => {
  it('explains why an empty saved Draft cannot be activated', async () => {
    const activateCampaign = vi.fn();

    renderPage(EMPTY_DRAFT, { activateCampaign });

    const activate = await screen.findByRole('button', { name: 'Activate Campaign' });

    expect(activate).toBeDisabled();
    expect(
      screen.getByText('Add at least one Campaign item before activation.'),
    ).toBeInTheDocument();
    expect(activateCampaign).not.toHaveBeenCalled();
  });

  it('requires local Draft changes to be saved before activation', async () => {
    const user = userEvent.setup();

    renderPage(VALID_DRAFT);

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });
    await user.clear(name);
    await user.type(name, 'Locally changed Draft');

    expect(screen.getByRole('button', { name: 'Activate Campaign' })).toBeDisabled();
    expect(screen.getByText('Save changes before activation.')).toBeInTheDocument();
  });

  it('blocks activation when a group contains unavailable content', async () => {
    const groupedDraft: CampaignDetailResponseDto = {
      ...VALID_DRAFT,
      allowedActions: ['VIEW', 'EDIT'],
      items: [
        {
          itemType: 'GROUP',
          campaignItemId: '90000000-0000-4000-8000-000000000010',
          title: 'Security module',
          description: null,
          groupType: 'MODULE',
          completionRule: 'COMPLETE_REQUIRED_ONLY',
          position: 10,
          isRequired: true,
          children: [
            {
              ...PERSISTED_ITEM,
              campaignItemId: '90000000-0000-4000-8000-000000000011',
              sourceAvailable: false,
            },
            {
              ...PERSISTED_ITEM,
              campaignItemId: '90000000-0000-4000-8000-000000000012',
              contentId: '50000000-0000-4000-8000-000000000003',
              title: 'Follow-up quiz',
              position: 20,
            },
          ],
        },
      ],
    };

    renderPage(groupedDraft);

    expect(await screen.findByRole('button', { name: 'Activate Campaign' })).toBeDisabled();
    expect(
      screen.getByText('Remove unavailable Campaign content before activation.'),
    ).toBeInTheDocument();
  });

  it('confirms activation before locking Draft mutations and adopting the response', async () => {
    const user = userEvent.setup();
    const activationRequest = createDeferred<CampaignLifecycleActionResponseDto>();
    const activateCampaign = vi.fn(() => activationRequest.promise);

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` });

    expect(
      within(dialog).getByText(
        'Activating this Campaign will make its details and items read-only.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Keep Editing' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Activate Campaign' })).toBeEnabled();
    expect(activateCampaign).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Activate Campaign' }));

    expect(activateCampaign).toHaveBeenCalledWith(
      {
        kind: 'organisation',
        organisationId: ORGANISATION_ID,
      },
      CAMPAIGN_ID,
      {
        expectedUpdatedAt: VALID_DRAFT.updatedAt,
      },
    );

    expect(within(dialog).getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Keep Editing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();

    await act(async () => {
      activationRequest.resolve({
        success: true,
        campaignId: CAMPAIGN_ID,
        status: 'ACTIVE',
        updatedAt: '2026-08-14T10:00:00.000Z',
        allowedActions: ['VIEW', 'ARCHIVE'],
      });
      await activationRequest.promise;
    });

    const readOnlyDetail = screen.getByRole('region', { name: VALID_DRAFT.name });
    expect(within(readOnlyDetail).getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the saved Draft editable when activation is cancelled', async () => {
    const user = userEvent.setup();
    const activateCampaign = vi.fn();

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` });

    expect(activateCampaign).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Keep Editing' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(activateCampaign).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(VALID_DRAFT.name);
  });

  it('closes confirmation and offers authoritative reload for a changed Draft', async () => {
    const user = userEvent.setup();
    const activateCampaign = vi
      .fn()
      .mockRejectedValue(new CampaignManagementClientError('CAMPAIGN_CHANGED'));

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` });

    await user.click(within(dialog).getByRole('button', { name: 'Activate Campaign' }));

    expect(
      await screen.findByText('This Draft has changed since you opened it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Draft' })).toBeEnabled();
  });

  it('offers authoritative reload after an Archive conflict', async () => {
    const user = userEvent.setup();
    const archiveCampaign = vi
      .fn()
      .mockRejectedValue(new CampaignManagementClientError('CAMPAIGN_CHANGED'));

    renderPage(ACTIVE_CAMPAIGN, { archiveCampaign });

    await user.click(await screen.findByRole('button', { name: 'Archive Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Archive ${ACTIVE_CAMPAIGN.name}?` });

    await user.click(within(dialog).getByRole('button', { name: 'Archive Campaign' }));

    expect(
      await screen.findByText('This Campaign has changed since you opened it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Campaign' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Archive Campaign' })).toBeEnabled();
  });
});
