import type {
  OrganisationEmailDraftInput,
  OrganisationEmailManagementDetailResponse,
} from '@insightful-phish/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/apiClient';
import { createDeferred, renderWithRouter } from '../../testing/render';
import OrganisationContentManagementPage from './OrganisationContentManagementPage';

const organisationId = '11111111-1111-4111-8111-111111111111';
const emailId = '22222222-2222-4222-8222-222222222222';

const draft: OrganisationEmailDraftInput = {
  senderLabel: 'Security Team',
  senderAddress: 'security@example.test',
  subject: 'Review access',
  preview: 'A review is pending',
  bodyHtml: '<p>Hello {{FIRST_NAME}}</p>',
  link: null,
  expectedClassification: 'SAFE',
  redFlags: [],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
  difficultyLevel: 'EASY',
};

function detail(status: 'DRAFT' | 'ACTIVE' = 'DRAFT'): OrganisationEmailManagementDetailResponse {
  return {
    id: emailId,
    organisationId,
    createdByUserId: null,
    ...draft,
    status,
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  };
}

function listResponse(status: 'DRAFT' | 'ACTIVE' = 'DRAFT') {
  const email = detail(status);
  return {
    items: [
      {
        id: email.id,
        senderLabel: email.senderLabel,
        senderAddress: email.senderAddress,
        subject: email.subject,
        preview: email.preview,
        expectedClassification: email.expectedClassification,
        categories: email.categories,
        difficultyLevel: email.difficultyLevel,
        status: email.status,
        updatedAt: email.updatedAt,
      },
    ],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };
}

function createClient() {
  return {
    list: vi.fn(),
    get: vi.fn(),
    register: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    copy: vi.fn(),
  };
}

function renderPage(
  client: ReturnType<typeof createClient>,
  permissions = ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
) {
  const clearAuth = vi.fn();
  renderWithRouter(<OrganisationContentManagementPage section="email-library" client={client} />, {
    initialEntry: `/organisations/${organisationId}/content/email-library`,
    routePath: '/organisations/:organisationId/content/email-library',
    dataRouter: true,
    auth: {
      permissions,
      clearAuth,
      authContext: {
        user: { id: 'admin-id', userType: 'ORGANISATION_ADMIN', authStatus: 'ACTIVE' },
        role: 'ORGANISATION_ADMIN',
        organisation: { id: organisationId, name: 'Example', status: 'ACTIVE' },
        platformAdminRole: null,
        permissions,
        redirectTo: '/organisation-information',
      },
    },
  });
  return clearAuth;
}

describe('OrganisationContentManagementPage Email Library', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading, empty, error and retry states', async () => {
    const client = createClient();
    const firstRequest = createDeferred<ReturnType<typeof listResponse>>();
    client.list.mockReturnValueOnce(firstRequest.promise);
    renderPage(client);

    expect(await screen.findByText('Loading email library…')).toBeInTheDocument();
    firstRequest.resolve({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    expect(await screen.findByText('No library emails have been created yet.')).toBeInTheDocument();

    client.list.mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByLabelText('Lifecycle'));
    await userEvent.selectOptions(screen.getByLabelText('Lifecycle'), 'DRAFT');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email library could not be loaded');

    client.list.mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(client.list).toHaveBeenCalledTimes(3));
  });

  it('preserves unsaved values and displays field errors when registration fails', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    client.register.mockRejectedValue(
      new ApiError('Email authoring input is invalid', {
        status: 422,
        statusText: 'Unprocessable Entity',
        method: 'POST',
        url: '/email-library',
        body: {
          error: 'INVALID_EMAIL_AUTHORING_INPUT',
          message: 'Email authoring input is invalid',
          details: [
            {
              emailId: null,
              position: null,
              field: 'senderAddress',
              code: 'INVALID_EMAIL_ADDRESS',
              message: 'Sender address must be valid.',
            },
          ],
        },
      }),
    );
    renderPage(client);
    await screen.findByText('No library emails have been created yet.');

    await user.click(screen.getByRole('button', { name: 'Create Email Draft' }));
    await user.type(screen.getByLabelText('Sender label'), 'Unsaved sender');
    await user.type(screen.getByLabelText('Sender address'), 'invalid');
    await user.click(screen.getByRole('button', { name: 'Create Draft' }));

    expect(await screen.findByText('Sender address must be valid.')).toBeInTheDocument();
    expect(screen.getByLabelText('Sender label')).toHaveValue('Unsaved sender');
    expect(screen.getByLabelText('Sender address')).toHaveValue('invalid');
  });

  it('requires confirmation before discarding unsaved Email Draft changes', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderPage(client);
    await screen.findByText('No library emails have been created yet.');

    await user.click(screen.getByRole('button', { name: 'Create Email Draft' }));
    await user.type(screen.getByLabelText('Subject'), 'Unsaved subject');

    await user.click(screen.getByRole('link', { name: 'Simulated Inboxes' }));
    let dialog = screen.getByRole('dialog', { name: 'Discard unsaved email changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Subject')).toHaveValue('Unsaved subject');

    await user.click(screen.getByRole('button', { name: '← Back to Email Library' }));

    dialog = screen.getByRole('dialog', { name: 'Discard unsaved email changes?' });
    expect(screen.getByLabelText('Subject')).toHaveValue('Unsaved subject');
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }));

    expect(screen.queryByLabelText('Subject')).not.toBeInTheDocument();
    expect(screen.getByText('No library emails have been created yet.')).toBeInTheDocument();
  });

  it('makes Active records read-only and copies them into an editable Draft', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue(listResponse('ACTIVE'));
    client.get.mockResolvedValue(detail('ACTIVE'));
    client.copy.mockResolvedValue({
      ...detail('DRAFT'),
      id: '33333333-3333-4333-8333-333333333333',
    });
    renderPage(client);

    await user.click(await screen.findByRole('button', { name: /Review access/ }));
    expect(await screen.findByRole('heading', { name: 'Active Email' })).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy to Draft' }));
    expect(await screen.findByText('Active email copied into a new Draft.')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeEnabled();
    expect(client.copy).toHaveBeenCalledWith(organisationId, emailId);
  });

  it('activates a Draft through the accessible confirmation modal', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue(listResponse());
    client.get.mockResolvedValue(detail());
    client.activate.mockResolvedValue(detail('ACTIVE'));
    renderPage(client);

    await user.click(await screen.findByRole('button', { name: /Review access/ }));
    await user.click(await screen.findByRole('button', { name: 'Activate' }));
    const dialog = screen.getByRole('dialog', { name: 'Activate email?' });
    await user.click(within(dialog).getByRole('button', { name: 'Activate' }));

    expect(await screen.findByText('Email activated and ready for selection.')).toBeInTheDocument();
    expect(client.activate).toHaveBeenCalledWith(organisationId, emailId);
    expect(screen.getByLabelText('Subject')).toBeDisabled();
  });

  it('shows the reused identity clearly after exact-equivalence registration', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    client.register.mockResolvedValue({ email: detail(), reused: true });
    renderPage(client);
    await screen.findByText('No library emails have been created yet.');

    await user.click(screen.getByRole('button', { name: 'Create Email Draft' }));
    await user.click(screen.getByRole('button', { name: 'Create Draft' }));

    expect(
      await screen.findByText(
        'An exact equivalent already existed. The existing library email is now open.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Email Draft' })).toBeInTheDocument();
  });

  it('hides mutation controls without MANAGE_CAMPAIGNS while retaining read access', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.list.mockResolvedValue(listResponse());
    client.get.mockResolvedValue(detail());
    renderPage(client, ['VIEW_CAMPAIGNS']);

    expect(screen.queryByRole('button', { name: 'Create Email Draft' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Review access/ }));
    expect(await screen.findByLabelText('Subject')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
  });

  it('clears authentication when the library reports an expired session', async () => {
    const client = createClient();
    client.list.mockRejectedValue(
      new ApiError('Authentication required', {
        status: 401,
        statusText: 'Unauthorized',
        method: 'GET',
        url: '/email-library',
      }),
    );

    const clearAuth = renderPage(client);

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required');
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });
});
