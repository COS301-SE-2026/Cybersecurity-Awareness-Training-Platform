import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../../testing/render';
import OrganisationContentManagementPage from './OrganisationContentManagementPage';

const organisationId = '11111111-1111-4111-8111-111111111111';

function createClient() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    addAuthoredEmail: vi.fn(),
    addLibraryEmail: vi.fn(),
    listLibraryEmails: vi.fn(),
    updateEmail: vi.fn(),
    removeEmail: vi.fn(),
    reorderEmails: vi.fn(),
    activate: vi.fn(),
    copy: vi.fn(),
  };
}

function renderList(
  client: ReturnType<typeof createClient>,
  permissions = ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
) {
  renderWithRouter(
    <OrganisationContentManagementPage section="simulated-inboxes" simulatedInboxClient={client} />,
    {
      initialEntry: `/organisations/${organisationId}/content/simulated-inboxes`,
      routePath: '/organisations/:organisationId/content/simulated-inboxes',
      auth: {
        permissions,
        authContext: {
          user: { id: 'admin-id', userType: 'ORGANISATION_ADMIN', authStatus: 'ACTIVE' },
          role: 'ORGANISATION_ADMIN',
          organisation: { id: organisationId, name: 'Example', status: 'ACTIVE' },
          platformAdminRole: null,
          permissions,
          redirectTo: '/organisation-information',
        },
      },
    },
  );
}

describe('SimulatedInboxList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists and filters Draft and Active inboxes', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue({
      items: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Payment requests',
          description: 'A mixed-difficulty inbox',
          objective: null,
          difficultyLevel: 'HARD',
          safetyStatus: 'APPROVED',
          lifecycleStatus: 'ACTIVE',
          emailCount: 3,
          createdAt: '2026-09-15T08:00:00.000Z',
          updatedAt: '2026-09-15T09:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderList(client);

    expect(await screen.findByRole('heading', { name: 'Payment requests' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search inboxes'), 'payment');
    await user.selectOptions(screen.getByLabelText('Lifecycle'), 'ACTIVE');
    await waitFor(() =>
      expect(client.list).toHaveBeenLastCalledWith(
        organisationId,
        expect.objectContaining({ search: 'payment', lifecycleStatus: 'ACTIVE' }),
      ),
    );
  });

  it('shows loading, empty and error recovery states and hides mutation controls without permission', async () => {
    const client = createClient();
    client.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderList(client, ['VIEW_CAMPAIGNS']);

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByRole('button', { name: 'Create Inbox' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByText('No simulated inboxes have been created yet.'),
    ).toBeInTheDocument();
  });
});
